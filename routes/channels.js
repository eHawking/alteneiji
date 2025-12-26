import express from 'express';
import { Channel } from '../models/Channel.js';

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

        res.json({
            success: true,
            data: channel
        });
    } catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch channel' });
    }
});

/**
 * POST /api/channels/whatsapp/init
 * Initialize WhatsApp connection (returns QR code data)
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

        // TODO: Initialize actual WhatsApp Web connection
        // For now, return placeholder QR data
        res.json({
            success: true,
            data: {
                channelId: channel.uuid,
                qrCode: null, // Will be populated by WhatsApp service
                status: 'waiting_for_qr'
            },
            message: 'WhatsApp connection initialized. Scan QR code to connect.'
        });
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

        // TODO: Get QR from WhatsApp service
        res.json({
            success: true,
            data: {
                status: channel.status,
                qrCode: null // Will be populated by WhatsApp service
            }
        });
    } catch (error) {
        console.error('Error getting QR code:', error);
        res.status(500).json({ success: false, message: 'Failed to get QR code' });
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

        // TODO: Cleanup WhatsApp session if applicable

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
