import express from 'express';
import { Channel } from '../models/Channel.js';
import * as whatsappService from '../services/whatsapp.js';

const router = express.Router();

/**
 * GET /api/channels
 * Get all connected channels
 */
router.get('/', async (req, res) => {
    try {
        const { platform, status } = req.query;
        const channels = await Channel.findAll({ platform, status });

        // Group by platform
        const grouped = {
            whatsapp: channels.filter(c => c.platform === 'whatsapp'),
            facebook: channels.filter(c => c.platform === 'facebook'),
            instagram: channels.filter(c => c.platform === 'instagram')
        };

        res.json({
            success: true,
            data: grouped,
            stats: await Channel.getStats()
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch channels' });
    }
});

/**
 * GET /api/channels/:id
 * Get single channel details
 */
router.get('/:id', async (req, res) => {
    try {
        const channel = await Channel.findByUuid(req.params.id);

        if (!channel) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Add WhatsApp status if applicable
        let whatsappStatus = null;
        if (channel.platform === 'whatsapp') {
            whatsappStatus = whatsappService.getClientStatus(channel.id);
        }

        res.json({
            success: true,
            data: { ...channel, whatsappStatus }
        });
    } catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch channel' });
    }
});

/**
 * POST /api/channels/whatsapp/init
 * Initialize WhatsApp connection (starts QR code generation)
 */
router.post('/whatsapp/init', async (req, res) => {
    try {
        const { name } = req.body;

        // Create pending channel
        const channel = await Channel.create({
            platform: 'whatsapp',
            name: name || 'WhatsApp Business',
            identifier: 'pending-' + Date.now(),
            status: 'pending'
        });

        // Initialize WhatsApp client
        try {
            const result = await whatsappService.initializeClient(channel.id);

            res.json({
                success: true,
                data: {
                    channelId: channel.uuid,
                    channelDbId: channel.id,
                    ...result
                },
                message: 'WhatsApp connection initialized. QR code will be available shortly.'
            });
        } catch (waError) {
            // If WhatsApp service fails (not installed), return placeholder
            console.warn('WhatsApp service not available:', waError.message);
            res.json({
                success: true,
                data: {
                    channelId: channel.uuid,
                    qrCode: null,
                    status: 'service_unavailable',
                    note: 'WhatsApp service requires whatsapp-web.js. Install with: npm install whatsapp-web.js'
                },
                message: 'Channel created. WhatsApp service not configured yet.'
            });
        }
    } catch (error) {
        console.error('Error initializing WhatsApp:', error);
        res.status(500).json({ success: false, message: 'Failed to initialize WhatsApp' });
    }
});

/**
 * GET /api/channels/whatsapp/:id/qr
 * Get current QR code for WhatsApp connection
 */
router.get('/whatsapp/:id/qr', async (req, res) => {
    try {
        const channel = await Channel.findByUuid(req.params.id);

        if (!channel || channel.platform !== 'whatsapp') {
            return res.status(404).json({ success: false, message: 'WhatsApp channel not found' });
        }

        // Get QR from WhatsApp service
        const qrData = whatsappService.getQRCode(channel.id);

        res.json({
            success: true,
            data: {
                channelId: channel.uuid,
                status: qrData.status,
                qrCode: qrData.qr
            }
        });
    } catch (error) {
        console.error('Error getting QR code:', error);
        res.status(500).json({ success: false, message: 'Failed to get QR code' });
    }
});

/**
 * POST /api/channels/whatsapp/:id/sync
 * Sync old messages from a WhatsApp conversation
 */
router.post('/whatsapp/:id/sync', async (req, res) => {
    try {
        const { conversationId, limit } = req.body;
        const channel = await Channel.findByUuid(req.params.id);

        if (!channel || channel.platform !== 'whatsapp') {
            return res.status(404).json({ success: false, message: 'WhatsApp channel not found' });
        }

        const result = await whatsappService.syncMessages(channel.id, conversationId, limit || 50);

        res.json({
            success: true,
            data: result,
            message: `Synced ${result.synced} messages`
        });
    } catch (error) {
        console.error('Error syncing messages:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to sync messages' });
    }
});

/**
 * POST /api/channels/facebook/connect
 * Connect Facebook Messenger (via OAuth)
 */
router.post('/facebook/connect', async (req, res) => {
    try {
        const { accessToken, pageId, pageName } = req.body;

        const channel = await Channel.create({
            platform: 'facebook',
            name: pageName || 'Facebook Page',
            identifier: pageId,
            accessToken
        });

        // Update status to active (assuming token is valid)
        await Channel.updateStatus(channel.id, 'active');

        res.json({
            success: true,
            data: channel,
            message: 'Facebook Messenger connected successfully'
        });
    } catch (error) {
        console.error('Error connecting Facebook:', error);
        res.status(500).json({ success: false, message: 'Failed to connect Facebook' });
    }
});

/**
 * POST /api/channels/instagram/connect
 * Connect Instagram DMs (via OAuth)
 */
router.post('/instagram/connect', async (req, res) => {
    try {
        const { accessToken, accountId, accountName } = req.body;

        const channel = await Channel.create({
            platform: 'instagram',
            name: accountName || 'Instagram Business',
            identifier: accountId,
            accessToken
        });

        await Channel.updateStatus(channel.id, 'active');

        res.json({
            success: true,
            data: channel,
            message: 'Instagram connected successfully'
        });
    } catch (error) {
        console.error('Error connecting Instagram:', error);
        res.status(500).json({ success: false, message: 'Failed to connect Instagram' });
    }
});

/**
 * DELETE /api/channels/:id
 * Disconnect/delete a channel
 */
router.delete('/:id', async (req, res) => {
    try {
        const channel = await Channel.findByUuid(req.params.id);

        if (!channel) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Disconnect WhatsApp session if applicable
        if (channel.platform === 'whatsapp') {
            try {
                await whatsappService.disconnectClient(channel.id);
            } catch (e) {
                console.warn('WhatsApp disconnect failed:', e.message);
            }
        }

        await Channel.delete(channel.id);

        res.json({
            success: true,
            message: 'Channel disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting channel:', error);
        res.status(500).json({ success: false, message: 'Failed to disconnect channel' });
    }
});

export default router;
