-- API Usage table for billing tracking
-- Run this on the server to create the table if it doesn't exist

CREATE TABLE IF NOT EXISTS api_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    service VARCHAR(50) NOT NULL DEFAULT 'gemini',
    operation VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    images_generated INT DEFAULT 0,
    base_cost DECIMAL(10,6) DEFAULT 0,
    markup_percent DECIMAL(5,2) DEFAULT 50.00,
    total_cost DECIMAL(10,6) DEFAULT 0,
    request_data JSON,
    response_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage(service);
