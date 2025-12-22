import { query, queryOne, insert, update } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * SocialPost Model - Database operations for social media posts
 */
export class SocialPost {
    /**
     * Find post by ID
     */
    static async findById(id) {
        const post = await queryOne('SELECT * FROM social_posts WHERE id = ?', [id]);
        if (post) {
            post.hashtags = typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags;
            post.media_urls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
        }
        return post;
    }

    /**
     * Find post by UUID
     */
    static async findByUuid(uuid) {
        const post = await queryOne('SELECT * FROM social_posts WHERE uuid = ?', [uuid]);
        if (post) {
            post.hashtags = typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags;
            post.media_urls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
        }
        return post;
    }

    /**
     * Get all posts with pagination and filters
     */
    static async findAll({ page = 1, limit = 20, platform = null, status = null }) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (platform) {
            whereClause += ' AND platform = ?';
            params.push(platform);
        }

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM social_posts ${whereClause}`,
            params
        );
        const total = Number(countResult.total);

        const offset = (page - 1) * limit;
        const posts = await query(
            `SELECT * FROM social_posts 
             ${whereClause}
             ORDER BY scheduled_at DESC, created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Parse JSON fields
        posts.forEach(post => {
            post.hashtags = typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags;
            post.media_urls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
        });

        return {
            posts,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get scheduled posts
     */
    static async getScheduled() {
        const posts = await query(
            `SELECT * FROM social_posts 
             WHERE status = 'scheduled' AND scheduled_at <= NOW()
             ORDER BY scheduled_at ASC`
        );

        posts.forEach(post => {
            post.hashtags = typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags;
            post.media_urls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
        });

        return posts;
    }

    /**
     * Create a new social post
     */
    static async create(postData) {
        const {
            platform, content, hashtags = [], mediaUrls = [],
            aiGenerated = false, aiPrompt = null,
            status = 'draft', scheduledAt = null, createdBy = null
        } = postData;

        const uuid = uuidv4();
        const id = await insert(
            `INSERT INTO social_posts 
             (uuid, platform, content, hashtags, media_urls, ai_generated, ai_prompt, 
              status, scheduled_at, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuid, platform, content,
                JSON.stringify(hashtags), JSON.stringify(mediaUrls),
                aiGenerated, aiPrompt, status, scheduledAt, createdBy
            ]
        );

        return this.findById(id);
    }

    /**
     * Update post
     */
    static async update(id, updates) {
        const allowedFields = [
            'content', 'hashtags', 'media_urls', 'status', 'scheduled_at',
            'posted_at', 'post_id', 'error_message', 'likes', 'comments', 'shares'
        ];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                if (['hashtags', 'media_urls'].includes(dbKey) && value) {
                    params.push(JSON.stringify(value));
                } else {
                    params.push(value);
                }
            }
        }

        if (setClause.length === 0) return this.findById(id);

        params.push(id);
        await update(`UPDATE social_posts SET ${setClause.join(', ')} WHERE id = ?`, params);
        return this.findById(id);
    }

    /**
     * Mark post as posted
     */
    static async markAsPosted(id, postId = null) {
        await update(
            `UPDATE social_posts SET status = 'posted', posted_at = NOW(), post_id = ? WHERE id = ?`,
            [postId, id]
        );
        return this.findById(id);
    }

    /**
     * Mark post as failed
     */
    static async markAsFailed(id, errorMessage) {
        await update(
            `UPDATE social_posts SET status = 'failed', error_message = ? WHERE id = ?`,
            [errorMessage, id]
        );
        return this.findById(id);
    }

    /**
     * Delete post
     */
    static async delete(id) {
        const affected = await update('DELETE FROM social_posts WHERE id = ?', [id]);
        return affected > 0;
    }
}

/**
 * SocialAccount Model
 */
export class SocialAccount {
    static async findAll() {
        return query('SELECT id, platform, account_name, account_id, is_active, created_at FROM social_accounts');
    }

    static async findByPlatform(platform) {
        return queryOne(
            'SELECT * FROM social_accounts WHERE platform = ? AND is_active = TRUE',
            [platform]
        );
    }

    static async create(accountData) {
        const { platform, accountName, accountId, accessToken, refreshToken, tokenExpiresAt } = accountData;
        const id = await insert(
            `INSERT INTO social_accounts 
             (platform, account_name, account_id, access_token, refresh_token, token_expires_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [platform, accountName, accountId, accessToken, refreshToken, tokenExpiresAt]
        );
        return queryOne('SELECT * FROM social_accounts WHERE id = ?', [id]);
    }

    static async update(id, updates) {
        const allowedFields = ['account_name', 'account_id', 'access_token', 'refresh_token', 'token_expires_at', 'is_active'];
        const setClause = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) return null;
        params.push(id);
        await update(`UPDATE social_accounts SET ${setClause.join(', ')} WHERE id = ?`, params);
        return queryOne('SELECT * FROM social_accounts WHERE id = ?', [id]);
    }

    static async delete(id) {
        const affected = await update('DELETE FROM social_accounts WHERE id = ?', [id]);
        return affected > 0;
    }
}

export default { SocialPost, SocialAccount };
