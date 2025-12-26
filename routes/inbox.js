import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Channel } from '../models/Channel.js';
import { Agent } from '../models/Agent.js';

const router = express.Router();

// =====================
// CONVERSATIONS
// =====================

/**
 * GET /api/inbox/conversations
 * Get all conversations with filters
 */
router.get('/conversations', async (req, res) => {
    try {
        const { platform, status, agentId, unread, search, page, limit } = req.query;

        const result = await Conversation.findAll({
            platform,
            status,
            agentId: agentId ? parseInt(agentId) : null,
            unreadOnly: unread === 'true',
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        res.json({
            success: true,
            data: result.conversations,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/inbox/conversations/:id
 * Get single conversation with messages
 */
router.get('/conversations/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findByUuid(req.params.id);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Mark as read when opening
        await Conversation.markRead(conversation.id);

        // Get messages
        const messages = await Message.findByConversation(conversation.id, {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 100
        });

        res.json({
            success: true,
            data: {
                conversation,
                messages
            }
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
    }
});

/**
 * PUT /api/inbox/conversations/:id
 * Update conversation (assign agent, add notes, labels)
 */
router.put('/conversations/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findByUuid(req.params.id);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const updated = await Conversation.update(conversation.id, req.body);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to update conversation' });
    }
});

/**
 * POST /api/inbox/conversations/:id/assign
 * Assign agent to conversation
 */
router.post('/conversations/:id/assign', async (req, res) => {
    try {
        const { agentId } = req.body;
        const conversation = await Conversation.findByUuid(req.params.id);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const updated = await Conversation.assignAgent(conversation.id, agentId);

        res.json({
            success: true,
            data: updated,
            message: 'Agent assigned successfully'
        });
    } catch (error) {
        console.error('Error assigning agent:', error);
        res.status(500).json({ success: false, message: 'Failed to assign agent' });
    }
});

// =====================
// MESSAGES
// =====================

/**
 * POST /api/inbox/send
 * Send a message (will be routed to appropriate platform)
 */
router.post('/send', async (req, res) => {
    try {
        const { conversationId, content, contentType = 'text', mediaUrl = null } = req.body;

        // Get conversation
        const conversation = await Conversation.findByUuid(conversationId);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Create message in database
        const message = await Message.create({
            conversationId: conversation.id,
            direction: 'outgoing',
            content,
            contentType,
            mediaUrl,
            agentId: req.user?.id || null // If agent is logged in
        });

        // TODO: Send via WhatsApp/Facebook/Instagram API based on channel
        // For now, just mark as sent
        await Message.updateStatus(message.id, 'sent');

        // Update conversation last message
        await Conversation.update(conversation.id, {
            lastMessage: content,
            lastMessageAt: new Date()
        });

        res.json({
            success: true,
            data: message,
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// =====================
// STATS
// =====================

/**
 * GET /api/inbox/stats
 * Get inbox statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const totalUnread = await Conversation.getTotalUnread();
        const channelStats = await Channel.getStats();
        const agentStats = await Agent.getStats();

        res.json({
            success: true,
            data: {
                unreadCount: totalUnread,
                channels: channelStats,
                agents: agentStats
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

export default router;
