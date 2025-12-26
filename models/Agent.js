import { query, queryOne, insert, update } from '../config/database.js';
import { hashPassword, comparePassword } from '../config/auth.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Model - Support team members for inbox
 */
export class Agent {
    /**
     * Find agent by ID
     */
    static async findById(id) {
        return queryOne('SELECT * FROM agents WHERE id = ?', [id]);
    }

    /**
     * Find agent by UUID
     */
    static async findByUuid(uuid) {
        return queryOne('SELECT * FROM agents WHERE uuid = ?', [uuid]);
    }

    /**
     * Find agent by email
     */
    static async findByEmail(email) {
        return queryOne('SELECT * FROM agents WHERE email = ?', [email.toLowerCase()]);
    }

    /**
     * Get all agents
     */
    static async findAll({ status = null } = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        return query(`
            SELECT a.*, 
                   (SELECT COUNT(*) FROM conversations c WHERE c.assigned_agent_id = a.id AND c.status = 'active') as active_chats
            FROM agents a
            ${whereClause}
            ORDER BY a.created_at DESC
        `, params);
    }

    /**
     * Create new agent
     */
    static async create(agentData) {
        const {
            email,
            password,
            firstName,
            lastName,
            role = 'agent',
            permissions = {},
            avatar = null
        } = agentData;

        const uuid = uuidv4();
        const hashedPassword = await hashPassword(password);

        // Default permissions
        const defaultPermissions = {
            viewAll: false,
            viewAssigned: true,
            reply: true,
            assign: false,
            bulkMessage: false,
            manageAgents: false,
            manageChannels: false
        };

        const finalPermissions = { ...defaultPermissions, ...permissions };

        const id = await insert(`
            INSERT INTO agents (uuid, email, password, first_name, last_name, role, permissions, avatar, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [uuid, email.toLowerCase(), hashedPassword, firstName, lastName, role, JSON.stringify(finalPermissions), avatar]);

        return this.findById(id);
    }

    /**
     * Update agent
     */
    static async update(id, updates) {
        const allowedFields = ['first_name', 'last_name', 'role', 'permissions', 'avatar', 'status', 'is_online'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(dbKey === 'permissions' ? JSON.stringify(value) : value);
            }
        }

        if (setClause.length > 0) {
            params.push(id);
            await update(
                `UPDATE agents SET ${setClause.join(', ')} WHERE id = ?`,
                params
            );
        }

        return this.findById(id);
    }

    /**
     * Update agent password
     */
    static async updatePassword(id, newPassword) {
        const hashedPassword = await hashPassword(newPassword);
        await update('UPDATE agents SET password = ? WHERE id = ?', [hashedPassword, id]);
        return true;
    }

    /**
     * Verify agent credentials
     */
    static async verifyCredentials(email, password) {
        const agent = await this.findByEmail(email);

        if (!agent || agent.status !== 'active') {
            return null;
        }

        const isValid = await comparePassword(password, agent.password);

        if (!isValid) {
            return null;
        }

        // Update last login and set online
        await update(
            'UPDATE agents SET last_login = CURRENT_TIMESTAMP, is_online = 1 WHERE id = ?',
            [agent.id]
        );

        // Remove password from returned object
        delete agent.password;
        return agent;
    }

    /**
     * Set agent online/offline status
     */
    static async setOnlineStatus(id, isOnline) {
        await update('UPDATE agents SET is_online = ? WHERE id = ?', [isOnline ? 1 : 0, id]);
        return this.findById(id);
    }

    /**
     * Delete agent
     */
    static async delete(id) {
        // Unassign all conversations first
        await update('UPDATE conversations SET assigned_agent_id = NULL WHERE assigned_agent_id = ?', [id]);
        const affected = await update('DELETE FROM agents WHERE id = ?', [id]);
        return affected > 0;
    }

    /**
     * Get agent stats
     */
    static async getStats() {
        const stats = await queryOne(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM agents
        `);
        return stats;
    }
}

export default Agent;
