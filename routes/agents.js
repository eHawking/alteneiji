import express from 'express';
import { Agent } from '../models/Agent.js';

const router = express.Router();

/**
 * GET /api/agents
 * Get all agents
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const agents = await Agent.findAll({ status });

        // Remove passwords from response
        const safeAgents = agents.map(agent => {
            const { password, ...safeAgent } = agent;
            return safeAgent;
        });

        res.json({
            success: true,
            data: safeAgents,
            stats: await Agent.getStats()
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch agents' });
    }
});

/**
 * GET /api/agents/:id
 * Get single agent
 */
router.get('/:id', async (req, res) => {
    try {
        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        const { password, ...safeAgent } = agent;

        res.json({
            success: true,
            data: safeAgent
        });
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch agent' });
    }
});

/**
 * POST /api/agents
 * Create new agent
 */
router.post('/', async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, permissions } = req.body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, and last name are required'
            });
        }

        // Check if email already exists
        const existing = await Agent.findByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const agent = await Agent.create({
            email,
            password,
            firstName,
            lastName,
            role,
            permissions
        });

        const { password: pwd, ...safeAgent } = agent;

        res.status(201).json({
            success: true,
            data: safeAgent,
            message: 'Agent created successfully'
        });
    } catch (error) {
        console.error('Error creating agent:', error);
        res.status(500).json({ success: false, message: 'Failed to create agent' });
    }
});

/**
 * PUT /api/agents/:id
 * Update agent
 */
router.put('/:id', async (req, res) => {
    try {
        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        const updated = await Agent.update(agent.id, req.body);
        const { password, ...safeAgent } = updated;

        res.json({
            success: true,
            data: safeAgent,
            message: 'Agent updated successfully'
        });
    } catch (error) {
        console.error('Error updating agent:', error);
        res.status(500).json({ success: false, message: 'Failed to update agent' });
    }
});

/**
 * PUT /api/agents/:id/permissions
 * Update agent permissions
 */
router.put('/:id/permissions', async (req, res) => {
    try {
        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        // Merge with existing permissions
        const currentPermissions = typeof agent.permissions === 'string'
            ? JSON.parse(agent.permissions)
            : agent.permissions || {};

        const newPermissions = { ...currentPermissions, ...req.body };

        const updated = await Agent.update(agent.id, { permissions: newPermissions });
        const { password, ...safeAgent } = updated;

        res.json({
            success: true,
            data: safeAgent,
            message: 'Permissions updated successfully'
        });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to update permissions' });
    }
});

/**
 * PUT /api/agents/:id/password
 * Update agent password
 */
router.put('/:id/password', async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        await Agent.updatePassword(agent.id, newPassword);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

/**
 * DELETE /api/agents/:id
 * Delete agent
 */
router.delete('/:id', async (req, res) => {
    try {
        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        await Agent.delete(agent.id);

        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ success: false, message: 'Failed to delete agent' });
    }
});

/**
 * POST /api/agents/:id/status
 * Set agent online/offline status
 */
router.post('/:id/status', async (req, res) => {
    try {
        const { isOnline } = req.body;
        const agent = await Agent.findByUuid(req.params.id);

        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        const updated = await Agent.setOnlineStatus(agent.id, isOnline);
        const { password, ...safeAgent } = updated;

        res.json({
            success: true,
            data: safeAgent
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
});

export default router;
