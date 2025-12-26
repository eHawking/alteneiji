import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Channel Model - Connected messaging platforms (WhatsApp, Facebook, Instagram)
 */
export class Channel {
    /**
     * Find channel by ID
     */
    static async findById(id) {
        return queryOne('SELECT * FROM channels WHERE id = ?', [id]);
    }

    /**
     * Find channel by UUID
     */
    static async findByUuid(uuid) {
        return queryOne('SELECT * FROM channels WHERE uuid = ?', [uuid]);
    }

    /**
     * Get all channels with optional platform filter
     */
    static async findAll({ platform = null, status = null } = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (platform) {
            whereClause += ' AND platform = ?';
            params.push(platform);
        }

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        return query(
            `SELECT * FROM channels ${whereClause} ORDER BY created_at DESC`,
            params
        );
    }

    /**
     * Create new channel
     */
    static async create(channelData) {
        const {
            platform,
            name,
            identifier,
            phoneNumber = null,
            accessToken = null,
            sessionData = null,
            status = 'pending'
        } = channelData;

        const uuid = uuidv4();

        const id = await insert(
            `INSERT INTO channels (uuid, platform, name, identifier, phone_number, access_token, session_data, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, platform, name, identifier, phoneNumber, accessToken, JSON.stringify(sessionData), status]
        );

        return this.findById(id);
    }

    /**
     * Update channel status
     */
    static async updateStatus(id, status) {
        await update('UPDATE channels SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }

    /**
     * Update channel session data (for WhatsApp Web)
     */
    static async updateSession(id, sessionData) {
        await update(
            'UPDATE channels SET session_data = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(sessionData), id]
        );
        return this.findById(id);
    }

    /**
     * Delete channel
     */
    static async delete(id) {
        const affected = await update('DELETE FROM channels WHERE id = ?', [id]);
        return affected > 0;
    }

    /**
     * Get channel stats
     */
    static async getStats() {
        const stats = await queryOne(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN platform = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
                SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook,
                SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END) as instagram
            FROM channels
        `);
        return stats;
    }
}

export default Channel;
