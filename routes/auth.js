import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { generateToken } from '../config/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Login user
 */
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty().isLength({ min: 6 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;
        const user = await User.verifyCredentials(email, password);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role_name
        });

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.uuid,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role_name
                }
            }
        });
    })
);

/**
 * @route POST /api/auth/register
 * @desc Register new user (admin only in production)
 */
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').optional().trim().escape(),
        body('lastName').optional().trim().escape()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, firstName, lastName } = req.body;

        // Check if email exists
        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const user = await User.create({
            email,
            password,
            firstName,
            lastName
        });

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role_name
        });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.uuid,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role_name
                }
            }
        });
    })
);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.json({
        success: true,
        data: {
            id: user.uuid,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            avatar: user.avatar,
            role: user.role_name,
            lastLogin: user.last_login
        }
    });
}));

/**
 * @route PUT /api/auth/password
 * @desc Update password
 */
router.put('/password',
    authenticate,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 8 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const user = await User.verifyCredentials(req.user.email, currentPassword);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        await User.updatePassword(req.user.id, newPassword);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    })
);

/**
 * @route POST /api/auth/logout
 * @desc Logout (client-side token removal)
 */
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

export default router;
