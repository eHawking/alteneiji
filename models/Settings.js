import { query, queryOne, insert, update } from '../config/database.js';

/**
 * Settings Model - Key-value store for site configuration
 */
export class Settings {
    /**
     * Get a setting value by key
     * @param {string} key - Setting key
     * @returns {Promise<any>} Setting value
     */
    static async get(key) {
        const setting = await queryOne(
            'SELECT value FROM settings WHERE `key` = ?',
            [key]
        );
        if (!setting) return null;

        try {
            return JSON.parse(setting.value);
        } catch {
            return setting.value;
        }
    }

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @param {string} category - Setting category
     * @param {string} description - Setting description
     */
    static async set(key, value, category = 'general', description = null) {
        const jsonValue = JSON.stringify(value);

        await query(
            `INSERT INTO settings (\`key\`, value, category, description) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE value = ?, category = ?`,
            [key, jsonValue, category, description, jsonValue, category]
        );
    }

    /**
     * Get all settings
     * @returns {Promise<Object>} All settings as key-value object
     */
    static async getAll() {
        const settings = await query('SELECT `key`, value, category FROM settings');
        const result = {};

        settings.forEach(setting => {
            try {
                result[setting.key] = JSON.parse(setting.value);
            } catch {
                result[setting.key] = setting.value;
            }
        });

        return result;
    }

    /**
     * Get settings by category
     * @param {string} category - Category name
     * @returns {Promise<Object>} Settings in category
     */
    static async getByCategory(category) {
        const settings = await query(
            'SELECT `key`, value FROM settings WHERE category = ?',
            [category]
        );
        const result = {};

        settings.forEach(setting => {
            try {
                result[setting.key] = JSON.parse(setting.value);
            } catch {
                result[setting.key] = setting.value;
            }
        });

        return result;
    }

    /**
     * Delete a setting
     * @param {string} key - Setting key
     * @returns {Promise<boolean>} Success status
     */
    static async delete(key) {
        const affected = await update('DELETE FROM settings WHERE `key` = ?', [key]);
        return affected > 0;
    }

    /**
     * Get site info (commonly used settings)
     * @returns {Promise<Object>} Site information
     */
    static async getSiteInfo() {
        return {
            name: await this.get('site_name') || 'Alteneiji Group',
            tagline: await this.get('site_tagline') || 'Emirati Footprints Leading Trade Frontiers',
            description: await this.get('site_description') || '',
            contact: {
                email: await this.get('contact_email') || 'info@alteneijigroup.com',
                phone: await this.get('contact_phone') || ['+971503694555', '+971545666075'],
                address: await this.get('contact_address') || ''
            },
            social: {
                instagram: await this.get('social_instagram') || '',
                facebook: await this.get('social_facebook') || '',
                twitter: await this.get('social_twitter') || '',
                youtube: await this.get('social_youtube') || '',
                linkedin: await this.get('social_linkedin') || ''
            }
        };
    }
}

/**
 * ContactSubmission Model
 */
export class ContactSubmission {
    static async findAll({ page = 1, limit = 20, status = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM contact_submissions ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        const offset = (page - 1) * limit;
        const submissions = await query(
            `SELECT * FROM contact_submissions ${whereClause}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            submissions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    static async findById(id) {
        return queryOne('SELECT * FROM contact_submissions WHERE id = ?', [id]);
    }

    static async create(data) {
        const { name, email, phone, company, subject, message, source = 'website', ipAddress } = data;
        const { v4: uuidv4 } = await import('uuid');
        const uuid = uuidv4();

        const id = await insert(
            `INSERT INTO contact_submissions (uuid, name, email, phone, company, subject, message, source, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, name, email, phone, company, subject, message, source, ipAddress]
        );
        return this.findById(id);
    }

    static async updateStatus(id, status) {
        await update('UPDATE contact_submissions SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }

    static async delete(id) {
        const affected = await update('DELETE FROM contact_submissions WHERE id = ?', [id]);
        return affected > 0;
    }
}

/**
 * GulfoodRegistration Model
 */
export class GulfoodRegistration {
    static async findAll({ page = 1, limit = 20, status = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM gulfood_registrations ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        const offset = (page - 1) * limit;
        const registrations = await query(
            `SELECT * FROM gulfood_registrations ${whereClause}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        registrations.forEach(reg => {
            if (reg.interest_areas && typeof reg.interest_areas === 'string') {
                reg.interest_areas = JSON.parse(reg.interest_areas);
            }
        });

        return {
            registrations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    static async findById(id) {
        const reg = await queryOne('SELECT * FROM gulfood_registrations WHERE id = ?', [id]);
        if (reg && reg.interest_areas && typeof reg.interest_areas === 'string') {
            reg.interest_areas = JSON.parse(reg.interest_areas);
        }
        return reg;
    }

    static async create(data) {
        const { name, email, phone, company, country, interestAreas = [], message } = data;
        const { v4: uuidv4 } = await import('uuid');
        const uuid = uuidv4();

        const id = await insert(
            `INSERT INTO gulfood_registrations (uuid, name, email, phone, company, country, interest_areas, message) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, name, email, phone, company, country, JSON.stringify(interestAreas), message]
        );
        return this.findById(id);
    }

    static async updateStatus(id, status) {
        await update('UPDATE gulfood_registrations SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }

    static async delete(id) {
        const affected = await update('DELETE FROM gulfood_registrations WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default { Settings, ContactSubmission, GulfoodRegistration };
