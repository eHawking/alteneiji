import { query, queryOne, insert, update } from '../config/database.js';

/**
 * Page Model - Database operations for pages
 */
export class Page {
    /**
     * Find page by ID
     * @param {number} id - Page ID
     * @returns {Promise<Object|null>} Page object or null
     */
    static async findById(id) {
        const page = await queryOne(
            `SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name 
             FROM pages p 
             LEFT JOIN users u ON p.author_id = u.id 
             WHERE p.id = ?`,
            [id]
        );

        if (page) {
            page.sections = await this.getSections(id);
        }

        return page;
    }

    /**
     * Find page by slug
     * @param {string} slug - Page slug
     * @returns {Promise<Object|null>} Page object or null
     */
    static async findBySlug(slug) {
        const page = await queryOne(
            `SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name 
             FROM pages p 
             LEFT JOIN users u ON p.author_id = u.id 
             WHERE p.slug = ?`,
            [slug]
        );

        if (page) {
            page.sections = await this.getSections(page.id);
        }

        return page;
    }

    /**
     * Get page sections
     * @param {number} pageId - Page ID
     * @returns {Promise<Array>} Page sections
     */
    static async getSections(pageId) {
        const sections = await query(
            `SELECT * FROM page_sections 
             WHERE page_id = ? AND is_active = TRUE 
             ORDER BY order_index ASC`,
            [pageId]
        );

        // Parse JSON content for each section
        return sections.map(section => ({
            ...section,
            content: typeof section.content === 'string'
                ? JSON.parse(section.content)
                : section.content
        }));
    }

    /**
     * Get all pages with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Pages list with pagination
     */
    static async findAll({ page = 1, limit = 20, status = null, search = null, showInMenu = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }

        if (search) {
            whereClause += ' AND (p.title LIKE ? OR p.slug LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        if (showInMenu !== null) {
            whereClause += ' AND p.show_in_menu = ?';
            params.push(showInMenu);
        }

        // Count total
        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM pages p ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const pages = await query(
            `SELECT p.id, p.slug, p.title, p.template, p.status, p.show_in_menu, 
                    p.menu_order, p.meta_title, p.created_at, p.updated_at, p.published_at,
                    u.first_name as author_first_name, u.last_name as author_last_name
             FROM pages p 
             LEFT JOIN users u ON p.author_id = u.id 
             ${whereClause}
             ORDER BY p.menu_order ASC, p.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            pages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get menu pages
     * @returns {Promise<Array>} Menu pages
     */
    static async getMenuPages() {
        return query(
            `SELECT id, slug, title, menu_order 
             FROM pages 
             WHERE show_in_menu = TRUE AND status = 'published' 
             ORDER BY menu_order ASC`
        );
    }

    /**
     * Create a new page
     * @param {Object} pageData - Page data
     * @returns {Promise<Object>} Created page
     */
    static async create(pageData) {
        const {
            slug, title, content = '', template = 'default', status = 'draft',
            authorId = null, metaTitle = null, metaDescription = null,
            metaKeywords = null, ogTitle = null, ogDescription = null,
            ogImage = null, schemaMarkup = null, showInMenu = false, menuOrder = 0
        } = pageData;

        const id = await insert(
            `INSERT INTO pages 
             (slug, title, content, template, status, author_id, meta_title, 
              meta_description, meta_keywords, og_title, og_description, og_image, 
              schema_markup, show_in_menu, menu_order, published_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                slug, title, content, template, status, authorId,
                metaTitle, metaDescription, metaKeywords, ogTitle, ogDescription,
                ogImage, schemaMarkup ? JSON.stringify(schemaMarkup) : null,
                showInMenu, menuOrder,
                status === 'published' ? new Date() : null
            ]
        );

        return this.findById(id);
    }

    /**
     * Update page
     * @param {number} id - Page ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated page
     */
    static async update(id, updates) {
        const allowedFields = [
            'slug', 'title', 'content', 'template', 'status', 'meta_title',
            'meta_description', 'meta_keywords', 'og_title', 'og_description',
            'og_image', 'schema_markup', 'show_in_menu', 'menu_order'
        ];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                if (dbKey === 'schema_markup' && value) {
                    params.push(JSON.stringify(value));
                } else {
                    params.push(value);
                }
            }
        }

        // Handle publishing
        if (updates.status === 'published') {
            const currentPage = await this.findById(id);
            if (currentPage && currentPage.status !== 'published') {
                setClause.push('published_at = CURRENT_TIMESTAMP');
            }
        }

        if (setClause.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        await update(
            `UPDATE pages SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Add or update page section
     * @param {number} pageId - Page ID
     * @param {Object} sectionData - Section data
     * @returns {Promise<Object>} Section object
     */
    static async upsertSection(pageId, sectionData) {
        const { id, sectionType, title, content, orderIndex = 0, isActive = true } = sectionData;

        if (id) {
            // Update existing section
            await update(
                `UPDATE page_sections 
                 SET section_type = ?, title = ?, content = ?, order_index = ?, is_active = ? 
                 WHERE id = ? AND page_id = ?`,
                [sectionType, title, JSON.stringify(content), orderIndex, isActive, id, pageId]
            );
            return queryOne('SELECT * FROM page_sections WHERE id = ?', [id]);
        } else {
            // Create new section
            const sectionId = await insert(
                `INSERT INTO page_sections (page_id, section_type, title, content, order_index, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [pageId, sectionType, title, JSON.stringify(content), orderIndex, isActive]
            );
            return queryOne('SELECT * FROM page_sections WHERE id = ?', [sectionId]);
        }
    }

    /**
     * Delete page section
     * @param {number} pageId - Page ID
     * @param {number} sectionId - Section ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteSection(pageId, sectionId) {
        const affected = await update(
            'DELETE FROM page_sections WHERE id = ? AND page_id = ?',
            [sectionId, pageId]
        );
        return affected > 0;
    }

    /**
     * Delete page
     * @param {number} id - Page ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(id) {
        const affected = await update('DELETE FROM pages WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default Page;
