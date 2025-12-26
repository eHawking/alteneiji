-- =====================================================
-- Unified Inbox System Tables
-- Run this migration to add inbox functionality
-- =====================================================

-- Channels table (connected messaging platforms)
CREATE TABLE IF NOT EXISTS channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    platform ENUM('whatsapp', 'facebook', 'instagram') NOT NULL,
    name VARCHAR(100) NOT NULL,
    identifier VARCHAR(255) NOT NULL, -- Phone number or page ID
    phone_number VARCHAR(20),
    access_token TEXT, -- For Facebook/Instagram OAuth
    session_data LONGTEXT, -- For WhatsApp Web session
    status ENUM('pending', 'active', 'disconnected', 'error') DEFAULT 'pending',
    last_active TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_platform (platform),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agents table (support team members)
CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    avatar VARCHAR(500),
    role ENUM('admin', 'supervisor', 'agent') DEFAULT 'agent',
    permissions JSON, -- Granular permission settings
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    is_online BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_online (is_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversations table (chat threads)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    channel_id INT NOT NULL,
    contact_identifier VARCHAR(255) NOT NULL, -- Phone or user ID
    contact_name VARCHAR(100),
    contact_avatar VARCHAR(500),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    status ENUM('active', 'pending', 'resolved', 'archived') DEFAULT 'active',
    assigned_agent_id INT,
    unread_count INT DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMP NULL,
    labels JSON, -- Tags/labels for categorization
    notes TEXT, -- Agent notes about this contact
    metadata JSON, -- Additional platform-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    UNIQUE KEY unique_channel_contact (channel_id, contact_identifier),
    INDEX idx_status (status),
    INDEX idx_agent (assigned_agent_id),
    INDEX idx_last_message (last_message_at),
    INDEX idx_unread (unread_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table (individual messages)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    conversation_id INT NOT NULL,
    direction ENUM('incoming', 'outgoing') NOT NULL,
    content TEXT NOT NULL,
    content_type ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact') DEFAULT 'text',
    media_url VARCHAR(500),
    status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    agent_id INT, -- Which agent sent this message (for outgoing)
    external_id VARCHAR(255), -- Platform's message ID for tracking
    metadata JSON, -- Additional data (reactions, replies, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_conversation (conversation_id),
    INDEX idx_external (external_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quick Replies table (canned responses)
CREATE TABLE IF NOT EXISTS quick_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    shortcut VARCHAR(50), -- Keyboard shortcut like /thanks
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    use_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_shortcut (shortcut),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default quick replies
INSERT INTO quick_replies (uuid, title, content, shortcut, category) VALUES
(UUID(), 'Thank You', 'Thank you for contacting us! How can I help you today?', '/thanks', 'greetings'),
(UUID(), 'Please Hold', 'Please hold for a moment while I check that for you.', '/hold', 'general'),
(UUID(), 'Anything Else', 'Is there anything else I can help you with?', '/else', 'closing'),
(UUID(), 'Business Hours', 'Our business hours are Sunday-Thursday, 9AM-6PM (UAE time).', '/hours', 'info'),
(UUID(), 'Contact Info', 'You can reach us at:\n📞 +971 50 123 4567\n📧 info@alteneiji.com', '/contact', 'info');

-- Insert sample agent (password: agent123)
INSERT INTO agents (uuid, email, password, first_name, last_name, role, permissions, status, is_online) VALUES
(UUID(), 'agent@alteneiji.com', '$2b$10$9Q9p.dGj0J1YzYz5Q3Q5aOQJ5Q3Q5aOQJ5Q3Q5aOQJ5Q3Q5aOQJ5', 'Support', 'Agent', 'agent', '{"viewAll": false, "viewAssigned": true, "reply": true, "assign": false}', 'active', 0);
