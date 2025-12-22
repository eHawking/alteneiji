import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service Model - Database operations for services
 */
export class Service {
    /**
     * Find service by ID
     * @param {number} id - Service ID
     * @returns {Promise<Object|null>} Service object or null
     */
    static async findById(id) {
        return queryOne(
            `SELECT s.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon 
             FROM services s 
             LEFT JOIN service_categories c ON s.category_id = c.id 
             WHERE s.id = ?`,
            [id]
        );
    }

    /**
     * Find service by slug
     * @param {string} slug - Service slug
     * @returns {Promise<Object|null>} Service object or null
     */
    static async findBySlug(slug) {
        return queryOne(
            `SELECT s.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon 
             FROM services s 
             LEFT JOIN service_categories c ON s.category_id = c.id 
             WHERE s.slug = ?`,
            [slug]
        );
    }

    /**
     * Get all services with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Services list with pagination
     */
    static async findAll({ page = 1, limit = 20, status = null, categoryId = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND s.status = ?';
            params.push(status);
        }

        if (categoryId) {
            whereClause += ' AND s.category_id = ?';
            params.push(categoryId);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM services s ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        const offset = (page - 1) * limit;
        const services = await query(
            `SELECT s.*, c.name as category_name, c.icon as category_icon 
             FROM services s 
             LEFT JOIN service_categories c ON s.category_id = c.id 
             ${whereClause}
             ORDER BY s.order_index ASC, s.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            services,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get featured services
     * @param {number} limit - Max services to return
     * @returns {Promise<Array>} Featured services
     */
    static async getFeatured(limit = 6) {
        return query(
            `SELECT s.*, c.name as category_name, c.icon as category_icon 
             FROM services s 
             LEFT JOIN service_categories c ON s.category_id = c.id 
             WHERE s.is_featured = TRUE AND s.status = 'published'
             ORDER BY s.order_index ASC 
             LIMIT ?`,
            [limit]
        );
    }

    /**
     * Create a new service
     */
    static async create(serviceData) {
        const {
            name, slug, shortDescription = '', description = '',
            categoryId = null, icon = null, featuredImage = null,
            metaTitle = null, metaDescription = null,
            status = 'draft', isFeatured = false, orderIndex = 0
        } = serviceData;

        const uuid = uuidv4();
        const id = await insert(
            `INSERT INTO services 
             (uuid, name, slug, short_description, description, category_id, icon,
              featured_image, meta_title, meta_description, status, is_featured, order_index) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, name, slug, shortDescription, description, categoryId, icon,
                featuredImage, metaTitle, metaDescription, status, isFeatured, orderIndex]
        );

        return this.findById(id);
    }

    /**
     * Update service
     */
    static async update(id, updates) {
        const allowedFields = [
            'name', 'slug', 'short_description', 'description', 'category_id', 'icon',
            'featured_image', 'meta_title', 'meta_description', 'status', 'is_featured', 'order_index'
        ];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) return this.findById(id);

        params.push(id);
        await update(`UPDATE services SET ${setClause.join(', ')} WHERE id = ?`, params);
        return this.findById(id);
    }

    /**
     * Delete service
     */
    static async delete(id) {
        const affected = await update('DELETE FROM services WHERE id = ?', [id]);
        return affected > 0;
    }
}

/**
 * ServiceCategory Model
 */
export class ServiceCategory {
    static async findAll() {
        return query(
            `SELECT * FROM service_categories WHERE is_active = TRUE ORDER BY order_index ASC`
        );
    }

    static async findById(id) {
        return queryOne('SELECT * FROM service_categories WHERE id = ?', [id]);
    }

    static async findBySlug(slug) {
        return queryOne('SELECT * FROM service_categories WHERE slug = ?', [slug]);
    }

    static async create(categoryData) {
        const { name, slug, description = '', icon = null, orderIndex = 0 } = categoryData;
        const id = await insert(
            `INSERT INTO service_categories (name, slug, description, icon, order_index) VALUES (?, ?, ?, ?, ?)`,
            [name, slug, description, icon, orderIndex]
        );
        return this.findById(id);
    }

    static async update(id, updates) {
        const allowedFields = ['name', 'slug', 'description', 'icon', 'order_index', 'is_active'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) return this.findById(id);
        params.push(id);
        await update(`UPDATE service_categories SET ${setClause.join(', ')} WHERE id = ?`, params);
        return this.findById(id);
    }

    static async delete(id) {
        const affected = await update('DELETE FROM service_categories WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default { Service, ServiceCategory };
