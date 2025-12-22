import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Product, ProductCategory } from '../models/Product.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// =====================
// PRODUCTS
// =====================

/**
 * @route GET /api/products
 * @desc Get all products
 */
router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status, category, search, featured } = req.query;

        const result = await Product.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            status: req.user ? status : 'published',
            categoryId: category,
            search,
            featured: featured === 'true' ? true : (featured === 'false' ? false : null)
        });

        res.json({
            success: true,
            data: result.products,
            pagination: result.pagination
        });
    })
);

/**
 * @route GET /api/products/featured
 * @desc Get featured products
 */
router.get('/featured',
    asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 6;
        const products = await Product.getFeatured(limit);

        res.json({
            success: true,
            data: products
        });
    })
);

/**
 * @route GET /api/products/:slug
 * @desc Get product by slug
 */
router.get('/:slug',
    asyncHandler(async (req, res) => {
        const product = await Product.findBySlug(req.params.slug);

        if (!product || (product.status !== 'published' && !req.user)) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    })
);

/**
 * @route POST /api/products
 * @desc Create a new product
 */
router.post('/',
    authenticate,
    authorize('products', 'create'),
    [
        body('name').notEmpty().trim(),
        body('slug').notEmpty().trim().toLowerCase().matches(/^[a-z0-9-]+$/),
        body('shortDescription').optional().trim(),
        body('description').optional()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            data: product
        });
    })
);

/**
 * @route PUT /api/products/:id
 * @desc Update a product
 */
router.put('/:id',
    authenticate,
    authorize('products', 'edit'),
    asyncHandler(async (req, res) => {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const updatedProduct = await Product.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedProduct
        });
    })
);

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 */
router.delete('/:id',
    authenticate,
    authorize('products', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await Product.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted'
        });
    })
);

// =====================
// CATEGORIES
// =====================

/**
 * @route GET /api/products/categories/all
 * @desc Get all product categories
 */
router.get('/categories/all',
    asyncHandler(async (req, res) => {
        const categories = await ProductCategory.findAll();

        res.json({
            success: true,
            data: categories
        });
    })
);

/**
 * @route POST /api/products/categories
 * @desc Create a product category
 */
router.post('/categories',
    authenticate,
    authorize('products', 'create'),
    [
        body('name').notEmpty().trim(),
        body('slug').notEmpty().trim().toLowerCase().matches(/^[a-z0-9-]+$/)
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const category = await ProductCategory.create(req.body);

        res.status(201).json({
            success: true,
            data: category
        });
    })
);

/**
 * @route PUT /api/products/categories/:id
 * @desc Update a product category
 */
router.put('/categories/:id',
    authenticate,
    authorize('products', 'edit'),
    asyncHandler(async (req, res) => {
        const category = await ProductCategory.update(req.params.id, req.body);

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category
        });
    })
);

/**
 * @route DELETE /api/products/categories/:id
 * @desc Delete a product category
 */
router.delete('/categories/:id',
    authenticate,
    authorize('products', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await ProductCategory.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted'
        });
    })
);

export default router;
