import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { SocialPost, SocialAccount } from '../models/SocialPost.js';
import gemini from '../config/gemini.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// =====================
// SOCIAL POSTS
// =====================

/**
 * @route GET /api/social/posts
 * @desc Get all social posts
 */
router.get('/posts',
    authenticate,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, platform, status } = req.query;

        const result = await SocialPost.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            platform,
            status
        });

        res.json({
            success: true,
            data: result.posts,
            pagination: result.pagination
        });
    })
);

/**
 * @route GET /api/social/posts/:uuid
 * @desc Get a single social post
 */
router.get('/posts/:uuid',
    authenticate,
    asyncHandler(async (req, res) => {
        const post = await SocialPost.findByUuid(req.params.uuid);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        res.json({
            success: true,
            data: post
        });
    })
);

/**
 * @route POST /api/social/posts
 * @desc Create a social post
 */
router.post('/posts',
    authenticate,
    [
        body('platform').isIn(['instagram', 'facebook', 'twitter', 'linkedin', 'youtube']),
        body('content').notEmpty().trim(),
        body('hashtags').optional().isArray(),
        body('scheduledAt').optional().isISO8601()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const postData = {
            ...req.body,
            createdBy: req.user.id
        };

        const post = await SocialPost.create(postData);

        res.status(201).json({
            success: true,
            data: post
        });
    })
);

/**
 * @route POST /api/social/generate-and-create
 * @desc Generate AI content and create posts for multiple platforms
 */
router.post('/generate-and-create',
    authenticate,
    [
        body('topic').notEmpty().withMessage('Topic is required'),
        body('platforms').isArray().withMessage('Platforms must be an array'),
        body('tone').optional().isIn(['professional', 'casual', 'enthusiastic', 'formal']),
        body('schedule').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
        if (!gemini.isConfigured()) {
            throw new AppError('AI service not configured', 503);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { topic, platforms, tone = 'professional', schedule = false, scheduledAt } = req.body;

        // Generate content for all platforms
        const generatedContent = await gemini.generateSocialPost({
            topic,
            platforms,
            tone,
            includeHashtags: true
        });

        // Create posts for each platform
        const createdPosts = [];

        for (const platform of platforms) {
            if (generatedContent[platform]) {
                const platformData = generatedContent[platform];

                const post = await SocialPost.create({
                    platform,
                    content: platformData.content,
                    hashtags: platformData.hashtags || [],
                    aiGenerated: true,
                    aiPrompt: topic,
                    status: schedule ? 'scheduled' : 'draft',
                    scheduledAt: schedule ? scheduledAt : null,
                    createdBy: req.user.id
                });

                createdPosts.push(post);
            }
        }

        res.status(201).json({
            success: true,
            data: {
                generated: generatedContent,
                posts: createdPosts
            }
        });
    })
);

/**
 * @route PUT /api/social/posts/:id
 * @desc Update a social post
 */
router.put('/posts/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const post = await SocialPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const updatedPost = await SocialPost.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedPost
        });
    })
);

/**
 * @route POST /api/social/posts/:id/schedule
 * @desc Schedule a post for publishing
 */
router.post('/posts/:id/schedule',
    authenticate,
    [
        body('scheduledAt').isISO8601().withMessage('Valid date is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const post = await SocialPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const updatedPost = await SocialPost.update(req.params.id, {
            status: 'scheduled',
            scheduledAt: req.body.scheduledAt
        });

        res.json({
            success: true,
            data: updatedPost,
            message: 'Post scheduled successfully'
        });
    })
);

/**
 * @route DELETE /api/social/posts/:id
 * @desc Delete a social post
 */
router.delete('/posts/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const deleted = await SocialPost.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        res.json({
            success: true,
            message: 'Post deleted'
        });
    })
);

// =====================
// SOCIAL ACCOUNTS
// =====================

/**
 * @route GET /api/social/accounts
 * @desc Get all social accounts
 */
router.get('/accounts',
    authenticate,
    asyncHandler(async (req, res) => {
        const accounts = await SocialAccount.findAll();

        res.json({
            success: true,
            data: accounts
        });
    })
);

/**
 * @route POST /api/social/accounts
 * @desc Add a social account
 */
router.post('/accounts',
    authenticate,
    authorize('settings', 'edit'),
    [
        body('platform').isIn(['instagram', 'facebook', 'twitter', 'linkedin', 'youtube']),
        body('accountName').notEmpty()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const account = await SocialAccount.create(req.body);

        res.status(201).json({
            success: true,
            data: account
        });
    })
);

/**
 * @route PUT /api/social/accounts/:id
 * @desc Update a social account
 */
router.put('/accounts/:id',
    authenticate,
    authorize('settings', 'edit'),
    asyncHandler(async (req, res) => {
        const account = await SocialAccount.update(req.params.id, req.body);

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        res.json({
            success: true,
            data: account
        });
    })
);

/**
 * @route DELETE /api/social/accounts/:id
 * @desc Delete a social account
 */
router.delete('/accounts/:id',
    authenticate,
    authorize('settings', 'delete'),
    asyncHandler(async (req, res) => {
        const deleted = await SocialAccount.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        res.json({
            success: true,
            message: 'Account deleted'
        });
    })
);

export default router;
