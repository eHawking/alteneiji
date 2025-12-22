import { query, queryOne, insert, update } from '../config/database.js';
import { hashPassword, comparePassword } from '../config/auth.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Model - Database operations for users
 */
export class User {
    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findById(id) {
        return queryOne(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?`,
            [id]
        );
    }

    /**
     * Find user by UUID
     * @param {string} uuid - User UUID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findByUuid(uuid) {
        return queryOne(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.uuid = ?`,
            [uuid]
        );
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null
     */
    static async findByEmail(email) {
        return queryOne(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ?`,
            [email.toLowerCase()]
        );
    }

    /**
     * Get all users with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Users list with pagination
     */
    static async findAll({ page = 1, limit = 20, role = null, search = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (role) {
            whereClause += ' AND r.name = ?';
            params.push(role);
        }

        if (search) {
            whereClause += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Count total
        const countResult = await queryOne(
            `SELECT COUNT(*) as total 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const users = await query(
            `SELECT u.id, u.uuid, u.email, u.first_name, u.last_name, u.avatar, 
                    u.is_active, u.last_login, u.created_at, r.name as role_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             ${whereClause}
             ORDER BY u.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    static async create(userData) {
        const { email, password, firstName, lastName, roleId = 2 } = userData;

        const hashedPassword = await hashPassword(password);
        const uuid = uuidv4();

        const id = await insert(
            `INSERT INTO users (uuid, email, password, first_name, last_name, role_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuid, email.toLowerCase(), hashedPassword, firstName, lastName, roleId]
        );

        return this.findById(id);
    }

    /**
     * Update user
     * @param {number} id - User ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated user
     */
    static async update(id, updates) {
        const allowedFields = ['email', 'first_name', 'last_name', 'avatar', 'role_id', 'is_active'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        await update(
            `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Update user password
     * @param {number} id - User ID
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} Success status
     */
    static async updatePassword(id, newPassword) {
        const hashedPassword = await hashPassword(newPassword);
        const affected = await update(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return affected > 0;
    }

    /**
     * Verify user credentials
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object|null>} User if valid, null otherwise
     */
    static async verifyCredentials(email, password) {
        const user = await this.findByEmail(email);

        if (!user || !user.is_active) {
            return null;
        }

        const isValid = await comparePassword(password, user.password);

        if (!isValid) {
            return null;
        }

        // Update last login
        await update(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Remove password from returned object
        delete user.password;
        return user;
    }

    /**
     * Delete user
     * @param {number} id - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(id) {
        const affected = await update('DELETE FROM users WHERE id = ?', [id]);
        return affected > 0;
    }

    /**
     * Create initial admin user if none exists
     * @param {string} email - Admin email
     * @param {string} password - Admin password
     */
    static async createInitialAdmin(email, password) {
        // Check if any admin exists
        const existingAdmin = await queryOne(
            `SELECT u.id FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE r.name = 'admin' LIMIT 1`
        );

        if (existingAdmin) {
            return null;
        }

        // Get admin role ID
        const adminRole = await queryOne("SELECT id FROM roles WHERE name = 'admin'");

        if (!adminRole) {
            console.error('Admin role not found');
            return null;
        }

        return this.create({
            email,
            password,
            firstName: 'Admin',
            lastName: 'User',
            roleId: adminRole.id
        });
    }
}

export default User;
