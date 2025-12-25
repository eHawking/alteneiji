import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { Settings, ContactSubmission, GulfoodRegistration } from '../models/Settings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

/**
 * @route GET /api/admin/dashboard
 * @desc Get dashboard statistics
 */
router.get('/dashboard',
    authenticate,
    asyncHandler(async (req, res) => {
        const { query } = await import('../config/database.js');

        // Get counts
        const [
            usersCount,
            pagesCount,
            productsCount,
            servicesCount,
            contactsCount,
            gulfoodCount,
            socialPostsCount
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query("SELECT COUNT(*) as count FROM pages WHERE status = 'published'"),
            query("SELECT COUNT(*) as count FROM products WHERE status = 'published'"),
            query("SELECT COUNT(*) as count FROM services WHERE status = 'published'"),
            query("SELECT COUNT(*) as count FROM contact_submissions WHERE status = 'new'"),
            query("SELECT COUNT(*) as count FROM gulfood_registrations WHERE status = 'pending'"),
            query("SELECT COUNT(*) as count FROM social_posts WHERE status = 'scheduled'")
        ]);

        // Recent activity
        const recentContacts = await query(
            `SELECT uuid, name, email, subject, status, created_at 
             FROM contact_submissions 
             ORDER BY created_at DESC LIMIT 5`
        );

        const recentPosts = await query(
            `SELECT uuid, platform, content, status, scheduled_at, created_at 
             FROM social_posts 
             ORDER BY created_at DESC LIMIT 5`
        );

        res.json({
            success: true,
            data: {
                stats: {
                    users: Number(usersCount[0].count),
                    pages: Number(pagesCount[0].count),
                    products: Number(productsCount[0].count),
                    services: Number(servicesCount[0].count),
                    newContacts: Number(contactsCount[0].count),
                    pendingGulfood: Number(gulfoodCount[0].count),
                    scheduledPosts: Number(socialPostsCount[0].count)
                },
                recent: {
                    contacts: recentContacts,
                    socialPosts: recentPosts
                }
            }
        });
    })
);

// =====================
// USER MANAGEMENT
// =====================

/**
 * @route GET /api/admin/users
 * @desc Get all users
 */
router.get('/users',
    authenticate,
    adminOnly,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, role, search } = req.query;

        const result = await User.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            role,
            search
        });

        res.json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    })
);

/**
 * @route POST /api/admin/users
 * @desc Create a new user
 */
router.post('/users',
    authenticate,
    adminOnly,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
        body('roleId').optional().isInt()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const user = await User.create(req.body);

        res.status(201).json({
            success: true,
            data: user
        });
    })
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Update a user
 */
router.put('/users/:id',
    authenticate,
    adminOnly,
    asyncHandler(async (req, res) => {
        const user = await User.update(req.params.id, req.body);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    })
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user
 */
router.delete('/users/:id',
    authenticate,
    adminOnly,
    asyncHandler(async (req, res) => {
        if (req.params.id == req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        const deleted = await User.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted'
        });
    })
);

// =====================
// SETTINGS
// =====================

/**
 * @route GET /api/admin/settings
 * @desc Get all settings
 */
router.get('/settings',
    authenticate,
    asyncHandler(async (req, res) => {
        const { category } = req.query;

        const settings = category
            ? await Settings.getByCategory(category)
            : await Settings.getAll();

        res.json({
            success: true,
            data: settings
        });
    })
);

/**
 * @route PUT /api/admin/settings
 * @desc Update settings
 */
router.put('/settings',
    authenticate,
    adminOnly,
    asyncHandler(async (req, res) => {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Settings object required'
            });
        }

        for (const [key, value] of Object.entries(settings)) {
            await Settings.set(key, value);
        }

        const updatedSettings = await Settings.getAll();

        res.json({
            success: true,
            data: updatedSettings
        });
    })
);

/**
 * @route POST /api/admin/settings/api-key
 * @desc Save API key to settings
 */
router.post('/settings/api-key',
    authenticate,
    adminOnly,
    [
        body('key').notEmpty().withMessage('Setting key is required'),
        body('value').notEmpty().withMessage('Setting value is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { key, value } = req.body;

        // Save to database settings
        await Settings.set(key, value, 'api');

        // Update environment variable in memory for immediate use
        if (key === 'gemini_api_key') {
            process.env.GEMINI_API_KEY = value;
        }

        res.json({
            success: true,
            message: 'API key saved successfully'
        });
    })
);

// =====================
// CONTACT SUBMISSIONS
// =====================

/**
 * @route GET /api/admin/contacts
 * @desc Get contact submissions
 */
