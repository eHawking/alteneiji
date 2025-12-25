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
        // Check if configured via env
        let configured = gemini.isConfigured();

        // If not, check database for saved key
        if (!configured) {
            try {
                const dbResults = await query(
                    "SELECT value FROM settings WHERE `key` = 'gemini_api_key' LIMIT 1"
                );
                if (dbResults && dbResults.length > 0 && dbResults[0].value) {
                    configured = true;
                }
            } catch (err) {
                // Database might not have this setting yet
            }
        }

        res.json({
            success: true,
            data: {
                configured: configured,
                model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
            }
        });
    })
);

/**
 * @route POST /api/ai/test-connection
 * @desc Test Gemini API connection with provided key
 */
router.post('/test-connection',
    authenticate,
    [
        body('apiKey').notEmpty().withMessage('API key is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { apiKey } = req.body;

        try {
            // Test the API key by making a simple request to Gemini
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const testClient = new GoogleGenerativeAI(apiKey);
            const model = testClient.getGenerativeModel({ model: 'gemini-2.0-flash' });

            // Simple test prompt
            const result = await model.generateContent('Say "API Connected" in one word.');
            const response = await result.response;
            const text = response.text();

            res.json({
                success: true,
                message: 'Gemini API connection successful!',
                testResponse: text.substring(0, 50)
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to connect to Gemini API'
            });
        }
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
        if (!(await gemini.isConfigured())) {
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
        if (!(await gemini.isConfigured())) {
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
 * @desc Generate social media posts with optional images
 */
router.post('/social/generate',
    authenticate,
    [
        body('topic').notEmpty().withMessage('Topic is required'),
        body('platforms').optional().isArray(),
        body('tone').optional().isIn(['professional', 'casual', 'enthusiastic', 'formal']),
        body('generateImages').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
        if (!(await gemini.isConfigured())) {
            throw new AppError('AI service not configured', 503);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { topic, platforms, tone = 'professional', includeHashtags = true, generateImages = true } = req.body;
        const fs = await import('fs');
        const path = await import('path');

        // Generate text posts
        const posts = await gemini.generateSocialPost({
            topic,
            platforms: platforms || ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'],
            tone,
            includeHashtags
        });

        // Generate images for each platform if requested
        if (generateImages) {
            for (const [platform, data] of Object.entries(posts)) {
                if (data && data.content) {
                    try {
                        const imageResult = await gemini.generateImage(
                            `${topic} - for ${platform} social media post`
                        );

                        if (imageResult && imageResult.base64) {
                            // Save image to uploads folder
                            const timestamp = Date.now();
                            const filename = `social-${platform}-${timestamp}.png`;
                            const uploadsDir = path.default.join(process.cwd(), 'uploads', 'social');

                            // Create directory if not exists
                            if (!fs.default.existsSync(uploadsDir)) {
                                fs.default.mkdirSync(uploadsDir, { recursive: true });
                            }

                            const filePath = path.default.join(uploadsDir, filename);
                            fs.default.writeFileSync(filePath, Buffer.from(imageResult.base64, 'base64'));

                            // Add image URL to post data
                            posts[platform].imageUrl = `/uploads/social/${filename}`;
                        }
                    } catch (imgError) {
                        console.error(`Failed to generate image for ${platform}:`, imgError);
                        // Continue without image
                    }
                }
            }
        }

        res.json({
            success: true,
            data: posts
        });
    })
);

/**
 * @route POST /api/ai/social/generate-single
 * @desc Generate social media post for a single platform with image
 */
router.post('/social/generate-single',
    authenticate,
    [
        body('topic').notEmpty().withMessage('Topic is required'),
        body('platform').notEmpty().withMessage('Platform is required'),
        body('tone').optional().isIn(['professional', 'casual', 'enthusiastic', 'formal']),
        body('generateImages').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
        if (!(await gemini.isConfigured())) {
            throw new AppError('AI service not configured', 503);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { topic, platform, tone = 'professional', generateImages = true } = req.body;
        const fs = await import('fs');
        const path = await import('path');

        console.log(`Generating ${platform} post for: ${topic.substring(0, 50)}...`);

        // Generate text for single platform
        const posts = await gemini.generateSocialPost({
            topic,
            platforms: [platform],
            tone,
            includeHashtags: true
        });

        const data = posts[platform] || { content: 'Failed to generate content', hashtags: [] };

        // Generate image if requested
        if (generateImages && data.content) {
            try {
                console.log(`Generating image for ${platform}...`);
                const imageResult = await gemini.generateImage(
                    `${topic} - professional ${platform} marketing`
                );

                if (imageResult && imageResult.base64) {
                    const timestamp = Date.now();
                    const filename = `social-${platform}-${timestamp}.png`;
                    const uploadsDir = path.default.join(process.cwd(), 'uploads', 'social');

                    if (!fs.default.existsSync(uploadsDir)) {
                        fs.default.mkdirSync(uploadsDir, { recursive: true });
                    }

                    const filePath = path.default.join(uploadsDir, filename);
                    fs.default.writeFileSync(filePath, Buffer.from(imageResult.base64, 'base64'));

                    data.imageUrl = `/uploads/social/${filename}`;
                    console.log(`Image saved: ${filename}`);
                } else {
                    console.log('No image generated');
                }
            } catch (imgError) {
                console.error(`Image generation failed:`, imgError.message);
            }
        }

        res.json({
            success: true,
            data: data
        });
    })
);

/**
 * @route POST /api/ai/regenerate-image
 * @desc Regenerate image for a specific platform with custom prompt
 */
router.post('/regenerate-image',
    authenticate,
    [
        body('platform').notEmpty().withMessage('Platform is required'),
        body('prompt').optional()
    ],
    asyncHandler(async (req, res) => {
        if (!(await gemini.isConfigured())) {
            throw new AppError('AI service not configured', 503);
        }

        const { platform, prompt } = req.body;
        const fs = await import('fs');
        const path = await import('path');

        console.log(`Regenerating image for ${platform}:`, prompt?.substring(0, 50));

        try {
            const imageResult = await gemini.generateImage(
                `${prompt || 'professional marketing image'} - ${platform} social media`
            );

            if (imageResult && imageResult.base64) {
                const timestamp = Date.now();
                const filename = `social-${platform}-regen-${timestamp}.png`;
                const uploadsDir = path.default.join(process.cwd(), 'uploads', 'social');

                if (!fs.default.existsSync(uploadsDir)) {
                    fs.default.mkdirSync(uploadsDir, { recursive: true });
                }

                const filePath = path.default.join(uploadsDir, filename);
                fs.default.writeFileSync(filePath, Buffer.from(imageResult.base64, 'base64'));

                // Track usage
                await gemini.trackUsage({
                    userId: req.user?.id,
                    operation: 'image_regeneration',
                    model: 'gemini-2.5-flash-image',
                    imagesGenerated: 1,
                    summary: `Regenerated ${platform}: ${prompt?.substring(0, 30) || 'auto'}`
                });

                res.json({
                    success: true,
                    data: { imageUrl: `/uploads/social/${filename}` }
                });
            } else {
                throw new AppError('Image generation returned no data', 500);
            }
        } catch (error) {
            console.error('Image regeneration failed:', error.message);
            throw new AppError('Failed to regenerate image: ' + error.message, 500);
        }
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
        if (!(await gemini.isConfigured())) {
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
        if (!(await gemini.isConfigured())) {
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

/**
 * @route POST /api/ai/video/generate
 * @desc Generate marketing video using AI (Sora 2, Veo 3.1, Pippit AI)
 */
router.post('/video/generate',
    authenticate,
    [
        body('prompt').notEmpty().withMessage('Video description is required'),
        body('platform').isIn(['sora', 'veo', 'pippit']).withMessage('Invalid platform'),
        body('style').optional(),
        body('duration').optional().isInt({ min: 5, max: 60 }),
        body('aspectRatio').optional()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { prompt, platform, style, duration = 15, aspectRatio = '16:9', options = {} } = req.body;

        // Store video generation job
        const uuid = uuidv4();
        await insert(
            `INSERT INTO ai_video_jobs 
             (uuid, platform, prompt, style, duration, aspect_ratio, options, status, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?)`,
            [uuid, platform, prompt, style, duration, aspectRatio, JSON.stringify(options), req.user.id]
        );

        // Note: Actual video generation would integrate with respective APIs
        // Sora 2: OpenAI's video generation API
        // Veo 3.1: Google's video generation API  
        // Pippit: Pippit AI's marketing video API

        // For now, return job ID for status polling
        res.json({
            success: true,
            data: {
                jobId: uuid,
                message: `Video generation started with ${platform}. This may take a few minutes.`,
                estimatedTime: duration <= 15 ? '2-3 minutes' : duration <= 30 ? '4-5 minutes' : '5-8 minutes'
            }
        });
    })
);

/**
 * @route GET /api/ai/video/status/:jobId
 * @desc Check video generation status
 */
router.get('/video/status/:jobId',
    authenticate,
    asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        const jobs = await query(
            `SELECT uuid, platform, status, video_url, thumbnail_url, error, created_at, completed_at 
             FROM ai_video_jobs WHERE uuid = ?`,
            [jobId]
        );

        if (!jobs || jobs.length === 0) {
            throw new AppError('Video job not found', 404);
        }

        res.json({
            success: true,
            data: {
                status: jobs[0].status,
                videoUrl: jobs[0].video_url,
                thumbnailUrl: jobs[0].thumbnail_url,
                error: jobs[0].error,
                createdAt: jobs[0].created_at,
                completedAt: jobs[0].completed_at
            }
        });
    })
);

/**
 * @route GET /api/ai/video/recent
 * @desc Get recent video generation jobs
 */
router.get('/video/recent',
    authenticate,
    asyncHandler(async (req, res) => {
        const { limit = 10 } = req.query;

        const videos = await query(
            `SELECT uuid, platform, prompt, style, duration, aspect_ratio, status, video_url, thumbnail_url, created_at 
             FROM ai_video_jobs 
             WHERE created_by = ? AND status = 'completed'
             ORDER BY created_at DESC 
             LIMIT ?`,
            [req.user.id, parseInt(limit)]
        );

        res.json({
            success: true,
            data: videos.map(v => ({
                ...v,
                thumbnailUrl: v.thumbnail_url,
                videoUrl: v.video_url,
                aspectRatio: v.aspect_ratio
            }))
        });
    })
);

export default router;

