import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Whether passwords match
 */
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {string} JWT token
 */
export function generateToken(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: options.expiresIn || JWT_EXPIRES_IN,
        ...options
    });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
export function decodeToken(token) {
    return jwt.decode(token);
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
export function extractToken(authHeader) {
    if (!authHeader) return null;

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return authHeader;
}

/**
 * Check if a role has permission
 * @param {Object} permissions - Role permissions object
 * @param {string} resource - Resource to check
 * @param {string} action - Action to check (view, create, edit, delete)
 * @returns {boolean} Whether permission is granted
 */
export function hasPermission(permissions, resource, action = 'view') {
    if (!permissions) return false;

    // Admin has all permissions
    if (permissions.all === true) return true;

    // Check specific resource permission
    const resourcePerms = permissions[resource];
    if (!resourcePerms) return false;

    // If resource permission is boolean true, all actions allowed
    if (resourcePerms === true) return true;

    // Check specific action
    if (typeof resourcePerms === 'object') {
        // Check 'own' permission (user can only manage their own content)
        if (resourcePerms.own === true) return true;

        // Check specific action permission
        return resourcePerms[action] === true;
    }

    return false;
}

export default {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    decodeToken,
    extractToken,
    hasPermission,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
