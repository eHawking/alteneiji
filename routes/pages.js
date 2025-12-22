import { Router } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { Page } from '../models/Page.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * @route GET /api/pages
 * @desc Get all pages (admin) or published pages (public)
 */
router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status, search, menu } = req.query;

        // If requesting menu pages, return only those
        if (menu === 'true') {
            const pages = await Page.getMenuPages();
            return res.json({ success: true, data: pages });
        }

        const result = await Page.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            status: req.user ? status : 'published',
            search,
            showInMenu: null
        });

        res.json({
            success: true,
            data: result.pages,
            pagination: result.pagination
        });
    })
);

/**
 * @route GET /api/pages/:slug
 * @desc Get page by slug
 */
router.get('/:slug',
    asyncHandler(async (req, res) => {
        const page = await Page.findBySlug(req.params.slug);

        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }

        // Check if published or user is admin
        if (page.status !== 'published' && (!req.user || !req.user.permissions?.all)) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }

        res.json({
            success: true,
            data: page
        });
    })
);

/**
 * @route POST /api/pages
 * @desc Create a new page
 */
router.post('/',
    authenticate,
    authorize('pages', 'create'),
    [
        body('slug').notEmpty().trim().toLowerCase().matches(/^[a-z0-9-]+$/),
        body('title').notEmpty().trim(),
        body('content').optional(),
        body('template').optional().isIn(['default', 'home', 'landing', 'contact']),
        body('status').optional().isIn(['draft', 'published', 'archived'])
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const pageData = {
            ...req.body,
            authorId: req.user.id
        };

        const page = await Page.create(pageData);

        res.status(201).json({
            success: true,
            data: page
        });
    })
);

/**
 * @route PUT /api/pages/:id
 * @desc Update a page
 */
router.put('/:id',
    authenticate,
    authorize('pages', 'edit'),
    asyncHandler(async (req, res) => {
        const page = await Page.findById(req.params.id);

        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }

        const updatedPage = await Page.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedPage
        });
    })
);

/**
 * @route POST /api/pages/:id/sections
 * @desc Add or update page section
 */
router.post('/:id/sections',
    authenticate,
    authorize('pages', 'edit'),
    [
        body('sectionType').notEmpty(),
        body('content').isObject()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const page = await Page.findById(req.params.id);
        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }

        const section = await Page.upsertSection(req.params.id, req.body);

        res.json({
            success: true,
            data: section
        });
    })
);

/**
 * @route DELETE /api/pages/:id/sections/:sectionId
 * @desc Delete page section
 */
router.delete('/:id/sections/:sectionId',
    authenticate,
    authorize('pages', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await Page.deleteSection(req.params.id, req.params.sectionId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Section not found'
            });
        }

        res.json({
            success: true,
            message: 'Section deleted'
        });
    })
);

/**
 * @route DELETE /api/pages/:id
 * @desc Delete a page
 */
router.delete('/:id',
    authenticate,
    authorize('pages', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await Page.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }

        res.json({
            success: true,
            message: 'Page deleted'
        });
    })
);

export default router;
