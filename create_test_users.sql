-- Quick test users creation with proper bcrypt hash
-- Password for all accounts: 'password123'
-- Bcrypt hash (generated with bcrypt.hash('password123', 10)): 
-- $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW

-- Clean up existing test users first
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@gharinto.com'
);
DELETE FROM users WHERE email LIKE '%@gharinto.com';

-- Insert test users with proper bcrypt hash
INSERT INTO users (email, password_hash, first_name, last_name, phone, city, country, is_active, email_verified) VALUES
('superadmin@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Super', 'Admin', '+919876543210', 'Mumbai', 'India', true, true),
('admin@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'System', 'Admin', '+919876543211', 'Delhi', 'India', true, true),
('pm@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Project', 'Manager', '+919876543212', 'Bangalore', 'India', true, true),
('designer@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Interior', 'Designer', '+919876543213', 'Chennai', 'India', true, true),
('customer@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'John', 'Customer', '+919876543214', 'Pune', 'India', true, true),
('vendor@gharinto.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Vendor', 'Supplier', '+919876543215', 'Hyderabad', 'India', true, true);

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'superadmin@gharinto.com' AND r.name = 'super_admin';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@gharinto.com' AND r.name = 'admin';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'pm@gharinto.com' AND r.name = 'project_manager';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'designer@gharinto.com' AND r.name = 'interior_designer';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'customer@gharinto.com' AND r.name = 'customer';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'vendor@gharinto.com' AND r.name = 'vendor';

-- Create vendor profile
INSERT INTO vendors (user_id, company_name, business_type, city, state, is_verified)
SELECT u.id, 'Test Materials Co.', 'Supplier', 'Hyderabad', 'Telangana', true
FROM users u WHERE u.email = 'vendor@gharinto.com';

-- Create wallets for all users
INSERT INTO wallets (user_id)
SELECT id FROM users WHERE email LIKE '%@gharinto.com'
ON CONFLICT (user_id) DO NOTHING;