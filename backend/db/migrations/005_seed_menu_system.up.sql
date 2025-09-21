-- Insert default menus (avoid duplicates)
INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) VALUES
-- Main navigation menus
('dashboard', 'Dashboard', 'Home', '/dashboard', NULL, 1),
('analytics', 'Analytics', 'BarChart3', '/analytics', NULL, 2),
('projects', 'Projects', 'Briefcase', NULL, NULL, 3),
('leads', 'Leads', 'Users', '/leads', NULL, 4),
('materials', 'Materials', 'Package', '/materials', NULL, 5),
('vendors', 'Vendors', 'Building', '/vendors', NULL, 6),
('finance', 'Finance', 'DollarSign', NULL, NULL, 7),
('communications', 'Communications', 'MessageSquare', '/communications', NULL, 8),
('users', 'User Management', 'Shield', '/users', NULL, 9),
('settings', 'Settings', 'Settings', '/settings', NULL, 10)
ON CONFLICT (name) DO NOTHING;

-- Get menu IDs for submenu insertion
-- Projects submenus
INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'project_list', 'All Projects', NULL, '/projects', id, 1 FROM menus WHERE name = 'projects'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'project_create', 'Create Project', NULL, '/projects/create', id, 2 FROM menus WHERE name = 'projects'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'project_workflow', 'Workflow Management', NULL, '/projects/workflow', id, 3 FROM menus WHERE name = 'projects'
ON CONFLICT (name) DO NOTHING;

-- Finance submenus
INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'finance_overview', 'Financial Overview', NULL, '/finance', id, 1 FROM menus WHERE name = 'finance'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'finance_transactions', 'Transactions', NULL, '/finance/transactions', id, 2 FROM menus WHERE name = 'finance'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'finance_wallet', 'Wallet Management', NULL, '/finance/wallet', id, 3 FROM menus WHERE name = 'finance'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order) 
SELECT 'finance_reports', 'Financial Reports', NULL, '/finance/reports', id, 4 FROM menus WHERE name = 'finance'
ON CONFLICT (name) DO NOTHING;

-- Assign menus to roles (with conflict resolution)
-- Super Admin - all menus
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Admin - most menus except some sensitive ones
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'admin' 
AND m.name NOT IN ('settings')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Project Manager - project and communication focused
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'project_manager' 
AND m.name IN ('dashboard', 'projects', 'project_list', 'project_create', 'project_workflow', 
               'leads', 'communications', 'finance_overview', 'finance_transactions')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Interior Designer - design and project focused
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'interior_designer' 
AND m.name IN ('dashboard', 'projects', 'project_list', 'materials', 'communications',
               'finance_overview', 'finance_wallet')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Vendor - vendor and order focused
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'vendor' 
AND m.name IN ('dashboard', 'materials', 'communications', 'finance_overview', 
               'finance_transactions', 'finance_wallet')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Customer - limited view
INSERT INTO role_menus (role_id, menu_id, can_view)
SELECT r.id, m.id, true
FROM roles r, menus m
WHERE r.name = 'customer' 
AND m.name IN ('dashboard', 'projects', 'project_list', 'communications',
               'finance_overview')
ON CONFLICT (role_id, menu_id) DO NOTHING;