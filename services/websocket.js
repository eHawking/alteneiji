/**
 * WebSocket Service
 * Handles real-time communication for inbox updates
 */

import { WebSocketServer } from 'ws';
import { whatsappEvents } from './whatsapp.js';

// Store connected clients
const clients = new Map();

// Initialize WebSocket server
let wss = null;

/**
 * Initialize WebSocket on existing HTTP server
 * @param {http.Server} server - HTTP server instance
 */
export function initWebSocket(server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    console.log('✅ WebSocket server initialized on /ws');

    wss.on('connection', (ws, req) => {
        const clientId = generateClientId();

        console.log(`WebSocket client connected: ${clientId}`);

        // Store client info
        clients.set(clientId, {
            ws,
            userId: null,
            agentId: null,
            subscribedChannels: [],
            connectedAt: new Date()
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            message: 'Connected to Alteneiji Inbox WebSocket'
        }));

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleClientMessage(clientId, message);
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        });

        // Handle disconnect
        ws.on('close', () => {
            console.log(`WebSocket client disconnected: ${clientId}`);
            clients.delete(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${clientId}:`, error);
            clients.delete(clientId);
        });

        // Ping/pong to keep connection alive
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
    });

    // Heartbeat to detect dead connections
    const heartbeat = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeat);
    });

    // Subscribe to WhatsApp events
    setupWhatsAppEventForwarding();

    return wss;
}

/**
 * Handle messages from WebSocket clients
 */
function handleClientMessage(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    switch (message.type) {
        case 'authenticate':
            // Authenticate user/agent
            client.userId = message.userId;
            client.agentId = message.agentId;
            console.log(`Client ${clientId} authenticated as agent: ${message.agentId}`);
            break;

        case 'subscribe':
            // Subscribe to specific channels/conversations
            if (message.channels) {
                client.subscribedChannels = message.channels;
            }
            break;

        case 'typing':
            // Broadcast typing indicator
            broadcastToConversation(message.conversationId, {
                type: 'typing',
                conversationId: message.conversationId,
                agentId: client.agentId,
                isTyping: message.isTyping
            }, clientId);
            break;

        case 'read':
            // Mark conversation as read notification
            broadcastToConversation(message.conversationId, {
                type: 'read',
                conversationId: message.conversationId,
                agentId: client.agentId
            }, clientId);
            break;

        case 'ping':
            client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

        default:
            console.log(`Unknown message type: ${message.type}`);
    }
}

/**
 * Forward WhatsApp events to WebSocket clients
 */
function setupWhatsAppEventForwarding() {
    // New QR code
    whatsappEvents.on('qr', (data) => {
        broadcast({
            type: 'whatsapp_qr',
            channelId: data.channelId,
            qrCode: data.qr
        });
    });

    // WhatsApp connected
    whatsappEvents.on('ready', (data) => {
        broadcast({
            type: 'whatsapp_ready',
            channelId: data.channelId,
            info: data.info
        });
    });

    // New message received
    whatsappEvents.on('message', (data) => {
        broadcast({
            type: 'new_message',
            channelId: data.channelId,
            conversationId: data.conversationId,
            message: data.message
        });
    });

    // New conversation created
    whatsappEvents.on('new_conversation', (data) => {
        broadcast({
            type: 'new_conversation',
            channelId: data.channelId,
            conversation: data.conversation
        });
    });

    // WhatsApp disconnected
    whatsappEvents.on('disconnected', (data) => {
        broadcast({
            type: 'whatsapp_disconnected',
            channelId: data.channelId,
            reason: data.reason
        });
    });

    // Auth failure
    whatsappEvents.on('auth_failure', (data) => {
        broadcast({
            type: 'whatsapp_auth_failure',
            channelId: data.channelId,
            message: data.message
        });
    });
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message) {
    const msgString = JSON.stringify(message);

    clients.forEach((client) => {
        if (client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(msgString);
        }
    });
}

/**
 * Broadcast to clients subscribed to a specific conversation
 */
export function broadcastToConversation(conversationId, message, excludeClientId = null) {
    const msgString = JSON.stringify(message);

    clients.forEach((client, clientId) => {
        if (clientId === excludeClientId) return;
        if (client.ws.readyState === 1) {
            client.ws.send(msgString);
        }
    });
}

/**
 * Send message to a specific client
 */
export function sendToClient(clientId, message) {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
    }
}

/**
 * Get connected clients count
 */
export function getClientsCount() {
    return clients.size;
}

/**
 * Generate unique client ID
 */
function generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Notify inbox update (call from message routes)
 */
export function notifyInboxUpdate(type, data) {
    broadcast({
        type: `inbox_${type}`,
        ...data,
        timestamp: Date.now()
    });
}

export default {
    initWebSocket,
    broadcast,
    broadcastToConversation,
    sendToClient,
    getClientsCount,
    notifyInboxUpdate
};
