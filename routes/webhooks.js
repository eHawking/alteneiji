/**
 * Webhook Routes for Facebook and Instagram
 * Handles incoming messages from Meta platforms
 */

import express from 'express';
import * as facebookService from '../services/facebook.js';
import * as instagramService from '../services/instagram.js';

const router = express.Router();

/**
 * GET /api/webhooks/facebook
 * Facebook webhook verification
 */
router.get('/facebook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const result = facebookService.verifyWebhook(mode, token, challenge);

    if (result) {
        console.log('Facebook webhook verified');
        res.status(200).send(result);
    } else {
        console.log('Facebook webhook verification failed');
        res.sendStatus(403);
    }
});

/**
 * POST /api/webhooks/facebook
 * Facebook webhook event handler
 */
router.post('/facebook', async (req, res) => {
    const body = req.body;

    // Verify it's from a page subscription
    if (body.object !== 'page') {
        return res.sendStatus(404);
    }

    // Immediately respond to avoid timeout
    res.sendStatus(200);

    // Process events asynchronously
    try {
        for (const entry of body.entry || []) {
            const webhookEvent = entry.messaging?.[0];

            if (webhookEvent) {
                console.log('Facebook webhook event:', webhookEvent);
                await facebookService.processWebhookEvent(webhookEvent);
            }
        }
    } catch (error) {
        console.error('Error processing Facebook webhook:', error);
    }
});

/**
 * GET /api/webhooks/instagram
 * Instagram webhook verification (uses same verify token as Facebook)
 */
router.get('/instagram', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Instagram uses same webhook system as Facebook
    const result = facebookService.verifyWebhook(mode, token, challenge);

    if (result) {
        console.log('Instagram webhook verified');
        res.status(200).send(result);
    } else {
        console.log('Instagram webhook verification failed');
        res.sendStatus(403);
    }
});

/**
 * POST /api/webhooks/instagram
 * Instagram webhook event handler
 */
router.post('/instagram', async (req, res) => {
    const body = req.body;

    // Verify it's from an Instagram subscription
    if (body.object !== 'instagram') {
        return res.sendStatus(404);
    }

    // Immediately respond
    res.sendStatus(200);

    // Process events asynchronously
    try {
        for (const entry of body.entry || []) {
            const webhookEvent = entry.messaging?.[0];

            if (webhookEvent) {
                console.log('Instagram webhook event:', webhookEvent);
                await instagramService.processWebhookEvent(webhookEvent);
            }
        }
    } catch (error) {
        console.error('Error processing Instagram webhook:', error);
    }
});

export default router;