router.get('/contacts',
    authenticate,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;

        const result = await ContactSubmission.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            status
        });

        res.json({
            success: true,
            data: result.submissions,
            pagination: result.pagination
        });
    })
);

/**
 * @route PUT /api/admin/contacts/:id/status
 * @desc Update contact status
 */
router.put('/contacts/:id/status',
    authenticate,
    [
        body('status').isIn(['new', 'read', 'replied', 'archived'])
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const submission = await ContactSubmission.updateStatus(req.params.id, req.body.status);

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        res.json({
            success: true,
            data: submission
        });
    })
);

/**
 * @route DELETE /api/admin/contacts/:id
 * @desc Delete contact submission
 */
router.delete('/contacts/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const deleted = await ContactSubmission.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        res.json({
            success: true,
            message: 'Submission deleted'
        });
    })
);

// =====================
// GULFOOD REGISTRATIONS
// =====================

/**
 * @route GET /api/admin/gulfood
 * @desc Get Gulfood registrations
 */
router.get('/gulfood',
    authenticate,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;

        const result = await GulfoodRegistration.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            status
        });

        res.json({
            success: true,
            data: result.registrations,
            pagination: result.pagination
        });
    })
);

/**
 * @route PUT /api/admin/gulfood/:id/status
 * @desc Update Gulfood registration status
 */
router.put('/gulfood/:id/status',
    authenticate,
    [
        body('status').isIn(['pending', 'confirmed', 'cancelled'])
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const registration = await GulfoodRegistration.updateStatus(req.params.id, req.body.status);

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        res.json({
            success: true,
            data: registration
        });
    })
);

// =====================
// BILLING & USAGE
// =====================

/**
 * @route GET /api/admin/billing
 * @desc Get billing and usage statistics
 */
router.get('/billing',
    authenticate,
    asyncHandler(async (req, res) => {
        const gemini = await import('../config/gemini.js');
        const period = req.query.period || 'month';

        // Access via default export or named export
        const getUsageStats = gemini.getUsageStats || gemini.default?.getUsageStats;

        if (!getUsageStats) {
            return res.json({
                success: true,
                data: {
                    period,
                    summary: {
                        totalRequests: 0,
                        totalInputTokens: 0,
                        totalOutputTokens: 0,
                        totalImages: 0,
                        baseCost: 0,
                        totalBilled: 0,
                        markupPercent: 50
                    },
                    recentActivity: [],
                    byOperation: []
                }
            });
        }

        const stats = await getUsageStats(period);

        res.json({
            success: true,
            data: {
                period,
                summary: {
                    totalRequests: parseInt(stats.summary?.total_requests) || 0,
                    totalInputTokens: parseInt(stats.summary?.total_input_tokens) || 0,
                    totalOutputTokens: parseInt(stats.summary?.total_output_tokens) || 0,
                    totalImages: parseInt(stats.summary?.total_images) || 0,
                    baseCost: parseFloat(stats.summary?.total_base_cost) || 0,
                    totalBilled: parseFloat(stats.summary?.total_billed) || 0,
                    markupPercent: 50
                },
                recentActivity: stats.recent || [],
                byOperation: stats.byOperation || []
            }
        });
    })
);

/**
 * @route GET /api/admin/billing/history
 * @desc Get billing history
 */
router.get('/billing/history',
    authenticate,
    asyncHandler(async (req, res) => {
        const { query } = await import('../config/database.js');

        const history = await query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as requests,
                SUM(input_tokens) as input_tokens,
                SUM(output_tokens) as output_tokens,
                SUM(images_generated) as images,
                SUM(base_cost) as base_cost,
                SUM(total_cost) as total_billed
            FROM api_usage
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `);

        res.json({
            success: true,
            data: history
        });
    })
);

/**
 * @route GET /api/uploads/list
 * @desc List uploaded files for media library
 */
router.get('/uploads/list',
    authenticate,
    asyncHandler(async (req, res) => {
        const fs = await import('fs');
        const path = await import('path');

        const folder = req.query.folder || 'social';
        const uploadsDir = path.default.join(process.cwd(), 'uploads', folder);

        if (!fs.default.existsSync(uploadsDir)) {
            return res.json({ success: true, data: [] });
        }

        const files = fs.default.readdirSync(uploadsDir)
            .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
            .map(file => ({
                name: file,
                url: `/uploads/${folder}/${file}`,
                created: fs.default.statSync(path.default.join(uploadsDir, file)).mtime
            }))
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json({
            success: true,
            data: files
        });
    })
);

export default router;
