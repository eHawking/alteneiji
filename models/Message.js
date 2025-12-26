import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message Model - Individual messages in conversations
 */
export class Message {
    /**
     * Find message by ID
     */
    static async findById(id) {
        return queryOne('SELECT * FROM messages WHERE id = ?', [id]);
    }

    /**
     * Find message by UUID
     */
    static async findByUuid(uuid) {
        return queryOne('SELECT * FROM messages WHERE uuid = ?', [uuid]);
    }

    /**
     * Get messages for a conversation
     */
    static async findByConversation(conversationId, { page = 1, limit = 50 } = {}) {
        const offset = (page - 1) * limit;

        const messages = await query(`
            SELECT m.*, a.first_name as agent_first_name, a.last_name as agent_last_name
            FROM messages m
            LEFT JOIN agents a ON m.agent_id = a.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [conversationId, limit, offset]);

        // Reverse to show oldest first in UI
        return messages.reverse();
    }

    /**
     * Create new message
     */
    static async create(messageData) {
        const {
            conversationId,
            direction, // 'incoming' or 'outgoing'
            content,
            contentType = 'text',
            mediaUrl = null,
            agentId = null,
            externalId = null,
            metadata = null
        } = messageData;

        const uuid = uuidv4();

        const id = await insert(`
            INSERT INTO messages (uuid, conversation_id, direction, content, content_type, media_url, agent_id, external_id, metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [uuid, conversationId, direction, content, contentType, mediaUrl, agentId, externalId, JSON.stringify(metadata)]);

        return this.findById(id);
    }

    /**
     * Update message status (sent, delivered, read)
     */
    static async updateStatus(id, status) {
        await update('UPDATE messages SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }

    /**
     * Update message by external ID (for delivery/read receipts)
     */
    static async updateStatusByExternalId(externalId, status) {
        await update('UPDATE messages SET status = ? WHERE external_id = ?', [status, externalId]);
    }

    /**
     * Get message count for a conversation
     */
    static async getCount(conversationId) {
        const result = await queryOne(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
            [conversationId]
        );
        return Number(result.total);
    }

    /**
     * Delete message
     */
    static async delete(id) {
        const affected = await update('DELETE FROM messages WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default Message;
