/**
 * WhatsApp Web Service
 * Handles WhatsApp Web connections via QR code scanning
 * Uses whatsapp-web.js library
 * 
 * Note: This requires installing:
 * npm install whatsapp-web.js qrcode-terminal
 */

import { EventEmitter } from 'events';
import { Channel } from '../models/Channel.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

// Store active WhatsApp clients
const clients = new Map();
const qrCodes = new Map();
const clientStatus = new Map();

// Event emitter for real-time updates
export const whatsappEvents = new EventEmitter();

/**
 * Initialize WhatsApp client for a channel
 * @param {number} channelId - Channel database ID
 * @returns {Promise<Object>} - Client info with QR code
 */
export async function initializeClient(channelId) {
    try {
        // Dynamic import (whatsapp-web.js might not be installed yet)
        const { Client, LocalAuth } = await import('whatsapp-web.js');

        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        // Check if client already exists
        if (clients.has(channelId)) {
            const existingClient = clients.get(channelId);
            if (clientStatus.get(channelId) === 'ready') {
                return { status: 'already_connected', channelId };
            }
            // Destroy existing client if not ready
            await existingClient.destroy();
            clients.delete(channelId);
        }

        // Create new client with local authentication
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: `channel_${channelId}`,
                dataPath: './whatsapp-sessions'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        // Store client
        clients.set(channelId, client);
        clientStatus.set(channelId, 'initializing');

        // QR Code event
        client.on('qr', async (qr) => {
            console.log(`QR Code received for channel ${channelId}`);
            qrCodes.set(channelId, qr);
            clientStatus.set(channelId, 'waiting_for_scan');

            // Update channel status
            await Channel.updateStatus(channel.id, 'pending');

            // Emit event for real-time updates
            whatsappEvents.emit('qr', { channelId, qr });
        });

        // Ready event
        client.on('ready', async () => {
            console.log(`WhatsApp client ready for channel ${channelId}`);
            clientStatus.set(channelId, 'ready');
            qrCodes.delete(channelId);

            // Get device info
            const info = client.info;

            // Update channel
            await Channel.updateStatus(channel.id, 'active');
            await Channel.update(channel.id, {
                identifier: info?.wid?.user || 'unknown',
                phoneNumber: info?.wid?.user || 'unknown'
            });

            whatsappEvents.emit('ready', { channelId, info });
        });

        // Authentication failure
        client.on('auth_failure', async (message) => {
            console.error(`Auth failure for channel ${channelId}:`, message);
            clientStatus.set(channelId, 'auth_failed');
            await Channel.updateStatus(channel.id, 'error');
            whatsappEvents.emit('auth_failure', { channelId, message });
        });

        // Disconnected
        client.on('disconnected', async (reason) => {
            console.log(`WhatsApp disconnected for channel ${channelId}:`, reason);
            clientStatus.set(channelId, 'disconnected');
            clients.delete(channelId);
            await Channel.updateStatus(channel.id, 'disconnected');
            whatsappEvents.emit('disconnected', { channelId, reason });
        });

        // Incoming message
        client.on('message', async (msg) => {
            try {
                await handleIncomingMessage(channelId, msg);
            } catch (error) {
                console.error('Error handling incoming message:', error);
            }
        });

        // Message acknowledgment (sent, delivered, read)
        client.on('message_ack', async (msg, ack) => {
            const ackStatus = {
                0: 'pending',
                1: 'sent',
                2: 'delivered',
                3: 'read',
                4: 'played' // for audio
            };

            try {
                await Message.updateStatusByExternalId(msg.id._serialized, ackStatus[ack] || 'sent');
            } catch (error) {
                console.error('Error updating message ack:', error);
            }
        });

        // Initialize client
        await client.initialize();

        return {
            status: 'initializing',
            channelId,
            message: 'Client initializing. QR code will be available shortly.'
        };

    } catch (error) {
        console.error('Error initializing WhatsApp client:', error);
        throw error;
    }
}

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(channelId, msg) {
    // Skip status messages
    if (msg.isStatus) return;

    const contact = await msg.getContact();
    const chat = await msg.getChat();

    // Find or create conversation
    let conversation = await Conversation.findByContact(channelId, msg.from);

    if (!conversation) {
        // Create new conversation
        conversation = await Conversation.create({
            channelId,
            contactIdentifier: msg.from,
            contactName: contact.name || contact.pushname || msg.from,
            contactPhone: msg.from.replace('@c.us', ''),
            contactAvatar: await contact.getProfilePicUrl() || null
        });

        whatsappEvents.emit('new_conversation', { channelId, conversation });
    }

    // Determine message type
    let contentType = 'text';
    let mediaUrl = null;
    let content = msg.body;

    if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        if (media) {
            contentType = msg.type; // image, video, audio, document
            // In production, save media to storage and get URL
            mediaUrl = `data:${media.mimetype};base64,${media.data}`;
            content = media.filename || `[${msg.type}]`;
        }
    }

    // Save message
    const message = await Message.create({
        conversationId: conversation.id,
        direction: 'incoming',
        content,
        contentType,
        mediaUrl,
        externalId: msg.id._serialized,
        metadata: {
            timestamp: msg.timestamp,
            from: msg.from,
            type: msg.type
        }
    });

    // Update conversation
    await Conversation.newMessage(conversation.id, content.substring(0, 100));

    // Emit event for real-time updates
    whatsappEvents.emit('message', {
        channelId,
        conversationId: conversation.uuid,
        message
    });
}

