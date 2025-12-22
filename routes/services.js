import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Service, ServiceCategory } from '../models/Service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// =====================
// SERVICES
// =====================

/**
 * @route GET /api/services
 * @desc Get all services
 */
router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status, category } = req.query;

        const result = await Service.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            status: req.user ? status : 'published',
            categoryId: category
        });

        res.json({
            success: true,
            data: result.services,
            pagination: result.pagination
        });
    })
);

/**
 * @route GET /api/services/featured
 * @desc Get featured services
 */
router.get('/featured',
    asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 6;
        const services = await Service.getFeatured(limit);

        res.json({
            success: true,
            data: services
        });
    })
);

/**
 * @route GET /api/services/:slug
 * @desc Get service by slug
 */
router.get('/:slug',
    asyncHandler(async (req, res) => {
        const service = await Service.findBySlug(req.params.slug);

        if (!service || (service.status !== 'published' && !req.user)) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        res.json({
            success: true,
            data: service
        });
    })
);

/**
 * @route POST /api/services
 * @desc Create a new service
 */
router.post('/',
    authenticate,
    authorize('services', 'create'),
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

        const service = await Service.create(req.body);

        res.status(201).json({
            success: true,
            data: service
        });
    })
);

/**
 * @route PUT /api/services/:id
 * @desc Update a service
 */
router.put('/:id',
    authenticate,
    authorize('services', 'edit'),
    asyncHandler(async (req, res) => {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        const updatedService = await Service.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedService
        });
    })
);

/**
 * @route DELETE /api/services/:id
 * @desc Delete a service
 */
router.delete('/:id',
    authenticate,
    authorize('services', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await Service.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        res.json({
            success: true,
            message: 'Service deleted'
        });
    })
);

// =====================
// CATEGORIES
// =====================

/**
 * @route GET /api/services/categories/all
 * @desc Get all service categories
 */
router.get('/categories/all',
    asyncHandler(async (req, res) => {
        const categories = await ServiceCategory.findAll();

        res.json({
            success: true,
            data: categories
        });
    })
);

/**
 * @route POST /api/services/categories
 * @desc Create a service category
 */
router.post('/categories',
    authenticate,
    authorize('services', 'create'),
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

        const category = await ServiceCategory.create(req.body);

        res.status(201).json({
            success: true,
            data: category
        });
    })
);

/**
 * @route PUT /api/services/categories/:id
 * @desc Update a service category
 */
router.put('/categories/:id',
    authenticate,
    authorize('services', 'edit'),
    asyncHandler(async (req, res) => {
        const category = await ServiceCategory.update(req.params.id, req.body);

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
 * @route DELETE /api/services/categories/:id
 * @desc Delete a service category
 */
router.delete('/categories/:id',
    authenticate,
    authorize('services', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await ServiceCategory.delete(req.params.id);

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
