-- Alteneiji Group Database Schema
-- MariaDB 11.4.9

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS alteneiji_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alteneiji_db;

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar VARCHAR(500),
    role_id INT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- CONTENT MANAGEMENT
-- ============================================

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    template VARCHAR(100) DEFAULT 'default',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    author_id INT,
    -- SEO Fields
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords VARCHAR(500),
    og_title VARCHAR(255),
    og_description TEXT,
    og_image VARCHAR(500),
    schema_markup JSON,
    -- Settings
    show_in_menu BOOLEAN DEFAULT FALSE,
    menu_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Page sections for modular content
CREATE TABLE IF NOT EXISTS page_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content JSON,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- PRODUCTS & SERVICES
-- ============================================

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),
    parent_id INT,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    description LONGTEXT,
    category_id INT,
    featured_image VARCHAR(500),
    gallery JSON,
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- Status
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    description LONGTEXT,
    category_id INT,
    icon VARCHAR(100),
    featured_image VARCHAR(500),
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- Status
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- BLOG
-- ============================================

-- Blog categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content LONGTEXT,
    featured_image VARCHAR(500),
    author_id INT,
    category_id INT,
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- Status
    status ENUM('draft', 'published', 'scheduled', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- MEDIA LIBRARY
-- ============================================

CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT,
    path VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- AI FEATURES
-- ============================================

-- AI SEO Tasks
CREATE TABLE IF NOT EXISTS ai_seo_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    target_type ENUM('page', 'product', 'service', 'blog_post') NOT NULL,
    target_id INT NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- meta_tags, content_optimization, keywords
    input_content TEXT,
    ai_response JSON,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    applied BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- AI Marketing Campaigns
CREATE TABLE IF NOT EXISTS ai_marketing_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50), -- email, content, landing_page
    target_audience TEXT,
    goals TEXT,
    ai_suggestions JSON,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- AI Video Generation Jobs
CREATE TABLE IF NOT EXISTS ai_video_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform ENUM('sora', 'veo', 'pippit') NOT NULL,
    prompt TEXT NOT NULL,
    style VARCHAR(50),
    duration INT DEFAULT 15,
    aspect_ratio VARCHAR(20) DEFAULT '16:9',
    options JSON,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    error TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- SOCIAL MEDIA
-- ============================================

-- Social media accounts
CREATE TABLE IF NOT EXISTS social_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('instagram', 'facebook', 'twitter', 'linkedin', 'youtube') NOT NULL,
    account_name VARCHAR(255),
    account_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Social media posts
CREATE TABLE IF NOT EXISTS social_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform ENUM('instagram', 'facebook', 'twitter', 'linkedin', 'youtube') NOT NULL,
    content TEXT NOT NULL,
    hashtags JSON,
    media_urls JSON,
    -- AI Generated content
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    -- Scheduling
    status ENUM('draft', 'scheduled', 'posted', 'failed') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    posted_at TIMESTAMP NULL,
    post_id VARCHAR(255), -- External post ID from platform
    error_message TEXT,
    -- Analytics
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- SETTINGS & CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value JSON,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'website',
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Gulfood 2026 registrations
CREATE TABLE IF NOT EXISTS gulfood_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    country VARCHAR(100),
    interest_areas JSON,
    message TEXT,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full administrator access', '{"all": true}'),
('editor', 'Can manage content', '{"pages": true, "products": true, "services": true, "blog": true, "media": true}'),
('author', 'Can create and edit own content', '{"pages": {"own": true}, "blog": {"own": true}}')
ON DUPLICATE KEY UPDATE name = name;

-- Insert default service categories
INSERT INTO service_categories (name, slug, description, icon, order_index) VALUES
('Import & Export', 'import-export', 'Global trade solutions including customs clearance, compliance management, & documentation support.', 'fa-globe', 1),
('Shipping & Logistics', 'shipping-logistics', 'End-to-end freight and supply chain services ensuring smooth cargo movement with reliable handling & tracking.', 'fa-ship', 2),
('Business Consultancy', 'business-consultancy', 'Expert business advisory offering operational, financial planning, & long-term strategies for sustainable growth.', 'fa-chart-line', 3),
('Documentation Services', 'documentation-services', 'Professional documentation support including export-import, compliance certificates, & verification assistance.', 'fa-file-alt', 4),
('Corporate IT Services', 'corporate-it-services', 'Technology solutions for modern businesses.', 'fa-laptop-code', 5),
('Marketing Services', 'marketing-services', 'Strategic marketing and brand development.', 'fa-bullhorn', 6)
ON DUPLICATE KEY UPDATE name = name;

-- Insert default product categories
INSERT INTO product_categories (name, slug, description, order_index) VALUES
('Compostable Products', 'compostable-products', 'Eco-friendly biodegradable products', 1),
('Organic Medicine', 'organic-medicine', 'Natural and organic medicinal products', 2),
('Cold Pressed Oils', 'cold-pressed-oils', 'Premium cold pressed oils', 3),
('Natural Energy Solutions', 'natural-energy-solutions', 'Solar and wind energy solutions', 4),
('Home Care', 'home-care', 'Natural home care products', 5),
('Personal Care', 'personal-care', 'Organic personal care items', 6),
('Indian Spices', 'indian-spices', 'Authentic Indian spices', 7),
('Eco-Friendly Paint', 'eco-friendly-paint', 'Environmentally safe paints', 8),
('Organic Fruits & Vegetables', 'organic-fruits-vegetables', 'Fresh organic produce', 9),
('Luxury Handcrafted Furniture', 'luxury-handcrafted-furniture', 'Artisan luxury furniture', 10)
ON DUPLICATE KEY UPDATE name = name;

-- Insert default settings
INSERT INTO settings (`key`, value, category, description) VALUES
('site_name', '"Alteneiji Group"', 'general', 'Website name'),
('site_tagline', '"Emirati Footprints Leading Trade Frontiers"', 'general', 'Website tagline'),
('site_description', '"Alteneiji Group is a pioneering import and export company based in Dubai, proudly led by an Emirati woman entrepreneur."', 'general', 'Website description'),
('contact_email', '"info@alteneijigroup.com"', 'contact', 'Primary contact email'),
('contact_phone', '["+971503694555", "+971545666075"]', 'contact', 'Contact phone numbers'),
('contact_address', '"Al-Teneiji, MF-17, Alsuaidi building, Opposite San Marco hotel, Almararr, Deira, Dubai"', 'contact', 'Physical address'),
('social_instagram', '"https://www.instagram.com/alteneijigroup"', 'social', 'Instagram URL'),
('social_facebook', '"https://www.facebook.com/profile.php?id=61559215618636"', 'social', 'Facebook URL'),
('social_twitter', '"https://x.com/AlteneijiGroup"', 'social', 'X (Twitter) URL'),
('social_youtube', '"https://www.youtube.com/@AlteneijiGeneralTradingCompany"', 'social', 'YouTube URL'),
('social_linkedin', '"https://www.linkedin.com/company/alteneiji-general-trading-co-llc/"', 'social', 'LinkedIn URL'),
('gemini_model', '"gemini-2.0-flash"', 'ai', 'Gemini AI model to use'),
('ai_seo_enabled', 'true', 'ai', 'Enable AI SEO features'),
('ai_marketing_enabled', 'true', 'ai', 'Enable AI Marketing features'),
('ai_social_enabled', 'true', 'ai', 'Enable AI Social Media features')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- Create indexes for better performance
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_blog_status ON blog_posts(status);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at);
