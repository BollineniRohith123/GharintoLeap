-- Add missing permissions for SuperAdmin features
-- This script adds finance.manage and approvals.manage permissions
-- and assigns them to the super_admin role

-- Add finance.manage permission
INSERT INTO permissions (resource, action, description) 
VALUES ('finance', 'manage', 'Manage financial operations including wallets and transactions') 
ON CONFLICT (resource, action) DO NOTHING;

-- Add approvals.manage permission
INSERT INTO permissions (resource, action, description) 
VALUES ('approvals', 'manage', 'Manage partner approval workflows') 
ON CONFLICT (resource, action) DO NOTHING;

-- Assign finance.manage to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'super_admin' 
AND p.resource = 'finance' 
AND p.action = 'manage'
ON CONFLICT DO NOTHING;

-- Assign approvals.manage to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'super_admin' 
AND p.resource = 'approvals' 
AND p.action = 'manage'
ON CONFLICT DO NOTHING;

-- Verify the permissions were added
SELECT 'Permissions added:' as status;
SELECT id, resource, action, description 
FROM permissions 
WHERE resource IN ('finance', 'approvals') AND action = 'manage';

-- Verify role_permissions assignments
SELECT 'Role permissions assigned:' as status;
SELECT r.name as role_name, p.resource, p.action 
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'super_admin' 
AND p.resource IN ('finance', 'approvals') 
AND p.action = 'manage';

