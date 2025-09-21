-- Update user password hashes with correctly generated bcrypt hash for 'password123'
-- Using bcrypt hash: $2b$10$Q5FzFEFsKWYPtEsH7Fhbz.U8Y2aWVQzI8p8YlB8Pu6Z7aHl8A4C9a

UPDATE users 
SET password_hash = '$2b$10$Q5FzFEFsKWYPtEsH7Fhbz.U8Y2aWVQzI8p8YlB8Pu6Z7aHl8A4C9a'
WHERE email IN (
  'superadmin@gharinto.com',
  'admin@gharinto.com', 
  'pm@gharinto.com',
  'designer@gharinto.com',
  'customer@gharinto.com',
  'vendor@gharinto.com',
  'operations@gharinto.com'
);

-- Verify the update
SELECT email, 
       CASE 
         WHEN password_hash = '$2b$10$Q5FzFEFsKWYPtEsH7Fhbz.U8Y2aWVQzI8p8YlB8Pu6Z7aHl8A4C9a' 
         THEN 'UPDATED' 
         ELSE 'OLD_HASH' 
       END as status
FROM users 
WHERE email IN (
  'superadmin@gharinto.com',
  'admin@gharinto.com', 
  'pm@gharinto.com',
  'designer@gharinto.com',
  'customer@gharinto.com',
  'vendor@gharinto.com',
  'operations@gharinto.com'
);