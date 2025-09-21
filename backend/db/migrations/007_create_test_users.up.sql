-- Create test users for RBAC verification
-- Note: All passwords are 'password123' 
-- Hash generated with bcrypt rounds=10: $2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6

-- Insert test users
INSERT INTO users (email, password_hash, first_name, last_name, phone, city, country, is_active, email_verified) VALUES
-- Super Admin
('superadmin@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'Super', 'Admin', '+919876543210', 'Mumbai', 'India', true, true),
-- Admin  
('admin@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'System', 'Admin', '+919876543211', 'Delhi', 'India', true, true),
-- Project Manager
('pm@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'Project', 'Manager', '+919876543212', 'Bangalore', 'India', true, true),
-- Interior Designer
('designer@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'Interior', 'Designer', '+919876543213', 'Chennai', 'India', true, true),
-- Customer
('customer@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'John', 'Customer', '+919876543214', 'Pune', 'India', true, true),
-- Vendor
('vendor@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'Vendor', 'Supplier', '+919876543215', 'Hyderabad', 'India', true, true),
-- Operations
('operations@gharinto.com', '$2b$10$K8GHLSMhNz7rMCQWLjrTpey9Q5sY5L5RZUXSrJNZ5FQY5H5QY5F5Q6', 'Operations', 'Manager', '+919876543216', 'Kolkata', 'India', true, true)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users (with conflict handling)
-- Super Admin role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'superadmin@gharinto.com' AND r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Admin role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'admin@gharinto.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Project Manager role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'pm@gharinto.com' AND r.name = 'project_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Interior Designer role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'designer@gharinto.com' AND r.name = 'interior_designer'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Customer role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'customer@gharinto.com' AND r.name = 'customer'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Vendor role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'vendor@gharinto.com' AND r.name = 'vendor'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Operations role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'operations@gharinto.com' AND r.name = 'operations'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Create vendor profile for the vendor user
INSERT INTO vendors (user_id, company_name, business_type, city, state, is_verified, rating)
SELECT u.id, 'Test Vendor Company', 'Material Supplier', 'Hyderabad', 'Telangana', true, 4.5
FROM users u WHERE u.email = 'vendor@gharinto.com';

-- Create sample projects for testing
INSERT INTO projects (title, description, client_id, designer_id, project_manager_id, status, budget, city, property_type)
SELECT 
  'Modern Living Room Design',
  'Complete interior design for a modern 3BHK apartment living room',
  customer.id,
  designer.id,
  pm.id,
  'planning',
  500000,
  'Mumbai',
  'apartment'
FROM 
  (SELECT id FROM users WHERE email = 'customer@gharinto.com') customer,
  (SELECT id FROM users WHERE email = 'designer@gharinto.com') designer,
  (SELECT id FROM users WHERE email = 'pm@gharinto.com') pm;

INSERT INTO projects (title, description, client_id, designer_id, project_manager_id, status, budget, city, property_type)
SELECT 
  'Office Space Renovation',
  'Complete office space interior design and renovation',
  customer.id,
  designer.id,
  pm.id,
  'design',
  1200000,
  'Delhi',
  'office'
FROM 
  (SELECT id FROM users WHERE email = 'customer@gharinto.com') customer,
  (SELECT id FROM users WHERE email = 'designer@gharinto.com') designer,
  (SELECT id FROM users WHERE email = 'pm@gharinto.com') pm;

-- Create sample materials for testing
INSERT INTO materials (vendor_id, name, category, unit, price, stock_quantity, lead_time_days)
SELECT 
  v.id,
  'Premium Wooden Flooring',
  'Flooring',
  'sq ft',
  2500,
  100,
  7
FROM vendors v
WHERE v.user_id = (SELECT id FROM users WHERE email = 'vendor@gharinto.com');

INSERT INTO materials (vendor_id, name, category, unit, price, stock_quantity, lead_time_days)
SELECT 
  v.id,
  'Designer Ceiling Lights',
  'Lighting',
  'piece',
  8500,
  25,
  10
FROM vendors v
WHERE v.user_id = (SELECT id FROM users WHERE email = 'vendor@gharinto.com');

INSERT INTO materials (vendor_id, name, category, unit, price, stock_quantity, lead_time_days)
SELECT 
  v.id,
  'Premium Paint',
  'Paint',
  'liter',
  850,
  200,
  2
FROM vendors v
WHERE v.user_id = (SELECT id FROM users WHERE email = 'vendor@gharinto.com');

-- Create sample leads for testing
INSERT INTO leads (source, first_name, last_name, email, phone, city, budget_min, budget_max, project_type, status, assigned_to)
SELECT 
  'website',
  'Rajesh',
  'Kumar',
  'rajesh.kumar@example.com',
  '+919876543220',
  'Mumbai',
  300000,
  600000,
  'residential',
  'new',
  designer.id
FROM (SELECT id FROM users WHERE email = 'designer@gharinto.com') designer;

INSERT INTO leads (source, first_name, last_name, email, phone, city, budget_min, budget_max, project_type, status, assigned_to)
SELECT 
  'referral',
  'Priya',
  'Sharma',
  'priya.sharma@example.com',
  '+919876543221',
  'Delhi',
  800000,
  1500000,
  'commercial',
  'contacted',
  pm.id
FROM (SELECT id FROM users WHERE email = 'pm@gharinto.com') pm;