-- Alteneiji Group - Seed Data
-- Run this AFTER schema.sql to populate initial content

USE alteneiji_db;

-- ============================================
-- PAGES
-- ============================================

INSERT INTO pages (slug, title, content, template, status, show_in_menu, menu_order, meta_title, meta_description, published_at) VALUES
('home', 'Home', '<h1>Emirati Footprints Leading Trade Frontiers</h1><p>Alteneiji Group connects businesses across borders with trusted, sustainable, and premium-quality import & export solutions from Dubai to the world.</p>', 'home', 'published', true, 1, 'Alteneiji Group | Emirati-Owned Import & Export Trading Company in Dubai', 'Alteneiji Group is a pioneering import and export company based in Dubai, led by Emirati woman entrepreneur Ms. Maryam Alteneiji.', NOW()),

('about', 'About Us', '<h2>Empowering Global Trade with Integrity</h2><p>Alteneiji Group is a leading trading company in the United Arab Emirates, founded in 2024 by Ms. Maryam Alteneiji, an experienced Emirati businesswoman with over 25 years of professional expertise.</p>', 'default', 'published', true, 2, 'About Alteneiji Group | Emirati Woman-Owned Trading Company', 'Learn about Alteneiji Group, founded by Ms. Maryam Alteneiji with 25+ years experience in import export trading.', NOW()),

('services', 'Our Services', '<h2>Comprehensive Trading Solutions</h2><p>End-to-end services ensuring smooth operations from logistics to documentation.</p>', 'default', 'published', true, 3, 'Services | Import Export, Shipping, Business Consultancy', 'Professional trading services including import export, shipping logistics, business consultancy, and documentation.', NOW()),

('products', 'Our Products', '<h2>Premium Quality Products</h2><p>We trade in high-quality products sourced from trusted manufacturers worldwide.</p>', 'default', 'published', true, 4, 'Products | Organic & Sustainable Products Trading', 'Premium organic and sustainable products including compostable goods, organic medicine, spices, and more.', NOW()),

('contact', 'Contact Us', '<h2>Get in Touch</h2><p>Ready to expand your business? Contact our team for personalized trading solutions.</p>', 'contact', 'published', true, 5, 'Contact Alteneiji Group | Dubai Trading Company', 'Contact Alteneiji Group for import export services. Located in Deira, Dubai. Phone: +971 50 369 4555', NOW()),

