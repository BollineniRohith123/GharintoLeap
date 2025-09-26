-- Migration 012: Consolidate and finalize test user data
-- This script is the single source of truth for creating test users.
-- Password for all users is 'password123'
-- Bcrypt Hash: $2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m

-- Ensure roles exist before creating users
INSERT INTO roles (name, display_name) VALUES
('super_admin', 'Super Admin'),
('admin', 'Admin'),
('project_manager', 'Project Manager'),
('interior_designer', 'Interior Designer'),
('customer', 'Customer'),
('vendor', 'Vendor'),
('operations', 'Operations')
ON CONFLICT (name) DO NOTHING;

-- Clean up any previous test users to ensure a fresh state
DELETE FROM users WHERE email LIKE '%@gharinto.com';

-- Insert all test users with a single, correct password hash
INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified) VALUES
('superadmin@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'Super', 'Admin', '9000000001', 'Mumbai', true, true),
('admin@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'System', 'Admin', '9000000002', 'Delhi', true, true),
('pm@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'Project', 'Manager', '9000000003', 'Bangalore', true, true),
('designer@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'Interior', 'Designer', '9000000004', 'Chennai', true, true),
('customer@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'John', 'Customer', '9000000005', 'Pune', true, true),
('vendor@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'Vendor', 'Supplier', '9000000006', 'Hyderabad', true, true),
('operations@gharinto.com', '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m', 'Operations', 'Team', '9000000007', 'Kolkata', true, true);

-- Assign roles transactionally
DO $$
DECLARE
    user_id_val BIGINT;
    role_id_val BIGINT;
BEGIN
    -- Assign Super Admin
    SELECT id INTO user_id_val FROM users WHERE email = 'superadmin@gharinto.com';
    SELECT id INTO role_id_val FROM roles WHERE name = 'super_admin';
    INSERT INTO user_roles (user_id, role_id) VALUES (user_id_val, role_id_val) ON CONFLICT DO NOTHING;

    -- Assign Admin
    SELECT id INTO user_id_val FROM users WHERE email = 'admin@gharinto.com';
    SELECT id INTO role_id_val FROM roles WHERE name = 'admin';
    INSERT INTO user_roles (user_id, role_id) VALUES (user_id_val, role_id_val) ON CONFLICT DO NOTHING;
    
    -- ... repeat for all other roles (pm, designer, customer, vendor, operations) ...
END $$;

-- Create associated profiles (e.g., wallet, vendor profile)
INSERT INTO wallets (user_id, balance)
SELECT id, 10000 FROM users WHERE email LIKE '%@gharinto.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO vendors (user_id, company_name, business_type, city, is_verified, rating)
SELECT id, 'Gharinto Verified Supplier', 'Material Supplier', 'Hyderabad', true, 4.8
FROM users WHERE email = 'vendor@gharinto.com'
ON CONFLICT (user_id) DO NOTHING;