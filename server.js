import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import pagesRoutes from './routes/pages.js';
import productsRoutes from './routes/products.js';
import servicesRoutes from './routes/services.js';
import aiRoutes from './routes/ai.js';
import socialRoutes from './routes/social.js';
import adminRoutes from './routes/admin.js';
import brandsRoutes from './routes/brands.js';
import inboxRoutes from './routes/inbox.js';
import channelsRoutes from './routes/channels.js';
import agentsRoutes from './routes/agents.js';

// Import middleware
import { optionalAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import database and models
import db from './config/database.js';
import { User } from './models/User.js';
import { Settings, ContactSubmission, GulfoodRegistration } from './models/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARE
// =====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.SITE_URL
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional auth for all routes (attaches user if logged in)
app.use(optionalAuth);

// =====================
// API ROUTES
// =====================

app.use('/api/auth', authRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/agents', agentsRoutes);

// =====================
// PUBLIC API ENDPOINTS
// =====================

/**
 * @route GET /api/site-info
 * @desc Get public site information
 */
app.get('/api/site-info', async (req, res) => {
    try {
        const siteInfo = await Settings.getSiteInfo();
        res.json({
            success: true,
            data: siteInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load site information'
        });
    }
});

/**
 * @route POST /api/contact
 * @desc Submit contact form
 */
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, company, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required'
            });
        }

        const submission = await ContactSubmission.create({
            name,
            email,
            phone,
            company,
            subject,
            message,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for your message. We will get back to you soon!'
        });
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit contact form'
        });
    }
});

/**
 * @route POST /api/gulfood/register
 * @desc Submit Gulfood 2026 registration
 */
app.post('/api/gulfood/register', async (req, res) => {
    try {
        const { name, email, phone, company, country, interestAreas, message } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Name and email are required'
            });
        }

        const registration = await GulfoodRegistration.create({
            name,
            email,
            phone,
            company,
            country,
            interestAreas,
            message
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for registering! We will contact you with Gulfood 2026 details soon.'
        });
    } catch (error) {
        console.error('Gulfood registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit registration'
        });
    }
});

// =====================
// FRONTEND ROUTES
// =====================

// Admin SPA
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Public pages (SPA fallback)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================
// ERROR HANDLING
// =====================

app.use(notFoundHandler);
app.use(errorHandler);

// =====================
// SERVER STARTUP
// =====================

async function startServer() {
    try {
        // Test database connection
        const dbConnected = await db.testConnection();

        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            console.log('Please ensure MariaDB is running and .env file is configured correctly.');
            console.log('Run the schema.sql file to create the database and tables.');
            process.exit(1);
        }

        console.log('✅ Database connected');

        // Create initial admin user if none exists
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@alteneijigroup.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

        const admin = await User.createInitialAdmin(adminEmail, adminPassword);
        if (admin) {
            console.log(`✅ Initial admin user created: ${adminEmail}`);
        }

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🏢 ALTENEIJI GROUP - Premium Website Server         ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   🌐 Website:     http://localhost:${PORT}                   ║
║   🔧 Admin Panel: http://localhost:${PORT}/admin             ║
║   📡 API:         http://localhost:${PORT}/api               ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

startServer();

export default app;
