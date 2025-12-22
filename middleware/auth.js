import { verifyToken, extractToken, hasPermission } from '../config/auth.js';
import { queryOne } from '../config/database.js';

/**
 * Authentication middleware - requires valid JWT token
 */
export async function authenticate(req, res, next) {
    try {
        const token = extractToken(req.headers.authorization) || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const decoded = verifyToken(token);

        // Fetch user from database
        const user = await queryOne(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ? AND u.is_active = TRUE`,
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Parse permissions if it's a string
        if (typeof user.permissions === 'string') {
            user.permissions = JSON.parse(user.permissions);
        }

        // Attach user to request
        req.user = {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role_name,
            permissions: user.permissions || {}
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
}

/**
 * Optional authentication - attaches user if token present, continues if not
 */
export async function optionalAuth(req, res, next) {
    try {
        const token = extractToken(req.headers.authorization) || req.cookies?.token;

        if (token) {
            const decoded = verifyToken(token);
            const user = await queryOne(
                `SELECT u.*, r.name as role_name, r.permissions 
                 FROM users u 
                 LEFT JOIN roles r ON u.role_id = r.id 
                 WHERE u.id = ? AND u.is_active = TRUE`,
                [decoded.userId]
            );

            if (user) {
                if (typeof user.permissions === 'string') {
                    user.permissions = JSON.parse(user.permissions);
                }
                req.user = {
                    id: user.id,
                    uuid: user.uuid,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role_name,
                    permissions: user.permissions || {}
                };
            }
        }
    } catch (error) {
        // Silently continue without user
    }
    next();
}

/**
 * Authorization middleware factory - checks for specific permission
 * @param {string} resource - Resource to check permission for
 * @param {string} action - Action (view, create, edit, delete)
 */
export function authorize(resource, action = 'view') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!hasPermission(req.user.permissions, resource, action)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }

        next();
    };
}

/**
 * Admin only middleware - requires admin role
 */
export function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin' && !req.user.permissions?.all) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }

    next();
}

export default {
    authenticate,
    optionalAuth,
    authorize,
    adminOnly
};
