-- Update passwords for all test users with bcrypt hash of 'password123'
-- This hash was generated using bcrypt with 12 salt rounds

UPDATE users SET password_hash = '$2a$12$LQv3c1yqBwcVsvDqjrtuZ.Ra/kUEFYkqhYZNvYffxeQhTgHCS.j8m' WHERE email IN (
  'admin@gharinto.com',
  'superadmin@gharinto.com', 
  'pm@gharinto.com',
  'designer@gharinto.com',
  'customer@gharinto.com',
  'vendor@gharinto.com',
  'operations@gharinto.com'
);

-- Verify the update
SELECT email, first_name, last_name, 'password updated' as status FROM users 
WHERE email IN (
  'admin@gharinto.com',
  'superadmin@gharinto.com', 
  'pm@gharinto.com',
  'designer@gharinto.com',
  'customer@gharinto.com',
  'vendor@gharinto.com',
  'operations@gharinto.com'
);