('gulfood-2026', 'Gulfood 2026', '<h2>Join Us at Gulfood 2026</h2><p>The world''s largest food & beverage exhibition in Dubai.</p>', 'landing', 'published', true, 6, 'Gulfood 2026 | Alteneiji Group Exhibition', 'Join Alteneiji Group at Gulfood 2026. Complete travel package, buyer-seller meets, and networking opportunities.', NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================
-- SERVICES
-- ============================================

INSERT INTO services (uuid, name, slug, short_description, description, category_id, icon, status, is_featured, order_index) VALUES
(UUID(), 'Import & Export Services', 'import-export-services', 'Global trade solutions including customs clearance, compliance management, and documentation support for seamless international transactions.', '<h3>Import & Export Services</h3><p>Alteneiji Group provides comprehensive import and export solutions for businesses looking to trade internationally. Our services include:</p><ul><li>Customs clearance and compliance</li><li>Documentation and certification</li><li>International trade facilitation</li><li>Supplier verification</li></ul>', 1, 'fa-globe', 'published', true, 1),

(UUID(), 'Shipping & Logistics', 'shipping-logistics-services', 'End-to-end freight and supply chain services ensuring smooth cargo movement with reliable handling and real-time tracking.', '<h3>Shipping & Logistics</h3><p>Our logistics solutions ensure your cargo reaches its destination safely and on time:</p><ul><li>Air, sea, and land freight</li><li>Warehousing solutions</li><li>Real-time cargo tracking</li><li>Supply chain management</li></ul>', 2, 'fa-ship', 'published', true, 2),

(UUID(), 'Business Consultancy', 'business-consultancy-services', 'Expert business advisory offering operational, financial planning, and long-term strategies for sustainable growth.', '<h3>Business Consultancy</h3><p>Strategic business advice to help your company grow:</p><ul><li>Market entry strategy</li><li>Financial planning</li><li>Operational optimization</li><li>Growth strategy development</li></ul>', 3, 'fa-chart-line', 'published', true, 3),

(UUID(), 'Documentation Services', 'documentation-services', 'Professional documentation support including export-import certificates, compliance verification, and assistance.', '<h3>Documentation Services</h3><p>Complete documentation support for international trade:</p><ul><li>Export-import certificates</li><li>Compliance documentation</li><li>License applications</li><li>Certificate verification</li></ul>', 4, 'fa-file-alt', 'published', true, 4),

(UUID(), 'Corporate IT Services', 'corporate-it-services', 'Technology solutions for modern businesses including digitalization, automation, and IT infrastructure.', '<h3>Corporate IT Services</h3><p>Modern technology solutions for your business:</p><ul><li>Digital transformation</li><li>Business automation</li><li>IT infrastructure</li><li>Software solutions</li></ul>', 5, 'fa-laptop-code', 'published', false, 5),

(UUID(), 'Marketing Services', 'marketing-services', 'Strategic marketing and brand development to expand your reach in UAE and international markets.', '<h3>Marketing Services</h3><p>Build your brand and reach more customers:</p><ul><li>Brand development</li><li>Digital marketing</li><li>Market research</li><li>Campaign management</li></ul>', 6, 'fa-bullhorn', 'published', false, 6)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================
-- PRODUCTS
-- ============================================

INSERT INTO products (uuid, name, slug, short_description, description, category_id, status, is_featured, order_index) VALUES
(UUID(), 'Compostable Tableware', 'compostable-tableware', 'Eco-friendly biodegradable plates, cups, and cutlery made from sustainable materials.', '<h3>Compostable Tableware</h3><p>100% biodegradable and compostable tableware perfect for eco-conscious businesses and events. Made from sustainable plant-based materials.</p>', 1, 'published', true, 1),

(UUID(), 'Organic Herbal Medicine', 'organic-herbal-medicine', 'Natural medicinal products derived from organic herbs and plants.', '<h3>Organic Herbal Medicine</h3><p>Premium quality organic herbal remedies sourced from certified organic farms. Natural healing solutions.</p>', 2, 'published', true, 2),

(UUID(), 'Cold Pressed Coconut Oil', 'cold-pressed-coconut-oil', 'Premium quality cold pressed virgin coconut oil for cooking and skincare.', '<h3>Cold Pressed Coconut Oil</h3><p>100% pure cold pressed virgin coconut oil retaining all natural nutrients. Perfect for cooking, skincare, and haircare.</p>', 3, 'published', true, 3),

(UUID(), 'Solar Panel Systems', 'solar-panel-systems', 'High-efficiency solar panels for residential and commercial installations.', '<h3>Solar Panel Systems</h3><p>State-of-the-art solar energy solutions for sustainable power generation. Reduce your carbon footprint and energy costs.</p>', 4, 'published', false, 4),

(UUID(), 'Natural Floor Cleaner', 'natural-floor-cleaner', 'Plant-based floor cleaning solution safe for families and pets.', '<h3>Natural Floor Cleaner</h3><p>Eco-friendly floor cleaning solution made with natural ingredients. Safe for all floor types, children, and pets.</p>', 5, 'published', false, 5),

(UUID(), 'Organic Skincare Set', 'organic-skincare-set', 'Complete organic skincare routine with natural ingredients.', '<h3>Organic Skincare Set</h3><p>Premium organic skincare collection featuring face wash, moisturizer, and serum made with natural organic ingredients.</p>', 6, 'published', true, 6),

(UUID(), 'Premium Garam Masala', 'premium-garam-masala', 'Authentic Indian garam masala blend with premium spices.', '<h3>Premium Garam Masala</h3><p>Traditional Indian spice blend made with the finest aromatic spices. Hand-selected and freshly ground for authentic flavor.</p>', 7, 'published', true, 7),

(UUID(), 'Eco-Friendly Wall Paint', 'eco-friendly-wall-paint', 'Low VOC, environmentally safe wall paint in various colors.', '<h3>Eco-Friendly Wall Paint</h3><p>Premium quality wall paint with low VOC emissions. Safe for indoor use with excellent coverage and durability.</p>', 8, 'published', false, 8),

(UUID(), 'Organic Vegetables Box', 'organic-vegetables-box', 'Fresh seasonal organic vegetables delivered weekly.', '<h3>Organic Vegetables Box</h3><p>Farm-fresh organic vegetables sourced from certified organic farms. Seasonal selection of healthy produce.</p>', 9, 'published', true, 9),

(UUID(), 'Handcrafted Teak Dining Table', 'handcrafted-teak-dining-table', 'Luxury handmade solid teak wood dining table.', '<h3>Handcrafted Teak Dining Table</h3><p>Exquisite handcrafted dining table made from premium solid teak wood by master artisans. A statement piece for your home.</p>', 10, 'published', true, 10),

(UUID(), 'Nano Banana Pro', 'nano-banana-pro', 'Premium organic nano bananas with enhanced nutritional value.', '<h3>Nano Banana Pro</h3><p>Our signature Nano Banana Pro is a premium organic banana variety known for its exceptional sweetness and nutritional density. Grown using sustainable farming practices.</p><ul><li>100% Organic Certified</li><li>Rich in potassium and vitamins</li><li>Sustainably sourced</li><li>Perfect for smoothies and snacks</li></ul>', 9, 'published', true, 11)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================
-- SOCIAL ACCOUNTS (Placeholders)
-- ============================================

INSERT INTO social_accounts (platform, account_name, is_active) VALUES
('instagram', 'alteneijigroup', true),
('facebook', 'Alteneiji Group', true),
('twitter', 'AlteneijiGroup', true),
('linkedin', 'Alteneiji General Trading Co LLC', true),
('youtube', 'Alteneiji General Trading Company', true)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name);

SELECT 'Seed data inserted successfully!' AS status;
