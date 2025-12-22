import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alteneiji_db',
    connectionLimit: 10,
    acquireTimeout: 30000,
    connectTimeout: 10000,
    idleTimeout: 60000,
    resetAfterUse: false
});

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function query(sql, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(sql, params);
        return result;
    } catch (err) {
        console.error('Database error:', err);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Execute a single query and return first result
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single result or null
 */
export async function queryOne(sql, params = []) {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Execute an insert and return the inserted ID
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Inserted ID
 */
export async function insert(sql, params = []) {
    const result = await query(sql, params);
    return result.insertId ? Number(result.insertId) : null;
}

/**
 * Execute an update and return affected rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Affected rows count
 */
export async function update(sql, params = []) {
    const result = await query(sql, params);
    return result.affectedRows || 0;
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async callback receiving connection
 * @returns {Promise<any>} Transaction result
 */
export async function transaction(callback) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (err) {
        if (conn) await conn.rollback();
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
export async function testConnection() {
    try {
        const result = await query('SELECT 1 as test');
        return result && result[0]?.test === 1;
    } catch (err) {
        console.error('Database connection failed:', err.message);
        return false;
    }
}

/**
 * Close all connections in the pool
 */
export async function closePool() {
    await pool.end();
}

export default {
    pool,
    query,
    queryOne,
    insert,
    update,
    transaction,
    testConnection,
    closePool
};
