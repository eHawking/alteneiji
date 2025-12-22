import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import gemini from '../config/gemini.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { query, insert } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @route GET /api/ai/status
 * @desc Check AI service status
 */
router.get('/status',
    authenticate,
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                configured: gemini.isConfigured(),
                model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
            }
        });
    })
);

/**
 * @route POST /api/ai/seo/generate
 * @desc Generate SEO metadata for content
 */
router.post('/seo/generate',
    authenticate,
    [
        body('content').notEmpty().withMessage('Content is required'),
        body('contentType').optional().isIn(['page', 'product', 'service', 'blog'])
    ],
    asyncHandler(async (req, res) => {
        if (!gemini.isConfigured()) {
            throw new AppError('AI service not configured. Please add GEMINI_API_KEY to .env file.', 503);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { content, contentType = 'page', targetId = null, targetType = null } = req.body;

        const seoData = await gemini.generateSEO(content, contentType);

        // Store task in database if target specified
        if (targetId && targetType) {
            const uuid = uuidv4();
            await insert(
                `INSERT INTO ai_seo_tasks 
                 (uuid, target_type, target_id, task_type, input_content, ai_response, status, created_by, completed_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
                [uuid, targetType, targetId, 'meta_tags', content.substring(0, 1000), JSON.stringify(seoData), req.user.id]
            );
        }

        res.json({
            success: true,
            data: seoData
        });
    })
);

/**
 * @route POST /api/ai/seo/analyze
 * @desc Analyze content for SEO optimization
 */
router.post('/seo/analyze',
    authenticate,
    [
        body('content').notEmpty().withMessage('Content is required')
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

        const { content } = req.body;
        const analysis = await gemini.analyzeContent(content);

        res.json({
            success: true,
            data: analysis
        });
    })
);

/**
 * @route POST /api/ai/social/generate
 * @desc Generate social media posts
 */
router.post('/social/generate',
    authenticate,
    [
        body('topic').notEmpty().withMessage('Topic is required'),
        body('platforms').optional().isArray(),
        body('tone').optional().isIn(['professional', 'casual', 'enthusiastic', 'formal'])
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

        const { topic, platforms, tone = 'professional', includeHashtags = true } = req.body;

        const posts = await gemini.generateSocialPost({
            topic,
            platforms: platforms || ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'],
            tone,
            includeHashtags
        });

        res.json({
            success: true,
            data: posts
        });
    })
);

/**
 * @route POST /api/ai/marketing/campaign
 * @desc Generate marketing campaign ideas
 */
router.post('/marketing/campaign',
    authenticate,
    [
        body('goal').notEmpty().withMessage('Campaign goal is required'),
        body('targetAudience').notEmpty().withMessage('Target audience is required'),
        body('budget').optional().isIn(['low', 'medium', 'high']),
        body('duration').optional()
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

        const { goal, targetAudience, budget = 'medium', duration = '1 month' } = req.body;

        const campaign = await gemini.generateMarketingCampaign({
            goal,
            targetAudience,
            budget,
            duration
        });

        // Store campaign in database
        const uuid = uuidv4();
        await insert(
            `INSERT INTO ai_marketing_campaigns 
             (uuid, name, campaign_type, target_audience, goals, ai_suggestions, status, created_by) 
             VALUES (?, ?, 'ai_generated', ?, ?, ?, 'draft', ?)`,
            [uuid, campaign.campaign_name || 'AI Generated Campaign', targetAudience, goal, JSON.stringify(campaign), req.user.id]
        );

        res.json({
            success: true,
            data: campaign
        });
    })
);

/**
 * @route POST /api/ai/content/optimize
 * @desc Optimize content with AI suggestions
 */
router.post('/content/optimize',
    authenticate,
    [
        body('content').notEmpty().withMessage('Content is required')
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

        const { content } = req.body;
        const analysis = await gemini.analyzeContent(content);

        res.json({
            success: true,
            data: analysis
        });
    })
);

/**
 * @route GET /api/ai/seo/history
 * @desc Get SEO task history
 */
router.get('/seo/history',
    authenticate,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await query(
            `SELECT uuid, target_type, target_id, task_type, status, applied, created_at, completed_at 
             FROM ai_seo_tasks 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: tasks
        });
    })
);

/**
 * @route GET /api/ai/marketing/campaigns
 * @desc Get marketing campaigns
 */
router.get('/marketing/campaigns',
    authenticate,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const campaigns = await query(
            `SELECT uuid, name, campaign_type, target_audience, goals, status, created_at 
             FROM ai_marketing_campaigns 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: campaigns
        });
    })
);

export default router;
