-- REAL TEST USERS WITH PROPER BCRYPT HASH
-- Password: password123
-- Real bcrypt hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Clean up first
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'admin@test.com', 'pm@test.com', 'designer@test.com', 
    'customer@test.com', 'vendor@test.com'
  )
);
DELETE FROM users WHERE email IN (
  'admin@test.com', 'pm@test.com', 'designer@test.com', 
  'customer@test.com', 'vendor@test.com'
);

-- Insert users with working bcrypt hash
INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified) VALUES
('admin@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', '+919876543210', 'Mumbai', true, true),
('pm@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Project', 'Manager', '+919876543211', 'Delhi', true, true),
('designer@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Interior', 'Designer', '+919876543212', 'Bangalore', true, true),
('customer@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Customer', '+919876543213', 'Chennai', true, true),
('vendor@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Vendor', 'Supplier', '+919876543214', 'Pune', true, true);

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@test.com' AND r.name = 'admin';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'pm@test.com' AND r.name = 'project_manager';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'designer@test.com' AND r.name = 'interior_designer';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'customer@test.com' AND r.name = 'customer';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'vendor@test.com' AND r.name = 'vendor';

-- Create wallets
INSERT INTO wallets (user_id, balance)
SELECT id, 0 FROM users WHERE email IN ('admin@test.com', 'pm@test.com', 'designer@test.com', 'customer@test.com', 'vendor@test.com');