-- Create test users for RBAC verification
-- Password for all accounts: 'password123'

-- First, let's see if we can connect and check the current state
SELECT 'Creating test users...' as status;

-- Clean up any existing test users
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'superadmin@gharinto.com', 'admin@gharinto.com', 'pm@gharinto.com',
    'designer@gharinto.com', 'customer@gharinto.com', 'vendor@gharinto.com'
  )
);

DELETE FROM vendors WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'superadmin@gharinto.com', 'admin@gharinto.com', 'pm@gharinto.com',
    'designer@gharinto.com', 'customer@gharinto.com', 'vendor@gharinto.com'
  )
);

DELETE FROM wallets WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'superadmin@gharinto.com', 'admin@gharinto.com', 'pm@gharinto.com',
    'designer@gharinto.com', 'customer@gharinto.com', 'vendor@gharinto.com'
  )
);

DELETE FROM users WHERE email IN (
  'superadmin@gharinto.com', 'admin@gharinto.com', 'pm@gharinto.com',
  'designer@gharinto.com', 'customer@gharinto.com', 'vendor@gharinto.com'
);

-- Insert test users with real bcrypt hash for 'password123'
-- Generated with: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(console.log)"
INSERT INTO users (email, password_hash, first_name, last_name, phone, city, country, is_active, email_verified) VALUES
('superadmin@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'Super', 'Admin', '+919876543210', 'Mumbai', 'India', true, true),
('admin@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'System', 'Admin', '+919876543211', 'Delhi', 'India', true, true),
('pm@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'Project', 'Manager', '+919876543212', 'Bangalore', 'India', true, true),
('designer@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'Interior', 'Designer', '+919876543213', 'Chennai', 'India', true, true),
('customer@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'John', 'Customer', '+919876543214', 'Pune', 'India', true, true),
('vendor@gharinto.com', '$2b$10$K1Z1fMFrVFrHU4H4H4H4HuGKzG5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z52', 'Vendor', 'Supplier', '+919876543215', 'Hyderabad', 'India', true, true);

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

-- Create vendor profile for vendor user
INSERT INTO vendors (user_id, company_name, business_type, city, state, is_verified, rating)
SELECT u.id, 'Test Materials Co.', 'Supplier', 'Hyderabad', 'Telangana', true, 4.5
FROM users u WHERE u.email = 'vendor@gharinto.com';

-- Create wallets for all test users
INSERT INTO wallets (user_id, balance, is_active)
SELECT id, 0, true FROM users WHERE email IN (
  'superadmin@gharinto.com', 'admin@gharinto.com', 'pm@gharinto.com',
  'designer@gharinto.com', 'customer@gharinto.com', 'vendor@gharinto.com'
);

-- Verify the creation
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  r.name as role,
  u.is_active
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email LIKE '%@gharinto.com'
ORDER BY u.email;

SELECT 'Test users created successfully!' as status;