import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Brand from '../models/Brand.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route GET /api/brands
 * @desc Get all brands for the user
 */
router.get('/',
    authenticate,
    asyncHandler(async (req, res) => {
        const brands = await Brand.findAll(req.user.id);

        res.json({
            success: true,
            data: brands
        });
    })
);

/**
 * @route GET /api/brands/:uuid
 * @desc Get a single brand by UUID
 */
router.get('/:uuid',
    authenticate,
    asyncHandler(async (req, res) => {
        const brand = await Brand.findByUuid(req.params.uuid);

        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        res.json({
            success: true,
            data: brand
        });
    })
);

/**
 * @route POST /api/brands
 * @desc Create a new brand
 */
router.post('/',
    authenticate,
    [
        body('name').notEmpty().trim().withMessage('Brand name is required'),
        body('website').optional().isURL().withMessage('Invalid website URL'),
        body('about').optional().trim()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const brandData = {
            name: req.body.name,
            logoUrl: req.body.logoUrl || null,
            website: req.body.website || null,
            about: req.body.about || null,
            createdBy: req.user.id
        };

        const brand = await Brand.create(brandData);

        res.status(201).json({
            success: true,
            data: brand
        });
    })
);

/**
 * @route PUT /api/brands/:id
 * @desc Update a brand
 */
router.put('/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        const updatedBrand = await Brand.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedBrand
        });
    })
);

/**
 * @route DELETE /api/brands/:id
 * @desc Delete a brand
 */
router.delete('/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const deleted = await Brand.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        res.json({
            success: true,
            message: 'Brand deleted'
        });
    })
);

export default router;
