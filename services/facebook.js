/**
 * Facebook Messenger Service
 * Handles Facebook OAuth, Messenger API, and webhook processing
 * 
 * Required: Facebook App with Messenger permissions
 * Setup: Create app at https://developers.facebook.com
 */

import { Channel } from '../models/Channel.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { EventEmitter } from 'events';

// Event emitter for real-time updates
export const facebookEvents = new EventEmitter();

// Facebook API configuration
const FB_API_VERSION = 'v18.0';
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Generate Facebook OAuth URL for page connection
 * @param {string} redirectUri - OAuth callback URL
 * @param {string} state - CSRF state token
 * @returns {string} Facebook OAuth URL
 */
export function getOAuthUrl(redirectUri, state) {
    const appId = process.env.FACEBOOK_APP_ID;

    if (!appId) {
        throw new Error('FACEBOOK_APP_ID not configured');
    }

    const scopes = [
        'pages_messaging',
        'pages_manage_metadata',
        'pages_read_engagement',
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
 * Exchange authorization code for access token
 * @param {string} code - OAuth authorization code
 * @param {string} redirectUri - Same redirect URI used in OAuth
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForToken(code, redirectUri) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error('Facebook app credentials not configured');
    }

    const tokenUrl = `${FB_GRAPH_URL}/oauth/access_token?` +
        `client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`;

    const response = await fetch(tokenUrl);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data; // { access_token, token_type, expires_in }
}

/**
 * Get long-lived access token from short-lived token
 * @param {string} shortToken - Short-lived token
 * @returns {Promise<Object>} Long-lived token
 */
export async function getLongLivedToken(shortToken) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    const url = `${FB_GRAPH_URL}/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${shortToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data;
}

/**
 * Get user's Facebook pages
 * @param {string} accessToken - User access token
 * @returns {Promise<Array>} List of pages
 */
export async function getUserPages(accessToken) {
    const url = `${FB_GRAPH_URL}/me/accounts?access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.data || [];
}

/**
 * Subscribe page to webhook
 * @param {string} pageId - Facebook page ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<boolean>} Success status
 */
export async function subscribePageToWebhook(pageId, pageAccessToken) {
    const url = `${FB_GRAPH_URL}/${pageId}/subscribed_apps`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: pageAccessToken,
            subscribed_fields: ['messages', 'messaging_postbacks', 'message_reads']
        })
    });

    const data = await response.json();
    return data.success === true;
}

/**
 * Connect a Facebook page as a channel
 * @param {Object} pageData - Page data from OAuth
 * @returns {Promise<Object>} Created channel
 */
export async function connectPage(pageData) {
    const { pageId, pageName, pageAccessToken } = pageData;

    // Get long-lived token
    const longToken = await getLongLivedToken(pageAccessToken);

    // Create channel
    const channel = await Channel.create({
        platform: 'facebook',
        name: pageName,
        identifier: pageId,
        accessToken: longToken.access_token,
        status: 'active'
    });

    // Subscribe to webhooks
    await subscribePageToWebhook(pageId, longToken.access_token);

    return channel;
}

/**
 * Send message via Messenger
 * @param {string} channelId - Channel database ID
 * @param {string} recipientId - Facebook user PSID
 * @param {Object} message - Message content
 * @returns {Promise<Object>} Send result
 */
export async function sendMessage(channelId, recipientId, message) {
    const channel = await Channel.findById(channelId);

    if (!channel || channel.platform !== 'facebook') {
        throw new Error('Facebook channel not found');
    }

    const url = `${FB_GRAPH_URL}/me/messages?access_token=${channel.access_token}`;

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
 * Process incoming webhook event
 * @param {Object} event - Webhook event from Facebook
 */
export async function processWebhookEvent(event) {
    const { sender, recipient, message, timestamp } = event;

    if (!message || !sender) return;

    // Find channel by page ID
    const channels = await Channel.findAll({ platform: 'facebook' });
    const channel = channels.find(c => c.identifier === recipient.id);

    if (!channel) {
        console.warn('No channel found for page:', recipient.id);
        return;
    }

    // Find or create conversation
    let conversation = await Conversation.findByContact(channel.id, sender.id);

    if (!conversation) {
        // Get sender info from Facebook
        const senderInfo = await getSenderInfo(sender.id, channel.access_token);

        conversation = await Conversation.create({
            channelId: channel.id,
            contactIdentifier: sender.id,
            contactName: senderInfo.name || 'Facebook User',
            contactAvatar: senderInfo.profile_pic || null
        });

        facebookEvents.emit('new_conversation', { channelId: channel.id, conversation });
    }

    // Determine message content
    let content = message.text || '';
    let contentType = 'text';
    let mediaUrl = null;

    if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];
        contentType = attachment.type; // image, video, audio, file
        mediaUrl = attachment.payload?.url;
        content = content || `[${attachment.type}]`;
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
    facebookEvents.emit('message', {
        channelId: channel.id,
        conversationId: conversation.uuid,
        message: savedMessage
    });
}

/**
 * Get sender info from Facebook
 * @param {string} psid - Page-scoped user ID
 * @param {string} accessToken - Page access token
 * @returns {Promise<Object>} User info
 */
async function getSenderInfo(psid, accessToken) {
    const url = `${FB_GRAPH_URL}/${psid}?fields=name,profile_pic&access_token=${accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting sender info:', error);
        return { name: 'Facebook User' };
    }
}

/**
 * Verify webhook callback
 * @param {string} mode - Verify mode
 * @param {string} token - Verify token
 * @param {string} challenge - Challenge string
 * @returns {string|null} Challenge if valid, null otherwise
 */
export function verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        return challenge;
    }

    return null;
}

export default {
    getOAuthUrl,
    exchangeCodeForToken,
    getLongLivedToken,
    getUserPages,
    connectPage,
    sendMessage,
    processWebhookEvent,
    verifyWebhook,
    facebookEvents
};