/**
 * Send message via WhatsApp
 */
export async function sendMessage(channelId, to, content, options = {}) {
    const client = clients.get(channelId);

    if (!client || clientStatus.get(channelId) !== 'ready') {
        throw new Error('WhatsApp client not ready');
    }

    try {
        // Format phone number
        const chatId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`;

        let msg;

        if (options.mediaUrl) {
            // Send media message
            const { MessageMedia } = await import('whatsapp-web.js');
            const media = await MessageMedia.fromUrl(options.mediaUrl);
            msg = await client.sendMessage(chatId, media, { caption: content });
        } else {
            // Send text message
            msg = await client.sendMessage(chatId, content);
        }

        return {
            success: true,
            messageId: msg.id._serialized,
            timestamp: msg.timestamp
        };

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

/**
 * Get current QR code for a channel
 */
export function getQRCode(channelId) {
    return {
        qr: qrCodes.get(channelId) || null,
        status: clientStatus.get(channelId) || 'not_initialized'
    };
}

/**
 * Get client status
 */
export function getClientStatus(channelId) {
    return {
        status: clientStatus.get(channelId) || 'not_initialized',
        isReady: clientStatus.get(channelId) === 'ready'
    };
}

/**
 * Disconnect a WhatsApp client
 */
export async function disconnectClient(channelId) {
    const client = clients.get(channelId);

    if (client) {
        await client.destroy();
        clients.delete(channelId);
        clientStatus.delete(channelId);
        qrCodes.delete(channelId);

        await Channel.updateStatus(channelId, 'disconnected');

        return { success: true };
    }

    return { success: false, message: 'Client not found' };
}

/**
 * Get all active clients
 */
export function getActiveClients() {
    const active = [];
    for (const [channelId, status] of clientStatus.entries()) {
        active.push({ channelId, status });
    }
    return active;
}

/**
 * Sync old messages from a chat
 */
export async function syncMessages(channelId, conversationId, limit = 50) {
    const client = clients.get(channelId);

    if (!client || clientStatus.get(channelId) !== 'ready') {
        throw new Error('WhatsApp client not ready');
    }

    const conversation = await Conversation.findByUuid(conversationId);
    if (!conversation) {
        throw new Error('Conversation not found');
    }

    try {
        const chat = await client.getChatById(conversation.contact_identifier);
        const messages = await chat.fetchMessages({ limit });

        let synced = 0;

        for (const msg of messages) {
            // Check if message already exists
            const existing = await Message.findByExternalId(msg.id._serialized);
            if (existing) continue;

            let contentType = 'text';
            let content = msg.body;

            if (msg.hasMedia) {
                contentType = msg.type;
                content = `[${msg.type}]`;
            }

            await Message.create({
                conversationId: conversation.id,
                direction: msg.fromMe ? 'outgoing' : 'incoming',
                content,
                contentType,
                externalId: msg.id._serialized,
                metadata: { timestamp: msg.timestamp }
            });

            synced++;
        }

        return { success: true, synced };

    } catch (error) {
        console.error('Error syncing messages:', error);
        throw error;
    }
}

export default {
    initializeClient,
    sendMessage,
    getQRCode,
    getClientStatus,
    disconnectClient,
    getActiveClients,
    syncMessages,
    whatsappEvents
};
