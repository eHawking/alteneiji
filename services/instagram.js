/**
 * Instagram DM Service
 * Handles Instagram Business OAuth and Messaging API
 * 
 * Note: Instagram DMs require Facebook Business account and Instagram Graph API
 * Setup: https://developers.facebook.com/docs/instagram-api
 */

import { Channel } from '../models/Channel.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { EventEmitter } from 'events';

// Event emitter for real-time updates
export const instagramEvents = new EventEmitter();

// Instagram/Facebook API configuration
const FB_API_VERSION = 'v18.0';
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Generate Instagram OAuth URL
 * Uses Facebook OAuth with Instagram permissions
 * @param {string} redirectUri - OAuth callback URL
 * @param {string} state - CSRF state token
 * @returns {string} OAuth URL
 */
export function getOAuthUrl(redirectUri, state) {
    const appId = process.env.FACEBOOK_APP_ID;

    if (!appId) {
        throw new Error('FACEBOOK_APP_ID not configured');
    }

    const scopes = [
        'instagram_basic',
        'instagram_manage_messages',
        'pages_manage_metadata',
        'pages_show_list'
    ].join(',');

    return `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?` +
        `client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${scopes}` +
        `&state=${state}` +
        `&response_type=code`;
}

/**
 * Get Instagram Business accounts linked to Facebook pages
 * @param {string} accessToken - User access token
 * @returns {Promise<Array>} Instagram accounts
 */
export async function getInstagramAccounts(accessToken) {
    // First get user's Facebook pages
    const pagesUrl = `${FB_GRAPH_URL}/me/accounts?access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
        throw new Error(pagesData.error.message);
    }

    const instagramAccounts = [];

    // For each page, check if there's a linked Instagram account
    for (const page of (pagesData.data || [])) {
        const igUrl = `${FB_GRAPH_URL}/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${page.access_token}`;

        try {
            const igResponse = await fetch(igUrl);
            const igData = await igResponse.json();

            if (igData.instagram_business_account) {
                instagramAccounts.push({
                    ...igData.instagram_business_account,
                    pageId: page.id,
                    pageName: page.name,
                    pageAccessToken: page.access_token
                });
            }
        } catch (error) {
            console.error(`Error getting Instagram for page ${page.id}:`, error);
        }
    }

    return instagramAccounts;
}

/**
 * Connect Instagram Business account as a channel
 * @param {Object} accountData - Instagram account data
 * @returns {Promise<Object>} Created channel
 */
export async function connectAccount(accountData) {
    const { id, username, pageAccessToken, profile_picture_url } = accountData;

    // Create channel
    const channel = await Channel.create({
        platform: 'instagram',
        name: `@${username}`,
        identifier: id,
        accessToken: pageAccessToken,
        status: 'active',
        sessionData: { username, profile_picture_url }
    });

    return channel;
}

/**
 * Send message via Instagram DM
 * @param {string} channelId - Channel database ID
 * @param {string} recipientId - Instagram user ID (IGSID)
 * @param {Object} message - Message content
 * @returns {Promise<Object>} Send result
 */
export async function sendMessage(channelId, recipientId, message) {
    const channel = await Channel.findById(channelId);

    if (!channel || channel.platform !== 'instagram') {
        throw new Error('Instagram channel not found');
    }

    const url = `${FB_GRAPH_URL}/${channel.identifier}/messages?access_token=${channel.access_token}`;

    const payload = {
        recipient: { id: recipientId },
        message: typeof message === 'string'
            ? { text: message }
            : message
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return {
        success: true,
        messageId: data.message_id,
        recipientId: data.recipient_id
    };
}

/**
 * Process incoming Instagram webhook event
 * @param {Object} event - Webhook event
 */
export async function processWebhookEvent(event) {
    const { sender, recipient, message, timestamp } = event;

    if (!message || !sender) return;

    // Find channel by Instagram ID
    const channels = await Channel.findAll({ platform: 'instagram' });
    const channel = channels.find(c => c.identifier === recipient.id);

    if (!channel) {
        console.warn('No channel found for Instagram:', recipient.id);
        return;
    }

    // Find or create conversation
    let conversation = await Conversation.findByContact(channel.id, sender.id);

    if (!conversation) {
        // Get sender info
        const senderInfo = await getSenderInfo(sender.id, channel.access_token);

        conversation = await Conversation.create({
            channelId: channel.id,
            contactIdentifier: sender.id,
            contactName: senderInfo.username || 'Instagram User',
            contactAvatar: senderInfo.profile_picture_url || null
        });

        instagramEvents.emit('new_conversation', { channelId: channel.id, conversation });
    }

    // Determine message content
    let content = message.text || '';
    let contentType = 'text';
    let mediaUrl = null;

    if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];
        contentType = attachment.type;
        mediaUrl = attachment.payload?.url;
        content = content || `[${attachment.type}]`;
    }

    // Handle story mentions/replies
    if (message.reply_to?.story) {
        contentType = 'story_reply';
        content = `[Story Reply] ${content}`;
    }

    // Save message
    const savedMessage = await Message.create({
        conversationId: conversation.id,
        direction: 'incoming',
        content,
        contentType,
        mediaUrl,
        externalId: message.mid,
        metadata: { timestamp, sender: sender.id }
    });

    // Update conversation
    await Conversation.newMessage(conversation.id, content.substring(0, 100));

    // Emit event for WebSocket
    instagramEvents.emit('message', {
        channelId: channel.id,
        conversationId: conversation.uuid,
        message: savedMessage
    });
}

/**
 * Get Instagram user info
 * @param {string} igsid - Instagram-scoped user ID
 * @param {string} accessToken - Page access token
 * @returns {Promise<Object>} User info
 */
async function getSenderInfo(igsid, accessToken) {
    const url = `${FB_GRAPH_URL}/${igsid}?fields=username,name,profile_picture_url&access_token=${accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting Instagram user info:', error);
        return { username: 'Instagram User' };
    }
}

/**
 * Get conversation history
 * @param {string} channelId - Channel ID
 * @param {string} userId - Instagram user ID
 * @returns {Promise<Array>} Messages
 */
export async function getConversationHistory(channelId, userId) {
    const channel = await Channel.findById(channelId);

    if (!channel) {
        throw new Error('Channel not found');
    }

    // Get conversations
    const url = `${FB_GRAPH_URL}/${channel.identifier}/conversations?user_id=${userId}&access_token=${channel.access_token}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.data || [];
}

export default {
    getOAuthUrl,
    getInstagramAccounts,
    connectAccount,
    sendMessage,
    processWebhookEvent,
    getConversationHistory,
    instagramEvents
};
