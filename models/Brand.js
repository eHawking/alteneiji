import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Brand Model - Database operations for brand management
 */
export class Brand {
    /**
     * Find brand by ID
     */
    static async findById(id) {
        return queryOne('SELECT * FROM brands WHERE id = ?', [id]);
    }

    /**
     * Find brand by UUID
     */
    static async findByUuid(uuid) {
        return queryOne('SELECT * FROM brands WHERE uuid = ?', [uuid]);
    }

    /**
     * Get all brands for a user
     */
    static async findAll(userId = null) {
        let sql = 'SELECT * FROM brands';
        const params = [];

        if (userId) {
            sql += ' WHERE created_by = ?';
            params.push(userId);
        }

        sql += ' ORDER BY name ASC';
        return query(sql, params);
    }

    /**
     * Create a new brand
     */
    static async create(brandData) {
        const {
            name,
            logoUrl = null,
            website = null,
            about = null,
            createdBy = null
        } = brandData;

        const uuid = uuidv4();
        const id = await insert(
            `INSERT INTO brands 
             (uuid, name, logo_url, website, about, created_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuid, name, logoUrl, website, about, createdBy]
        );

        return this.findById(id);
    }

    /**
     * Update brand
     */
    static async update(id, updates) {
        const allowedFields = ['name', 'logo_url', 'website', 'about'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            // Convert camelCase to snake_case
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) return this.findById(id);

        // Add updated_at
        setClause.push('updated_at = NOW()');
        params.push(id);

        await update(`UPDATE brands SET ${setClause.join(', ')} WHERE id = ?`, params);
        return this.findById(id);
    }

    /**
     * Delete brand
     */
    static async delete(id) {
        const affected = await update('DELETE FROM brands WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default Brand;
