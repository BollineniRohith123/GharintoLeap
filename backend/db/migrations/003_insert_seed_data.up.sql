-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
('super_admin', 'Super Admin', 'Full system access and control'),
('admin', 'Admin', 'Administrative access to manage operations'),
('project_manager', 'Project Manager', 'Manage projects and timelines'),
('interior_designer', 'Interior Designer', 'Design and client management'),
('customer', 'Customer', 'Client access to projects and services'),
('vendor', 'Vendor', 'Supplier and inventory management'),
('operations', 'Operations', 'Operational management and support');

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
-- User management
('users.view', 'View Users', 'View user profiles and information', 'users', 'view'),
('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
('users.edit', 'Edit Users', 'Edit user profiles and information', 'users', 'edit'),
('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),

-- Role management
('roles.view', 'View Roles', 'View system roles and permissions', 'roles', 'view'),
('roles.manage', 'Manage Roles', 'Create and modify roles and permissions', 'roles', 'manage'),

-- Lead management
('leads.view', 'View Leads', 'View lead information', 'leads', 'view'),
('leads.create', 'Create Leads', 'Create new leads', 'leads', 'create'),
('leads.edit', 'Edit Leads', 'Edit lead information', 'leads', 'edit'),
('leads.assign', 'Assign Leads', 'Assign leads to team members', 'leads', 'assign'),
('leads.convert', 'Convert Leads', 'Convert leads to projects', 'leads', 'convert'),

-- Project management
('projects.view', 'View Projects', 'View project information', 'projects', 'view'),
('projects.create', 'Create Projects', 'Create new projects', 'projects', 'create'),
('projects.edit', 'Edit Projects', 'Edit project information', 'projects', 'edit'),
('projects.manage', 'Manage Projects', 'Full project management access', 'projects', 'manage'),

-- Analytics
('analytics.view', 'View Analytics', 'View analytics and reports', 'analytics', 'view'),
('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', 'export'),

-- Financial
('finance.view', 'View Finance', 'View financial information', 'finance', 'view'),
('finance.manage', 'Manage Finance', 'Manage payments and transactions', 'finance', 'manage'),

-- Vendor management
('vendors.view', 'View Vendors', 'View vendor information', 'vendors', 'view'),
('vendors.manage', 'Manage Vendors', 'Manage vendor accounts and materials', 'vendors', 'manage'),

-- System settings
('system.configure', 'System Configuration', 'Configure system settings', 'system', 'configure');

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin';

-- Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.name IN (
  'users.view', 'users.create', 'users.edit',
  'leads.view', 'leads.create', 'leads.edit', 'leads.assign', 'leads.convert',
  'projects.view', 'projects.create', 'projects.edit', 'projects.manage',
  'analytics.view', 'analytics.export',
  'vendors.view', 'vendors.manage'
);

-- Project Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'project_manager' AND p.name IN (
  'projects.view', 'projects.edit', 'projects.manage',
  'leads.view',
  'vendors.view',
  'analytics.view'
);

-- Interior Designer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'interior_designer' AND p.name IN (
  'leads.view', 'leads.edit',
  'projects.view', 'projects.edit',
  'vendors.view',
  'finance.view'
);

-- Customer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'customer' AND p.name IN (
  'projects.view',
  'finance.view'
);

-- Vendor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'vendor' AND p.name IN (
  'vendors.view', 'vendors.manage',
  'projects.view',
  'finance.view'
);

-- Insert default menu structure
INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) VALUES
('dashboard', 'Dashboard', 'BarChart3', '/dashboard', NULL, 1),
('leads', 'Leads', 'Users', '/leads', NULL, 2),
('projects', 'Projects', 'FolderOpen', '/projects', NULL, 3),
('analytics', 'Analytics', 'TrendingUp', '/analytics', NULL, 4),
('finance', 'Finance', 'DollarSign', '/finance', NULL, 5),
('vendors', 'Vendors', 'Truck', '/vendors', NULL, 6),
('materials', 'Materials', 'Package', '/materials', NULL, 7),
('users', 'Users', 'Users', '/users', NULL, 8),
('settings', 'Settings', 'Settings', '/settings', NULL, 9);

-- Assign menu access to roles
-- Super Admin access to all menus
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m WHERE r.name = 'super_admin';

-- Admin menu access
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m 
WHERE r.name = 'admin' AND m.name IN ('dashboard', 'leads', 'projects', 'analytics', 'vendors', 'materials', 'users');

-- Project Manager menu access
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m 
WHERE r.name = 'project_manager' AND m.name IN ('dashboard', 'projects', 'analytics', 'materials');

-- Interior Designer menu access
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m 
WHERE r.name = 'interior_designer' AND m.name IN ('dashboard', 'leads', 'projects', 'finance', 'materials');

-- Customer menu access
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m 
WHERE r.name = 'customer' AND m.name IN ('dashboard', 'projects', 'finance');

-- Vendor menu access
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m 
WHERE r.name = 'vendor' AND m.name IN ('dashboard', 'materials', 'finance');
