-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
('super_admin', 'Super Admin', 'Full system access'),
('operations_team', 'Operations Team', 'Operations management access'),
('project_manager', 'Project Manager', 'Project management access'),
('interior_designer', 'Interior Designer', 'Designer dashboard access'),
('homeowner', 'Homeowner', 'Customer dashboard access'),
('vendor', 'Vendor', 'Vendor management access');

-- Insert permissions
INSERT INTO permissions (name, display_name, module) VALUES
-- User Management
('users.view', 'View Users', 'users'),
('users.create', 'Create Users', 'users'),
('users.edit', 'Edit Users', 'users'),
('users.delete', 'Delete Users', 'users'),

-- Project Management
('projects.view', 'View Projects', 'projects'),
('projects.create', 'Create Projects', 'projects'),
('projects.edit', 'Edit Projects', 'projects'),
('projects.delete', 'Delete Projects', 'projects'),
('projects.assign', 'Assign Projects', 'projects'),

-- Lead Management
('leads.view', 'View Leads', 'leads'),
('leads.create', 'Create Leads', 'leads'),
('leads.edit', 'Edit Leads', 'leads'),
('leads.assign', 'Assign Leads', 'leads'),

-- Analytics
('analytics.view', 'View Analytics', 'analytics'),
('analytics.export', 'Export Analytics', 'analytics'),

-- Financial
('payments.view', 'View Payments', 'payments'),
('payments.process', 'Process Payments', 'payments'),
('wallets.view', 'View Wallets', 'wallets'),
('wallets.manage', 'Manage Wallets', 'wallets'),

-- Content Management
('testimonials.view', 'View Testimonials', 'testimonials'),
('testimonials.approve', 'Approve Testimonials', 'testimonials'),
('portfolio.view', 'View Portfolio', 'portfolio'),
('portfolio.manage', 'Manage Portfolio', 'portfolio'),

-- Inventory
('inventory.view', 'View Inventory', 'inventory'),
('inventory.manage', 'Manage Inventory', 'inventory'),

-- Communication
('messages.view', 'View Messages', 'messages'),
('messages.send', 'Send Messages', 'messages'),

-- System
('system.settings', 'System Settings', 'system'),
('system.roles', 'Manage Roles', 'system');

-- Insert menu items
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
-- Super Admin Menu
('Dashboard', 'LayoutDashboard', '/admin/dashboard', NULL, 1),
('Users', 'Users', '/admin/users', NULL, 2),
('Projects', 'FolderOpen', '/admin/projects', NULL, 3),
('Leads', 'Target', '/admin/leads', NULL, 4),
('Analytics', 'BarChart3', '/admin/analytics', NULL, 5),
('Financial', 'CreditCard', NULL, NULL, 6),
('Content', 'FileText', NULL, NULL, 7),
('System', 'Settings', NULL, NULL, 8);

-- Financial submenu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Payments', 'DollarSign', '/admin/payments', (SELECT id FROM menu_items WHERE name = 'Financial'), 1),
('Wallets', 'Wallet', '/admin/wallets', (SELECT id FROM menu_items WHERE name = 'Financial'), 2);

-- Content submenu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Testimonials', 'MessageSquare', '/admin/testimonials', (SELECT id FROM menu_items WHERE name = 'Content'), 1),
('Portfolio', 'Image', '/admin/portfolio', (SELECT id FROM menu_items WHERE name = 'Content'), 2);

-- System submenu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Settings', 'Settings', '/admin/settings', (SELECT id FROM menu_items WHERE name = 'System'), 1),
('Roles & Permissions', 'Shield', '/admin/roles', (SELECT id FROM menu_items WHERE name = 'System'), 2);

-- Operations Team Menu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Operations Dashboard', 'LayoutDashboard', '/operations/dashboard', NULL, 1),
('Project Management', 'FolderOpen', '/operations/projects', NULL, 2),
('Lead Management', 'Target', '/operations/leads', NULL, 3),
('Team Performance', 'TrendingUp', '/operations/performance', NULL, 4),
('Reports', 'FileBarChart', '/operations/reports', NULL, 5);

-- Project Manager Menu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('PM Dashboard', 'LayoutDashboard', '/pm/dashboard', NULL, 1),
('My Projects', 'FolderOpen', '/pm/projects', NULL, 2),
('Team Tasks', 'CheckSquare', '/pm/tasks', NULL, 3),
('Timeline', 'Calendar', '/pm/timeline', NULL, 4),
('Communication', 'MessageCircle', '/pm/communication', NULL, 5);

-- Interior Designer Menu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Designer Dashboard', 'LayoutDashboard', '/designer/dashboard', NULL, 1),
('Active Projects', 'Hammer', '/designer/projects', NULL, 2),
('Portfolio', 'Image', '/designer/portfolio', NULL, 3),
('Client Communication', 'MessageCircle', '/designer/communication', NULL, 4),
('Earnings', 'DollarSign', '/designer/earnings', NULL, 5);

-- Homeowner Menu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('My Dashboard', 'LayoutDashboard', '/homeowner/dashboard', NULL, 1),
('My Projects', 'Home', '/homeowner/projects', NULL, 2),
('Find Designers', 'Search', '/homeowner/designers', NULL, 3),
('Messages', 'MessageCircle', '/homeowner/messages', NULL, 4),
('Payments', 'CreditCard', '/homeowner/payments', NULL, 5);

-- Vendor Menu
INSERT INTO menu_items (name, icon, route, parent_id, sort_order) VALUES
('Vendor Dashboard', 'LayoutDashboard', '/vendor/dashboard', NULL, 1),
('Orders', 'Package', '/vendor/orders', NULL, 2),
('Inventory', 'Box', '/vendor/inventory', NULL, 3),
('Payments', 'DollarSign', '/vendor/payments', NULL, 4),
('Analytics', 'BarChart3', '/vendor/analytics', NULL, 5);

-- Insert cities
INSERT INTO cities (name, state, country) VALUES
('Mumbai', 'Maharashtra', 'India'),
('Delhi', 'Delhi', 'India'),
('Bangalore', 'Karnataka', 'India'),
('Chennai', 'Tamil Nadu', 'India'),
('Hyderabad', 'Telangana', 'India'),
('Pune', 'Maharashtra', 'India'),
('Kolkata', 'West Bengal', 'India'),
('Ahmedabad', 'Gujarat', 'India'),
('Jaipur', 'Rajasthan', 'India'),
('Lucknow', 'Uttar Pradesh', 'India');

-- Insert inventory categories
INSERT INTO inventory_categories (name, parent_id) VALUES
('Furniture', NULL),
('Lighting', NULL),
('Flooring', NULL),
('Wall Finishes', NULL),
('Kitchen & Bath', NULL),
('Textiles', NULL),
('Accessories', NULL);

INSERT INTO inventory_categories (name, parent_id) VALUES
('Sofas', (SELECT id FROM inventory_categories WHERE name = 'Furniture')),
('Chairs', (SELECT id FROM inventory_categories WHERE name = 'Furniture')),
('Tables', (SELECT id FROM inventory_categories WHERE name = 'Furniture')),
('Storage', (SELECT id FROM inventory_categories WHERE name = 'Furniture')),
('Chandeliers', (SELECT id FROM inventory_categories WHERE name = 'Lighting')),
('Pendant Lights', (SELECT id FROM inventory_categories WHERE name = 'Lighting')),
('Floor Lamps', (SELECT id FROM inventory_categories WHERE name = 'Lighting'));
