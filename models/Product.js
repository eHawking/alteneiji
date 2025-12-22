import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product Model - Database operations for products
 */
export class Product {
    /**
     * Find product by ID
     * @param {number} id - Product ID
     * @returns {Promise<Object|null>} Product object or null
     */
    static async findById(id) {
        const product = await queryOne(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );

        if (product && product.gallery) {
            product.gallery = typeof product.gallery === 'string'
                ? JSON.parse(product.gallery)
                : product.gallery;
        }

        return product;
    }

    /**
     * Find product by UUID
     * @param {string} uuid - Product UUID
     * @returns {Promise<Object|null>} Product object or null
     */
    static async findByUuid(uuid) {
        const product = await queryOne(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.uuid = ?`,
            [uuid]
        );

        if (product && product.gallery) {
            product.gallery = typeof product.gallery === 'string'
                ? JSON.parse(product.gallery)
                : product.gallery;
        }

        return product;
    }

    /**
     * Find product by slug
     * @param {string} slug - Product slug
     * @returns {Promise<Object|null>} Product object or null
     */
    static async findBySlug(slug) {
        const product = await queryOne(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.slug = ?`,
            [slug]
        );

        if (product && product.gallery) {
            product.gallery = typeof product.gallery === 'string'
                ? JSON.parse(product.gallery)
                : product.gallery;
        }

        return product;
    }

    /**
     * Get all products with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Products list with pagination
     */
    static async findAll({
        page = 1,
        limit = 20,
        status = null,
        categoryId = null,
        search = null,
        featured = null
    }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }

        if (categoryId) {
            whereClause += ' AND p.category_id = ?';
            params.push(categoryId);
        }

        if (featured !== null) {
            whereClause += ' AND p.is_featured = ?';
            params.push(featured);
        }

        if (search) {
            whereClause += ' AND (p.name LIKE ? OR p.short_description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        // Count total
        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM products p ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const products = await query(
            `SELECT p.id, p.uuid, p.name, p.slug, p.short_description, p.featured_image,
                    p.status, p.is_featured, p.order_index, p.created_at, p.updated_at,
                    c.name as category_name, c.slug as category_slug
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             ${whereClause}
             ORDER BY p.order_index ASC, p.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get featured products
     * @param {number} limit - Max products to return
     * @returns {Promise<Array>} Featured products
     */
    static async getFeatured(limit = 6) {
        return query(
            `SELECT p.id, p.uuid, p.name, p.slug, p.short_description, p.featured_image,
                    c.name as category_name, c.slug as category_slug
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.is_featured = TRUE AND p.status = 'published'
             ORDER BY p.order_index ASC 
             LIMIT ?`,
            [limit]
        );
    }

    /**
     * Create a new product
     * @param {Object} productData - Product data
     * @returns {Promise<Object>} Created product
     */
    static async create(productData) {
        const {
            name, slug, shortDescription = '', description = '',
            categoryId = null, featuredImage = null, gallery = null,
            metaTitle = null, metaDescription = null,
            status = 'draft', isFeatured = false, orderIndex = 0
        } = productData;

        const uuid = uuidv4();

        const id = await insert(
            `INSERT INTO products 
             (uuid, name, slug, short_description, description, category_id, 
              featured_image, gallery, meta_title, meta_description, 
              status, is_featured, order_index) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuid, name, slug, shortDescription, description, categoryId,
                featuredImage, gallery ? JSON.stringify(gallery) : null,
                metaTitle, metaDescription, status, isFeatured, orderIndex
            ]
        );

        return this.findById(id);
    }

    /**
     * Update product
     * @param {number} id - Product ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated product
     */
    static async update(id, updates) {
        const allowedFields = [
            'name', 'slug', 'short_description', 'description', 'category_id',
            'featured_image', 'gallery', 'meta_title', 'meta_description',
            'status', 'is_featured', 'order_index'
        ];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                if (dbKey === 'gallery' && value) {
                    params.push(JSON.stringify(value));
                } else {
                    params.push(value);
                }
            }
        }

        if (setClause.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        await update(
            `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Delete product
     * @param {number} id - Product ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(id) {
        const affected = await update('DELETE FROM products WHERE id = ?', [id]);
        return affected > 0;
    }
}

/**
 * ProductCategory Model
 */
export class ProductCategory {
    /**
     * Get all categories
     * @returns {Promise<Array>} Categories list
     */
    static async findAll() {
        return query(
            `SELECT * FROM product_categories 
             WHERE is_active = TRUE 
             ORDER BY order_index ASC`
        );
    }

    /**
     * Find category by ID
     * @param {number} id - Category ID
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findById(id) {
        return queryOne('SELECT * FROM product_categories WHERE id = ?', [id]);
    }

    /**
     * Find category by slug
     * @param {string} slug - Category slug
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findBySlug(slug) {
        return queryOne('SELECT * FROM product_categories WHERE slug = ?', [slug]);
    }

    /**
     * Create category
     * @param {Object} categoryData - Category data
     * @returns {Promise<Object>} Created category
     */
    static async create(categoryData) {
        const { name, slug, description = '', image = null, parentId = null, orderIndex = 0 } = categoryData;

        const id = await insert(
            `INSERT INTO product_categories (name, slug, description, image, parent_id, order_index) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, slug, description, image, parentId, orderIndex]
        );

        return this.findById(id);
    }

    /**
     * Update category
     * @param {number} id - Category ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated category
     */
    static async update(id, updates) {
        const allowedFields = ['name', 'slug', 'description', 'image', 'parent_id', 'order_index', 'is_active'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        await update(
            `UPDATE product_categories SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Delete category
     * @param {number} id - Category ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(id) {
        const affected = await update('DELETE FROM product_categories WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default { Product, ProductCategory };
