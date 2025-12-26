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
 * GET /api/channels/facebook/oauth-url
 * Get Facebook OAuth URL for authorization
 */
router.get('/facebook/oauth-url', (req, res) => {
    try {
        const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/facebook/callback`;
        const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

        // Import Facebook service dynamically
        import('../services/facebook.js').then(facebookService => {
            const oauthUrl = facebookService.getOAuthUrl(redirectUri, state);
            res.json({
                success: true,
                data: { oauthUrl, state }
            });
        }).catch(err => {
            res.status(500).json({
                success: false,
                message: 'Facebook service not configured. Set FACEBOOK_APP_ID in .env'
            });
        });
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/channels/facebook/callback
 * Facebook OAuth callback
 */
router.get('/facebook/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect('/admin/#channels?error=no_code');
        }

        const facebookService = await import('../services/facebook.js');
        const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/facebook/callback`;

        // Exchange code for token
        const tokenData = await facebookService.exchangeCodeForToken(code, redirectUri);

        // Get user's pages
        const pages = await facebookService.getUserPages(tokenData.access_token);

        // Store pages in session/temp for selection
        // For now, redirect with pages data
        const pagesParam = encodeURIComponent(JSON.stringify(pages));
        res.redirect(`/admin/#channels?facebook_pages=${pagesParam}`);

    } catch (error) {
        console.error('Facebook OAuth callback error:', error);
        res.redirect('/admin/#channels?error=' + encodeURIComponent(error.message));
    }
});

/**
 * POST /api/channels/facebook/connect
 * Connect a specific Facebook page (after OAuth)
 */
router.post('/facebook/connect', async (req, res) => {
    try {
        const { pageId, pageName, pageAccessToken } = req.body;

        if (!pageId || !pageAccessToken) {
            return res.status(400).json({
                success: false,
                message: 'Page ID and access token are required'
            });
        }

        const facebookService = await import('../services/facebook.js');
        const channel = await facebookService.connectPage({ pageId, pageName, pageAccessToken });

        res.json({
            success: true,
            data: channel,
            message: 'Facebook Messenger connected successfully'
        });
    } catch (error) {
        console.error('Error connecting Facebook:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to connect Facebook' });
    }
});

/**
 * GET /api/channels/instagram/oauth-url
 * Get Instagram OAuth URL (uses Facebook OAuth with Instagram permissions)
 */
router.get('/instagram/oauth-url', (req, res) => {
    try {
        const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/instagram/callback`;
        const state = Buffer.from(JSON.stringify({ timestamp: Date.now(), platform: 'instagram' })).toString('base64');

        import('../services/instagram.js').then(instagramService => {
            const oauthUrl = instagramService.getOAuthUrl(redirectUri, state);
            res.json({
                success: true,
                data: { oauthUrl, state }
            });
        }).catch(err => {
            res.status(500).json({
                success: false,
                message: 'Instagram service not configured. Set FACEBOOK_APP_ID in .env'
            });
        });
    } catch (error) {
        console.error('Error generating Instagram OAuth URL:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/channels/instagram/callback
 * Instagram OAuth callback
 */
router.get('/instagram/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect('/admin/#channels?error=no_code');
        }

        const facebookService = await import('../services/facebook.js');
        const instagramService = await import('../services/instagram.js');

        const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/instagram/callback`;

        // Exchange code for token (uses Facebook OAuth)
        const tokenData = await facebookService.exchangeCodeForToken(code, redirectUri);

        // Get Instagram accounts linked to Facebook pages
        const accounts = await instagramService.getInstagramAccounts(tokenData.access_token);

        if (accounts.length === 0) {
            return res.redirect('/admin/#channels?error=no_instagram_accounts');
        }

        // Redirect with accounts data for selection
        const accountsParam = encodeURIComponent(JSON.stringify(accounts));
        res.redirect(`/admin/#channels?instagram_accounts=${accountsParam}`);

    } catch (error) {
        console.error('Instagram OAuth callback error:', error);
        res.redirect('/admin/#channels?error=' + encodeURIComponent(error.message));
    }
});

/**
 * POST /api/channels/instagram/connect
 * Connect a specific Instagram account (after OAuth)
 */
router.post('/instagram/connect', async (req, res) => {
    try {
        const { id, username, pageAccessToken, profile_picture_url } = req.body;

        if (!id || !pageAccessToken) {
            return res.status(400).json({
                success: false,
                message: 'Instagram account ID and access token are required'
            });
        }

        const instagramService = await import('../services/instagram.js');
        const channel = await instagramService.connectAccount({
            id,
            username,
            pageAccessToken,
            profile_picture_url
        });

        res.json({
            success: true,
            data: channel,
            message: 'Instagram connected successfully'
        });
    } catch (error) {
        console.error('Error connecting Instagram:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to connect Instagram' });
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
