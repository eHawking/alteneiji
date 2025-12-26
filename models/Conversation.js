import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Conversation Model - Chat threads with contacts
 */
export class Conversation {
    /**
     * Find conversation by ID
     */
    static async findById(id) {
        return queryOne(`
            SELECT c.*, ch.platform, ch.name as channel_name,
                   a.first_name as agent_first_name, a.last_name as agent_last_name
            FROM conversations c
            LEFT JOIN channels ch ON c.channel_id = ch.id
            LEFT JOIN agents a ON c.assigned_agent_id = a.id
            WHERE c.id = ?
        `, [id]);
    }

    /**
     * Find conversation by UUID
     */
    static async findByUuid(uuid) {
        return queryOne(`
            SELECT c.*, ch.platform, ch.name as channel_name,
                   a.first_name as agent_first_name, a.last_name as agent_last_name
            FROM conversations c
            LEFT JOIN channels ch ON c.channel_id = ch.id
            LEFT JOIN agents a ON c.assigned_agent_id = a.id
            WHERE c.uuid = ?
        `, [uuid]);
    }

    /**
     * Find conversation by contact identifier and channel
     */
    static async findByContact(channelId, contactIdentifier) {
        return queryOne(`
            SELECT c.*, ch.platform
            FROM conversations c
            LEFT JOIN channels ch ON c.channel_id = ch.id
            WHERE c.channel_id = ? AND c.contact_identifier = ?
        `, [channelId, contactIdentifier]);
    }

    /**
     * Get all conversations with filters
     */
    static async findAll({
        platform = null,
        status = null,
        agentId = null,
        unreadOnly = false,
        search = null,
        page = 1,
        limit = 50
    } = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (platform && platform !== 'all') {
            whereClause += ' AND ch.platform = ?';
            params.push(platform);
        }

        if (status) {
            whereClause += ' AND c.status = ?';
            params.push(status);
        }

        if (agentId) {
            whereClause += ' AND c.assigned_agent_id = ?';
            params.push(agentId);
        }

        if (unreadOnly) {
            whereClause += ' AND c.unread_count > 0';
        }

        if (search) {
            whereClause += ' AND (c.contact_name LIKE ? OR c.contact_identifier LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        // Count total
        const countResult = await queryOne(`
            SELECT COUNT(*) as total 
            FROM conversations c
            LEFT JOIN channels ch ON c.channel_id = ch.id
            ${whereClause}
        `, params);
        const total = Number(countResult.total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const conversations = await query(`
            SELECT c.*, ch.platform, ch.name as channel_name,
                   a.first_name as agent_first_name, a.last_name as agent_last_name
            FROM conversations c
            LEFT JOIN channels ch ON c.channel_id = ch.id
            LEFT JOIN agents a ON c.assigned_agent_id = a.id
            ${whereClause}
            ORDER BY c.last_message_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            conversations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    /**
     * Create new conversation
     */
    static async create(convData) {
        const {
            channelId,
            contactIdentifier,
            contactName = null,
            contactAvatar = null,
            contactPhone = null,
            contactEmail = null
        } = convData;

        const uuid = uuidv4();

        const id = await insert(`
            INSERT INTO conversations (uuid, channel_id, contact_identifier, contact_name, contact_avatar, contact_phone, contact_email) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuid, channelId, contactIdentifier, contactName, contactAvatar, contactPhone, contactEmail]);

        return this.findById(id);
    }

    /**
     * Update conversation
     */
    static async update(id, updates) {
        const allowedFields = ['contact_name', 'contact_avatar', 'contact_phone', 'contact_email', 'status', 'assigned_agent_id', 'notes', 'labels'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(dbKey === 'labels' ? JSON.stringify(value) : value);
            }
        }

        if (setClause.length > 0) {
            params.push(id);
            await update(
                `UPDATE conversations SET ${setClause.join(', ')} WHERE id = ?`,
                params
            );
        }

        return this.findById(id);
    }

    /**
     * Increment unread count and update last message
     */
    static async newMessage(id, lastMessage) {
        await update(`
            UPDATE conversations 
            SET unread_count = unread_count + 1, 
                last_message = ?,
                last_message_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [lastMessage, id]);
        return this.findById(id);
    }

    /**
     * Mark conversation as read
     */
    static async markRead(id) {
        await update('UPDATE conversations SET unread_count = 0 WHERE id = ?', [id]);
        return this.findById(id);
    }

    /**
     * Assign agent to conversation
     */
    static async assignAgent(id, agentId) {
        await update('UPDATE conversations SET assigned_agent_id = ? WHERE id = ?', [agentId, id]);
        return this.findById(id);
    }

    /**
     * Get unread count across all conversations
     */
    static async getTotalUnread() {
        const result = await queryOne('SELECT SUM(unread_count) as total FROM conversations');
        return Number(result.total) || 0;
    }
}

export default Conversation;
