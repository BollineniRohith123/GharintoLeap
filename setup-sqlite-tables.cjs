#!/usr/bin/env node

/**
 * Setup complete SQLite database with all necessary tables
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('./gharinto_dev.db');

console.log('🔧 Setting up complete SQLite database...\n');

// Create all necessary tables
console.log('📊 Creating tables...');

// Permissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Role Permissions junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  )
`);

// Menus table
db.exec(`
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    icon TEXT,
    path TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES menus(id)
  )
`);

// Role Menus junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS role_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    can_view INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, menu_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
  )
`);

console.log('✅ Tables created\n');

// Insert permissions
console.log('🔐 Creating permissions...');

const permissions = [
  // User management
  { name: 'users.view', display_name: 'View Users', resource: 'users', action: 'view' },
  { name: 'users.create', display_name: 'Create Users', resource: 'users', action: 'create' },
  { name: 'users.edit', display_name: 'Edit Users', resource: 'users', action: 'edit' },
  { name: 'users.delete', display_name: 'Delete Users', resource: 'users', action: 'delete' },
  
  // Project management
  { name: 'projects.view', display_name: 'View Projects', resource: 'projects', action: 'view' },
  { name: 'projects.create', display_name: 'Create Projects', resource: 'projects', action: 'create' },
  { name: 'projects.edit', display_name: 'Edit Projects', resource: 'projects', action: 'edit' },
  { name: 'projects.delete', display_name: 'Delete Projects', resource: 'projects', action: 'delete' },
  
  // Lead management
  { name: 'leads.view', display_name: 'View Leads', resource: 'leads', action: 'view' },
  { name: 'leads.create', display_name: 'Create Leads', resource: 'leads', action: 'create' },
  { name: 'leads.edit', display_name: 'Edit Leads', resource: 'leads', action: 'edit' },
  { name: 'leads.assign', display_name: 'Assign Leads', resource: 'leads', action: 'assign' },
  
  // Analytics
  { name: 'analytics.view', display_name: 'View Analytics', resource: 'analytics', action: 'view' },
  
  // Materials
  { name: 'materials.view', display_name: 'View Materials', resource: 'materials', action: 'view' },
  { name: 'materials.manage', display_name: 'Manage Materials', resource: 'materials', action: 'manage' },
  
  // Vendors
  { name: 'vendors.view', display_name: 'View Vendors', resource: 'vendors', action: 'view' },
  { name: 'vendors.manage', display_name: 'Manage Vendors', resource: 'vendors', action: 'manage' },
];

const insertPermission = db.prepare(`
  INSERT OR IGNORE INTO permissions (name, display_name, description, resource, action)
  VALUES (?, ?, ?, ?, ?)
`);

permissions.forEach(perm => {
  insertPermission.run(perm.name, perm.display_name, perm.display_name, perm.resource, perm.action);
});

console.log(`✅ ${permissions.length} permissions created\n`);

// Assign permissions to roles
console.log('🔗 Assigning permissions to roles...');

// Get role IDs
const superAdminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('super_admin');
const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');
const pmRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('project_manager');
const designerRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('interior_designer');
const customerRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('customer');
const vendorRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('vendor');

const insertRolePermission = db.prepare(`
  INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  VALUES (?, ?)
`);

// Super Admin gets all permissions
if (superAdminRole) {
  const allPermissions = db.prepare('SELECT id FROM permissions').all();
  allPermissions.forEach(perm => {
    insertRolePermission.run(superAdminRole.id, perm.id);
  });
  console.log(`   ✅ Super Admin: ${allPermissions.length} permissions`);
}

// Admin permissions
if (adminRole) {
  const adminPerms = ['users.view', 'users.create', 'users.edit', 'projects.view', 'projects.create', 
                      'projects.edit', 'leads.view', 'leads.create', 'leads.edit', 'leads.assign',
                      'analytics.view', 'materials.view', 'vendors.view'];
  adminPerms.forEach(permName => {
    const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName);
    if (perm) insertRolePermission.run(adminRole.id, perm.id);
  });
  console.log(`   ✅ Admin: ${adminPerms.length} permissions`);
}

// Project Manager permissions
if (pmRole) {
  const pmPerms = ['projects.view', 'projects.edit', 'leads.view', 'analytics.view'];
  pmPerms.forEach(permName => {
    const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName);
    if (perm) insertRolePermission.run(pmRole.id, perm.id);
  });
  console.log(`   ✅ Project Manager: ${pmPerms.length} permissions`);
}

// Interior Designer permissions
if (designerRole) {
  const designerPerms = ['projects.view', 'projects.edit', 'materials.view', 'leads.view'];
  designerPerms.forEach(permName => {
    const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName);
    if (perm) insertRolePermission.run(designerRole.id, perm.id);
  });
  console.log(`   ✅ Interior Designer: ${designerPerms.length} permissions`);
}

// Customer permissions
if (customerRole) {
  const customerPerms = ['projects.view'];
  customerPerms.forEach(permName => {
    const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName);
    if (perm) insertRolePermission.run(customerRole.id, perm.id);
  });
  console.log(`   ✅ Customer: ${customerPerms.length} permissions`);
}

// Vendor permissions
if (vendorRole) {
  const vendorPerms = ['materials.view', 'materials.manage', 'vendors.view'];
  vendorPerms.forEach(permName => {
    const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permName);
    if (perm) insertRolePermission.run(vendorRole.id, perm.id);
  });
  console.log(`   ✅ Vendor: ${vendorPerms.length} permissions`);
}

console.log('\n📋 Creating menus...');

// Insert menus
const menus = [
  { name: 'dashboard', display_name: 'Dashboard', icon: 'Home', path: '/dashboard', sort_order: 1 },
  { name: 'analytics', display_name: 'Analytics', icon: 'BarChart3', path: '/analytics', sort_order: 2 },
  { name: 'projects', display_name: 'Projects', icon: 'Briefcase', path: '/projects', sort_order: 3 },
  { name: 'leads', display_name: 'Leads', icon: 'Users', path: '/leads', sort_order: 4 },
  { name: 'materials', display_name: 'Materials', icon: 'Package', path: '/materials', sort_order: 5 },
  { name: 'vendors', display_name: 'Vendors', icon: 'Building', path: '/vendors', sort_order: 6 },
  { name: 'finance', display_name: 'Finance', icon: 'DollarSign', path: '/finance', sort_order: 7 },
  { name: 'communications', display_name: 'Communications', icon: 'MessageSquare', path: '/communications', sort_order: 8 },
  { name: 'users', display_name: 'User Management', icon: 'Shield', path: '/users', sort_order: 9 },
  { name: 'settings', display_name: 'Settings', icon: 'Settings', path: '/settings', sort_order: 10 },
];

const insertMenu = db.prepare(`
  INSERT OR IGNORE INTO menus (name, display_name, icon, path, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

menus.forEach(menu => {
  insertMenu.run(menu.name, menu.display_name, menu.icon, menu.path, menu.sort_order);
});

console.log(`✅ ${menus.length} menus created\n`);

// Assign menus to roles
console.log('🔗 Assigning menus to roles...');

const insertRoleMenu = db.prepare(`
  INSERT OR IGNORE INTO role_menus (role_id, menu_id, can_view)
  VALUES (?, ?, 1)
`);

// Super Admin gets all menus
if (superAdminRole) {
  const allMenus = db.prepare('SELECT id FROM menus').all();
  allMenus.forEach(menu => {
    insertRoleMenu.run(superAdminRole.id, menu.id);
  });
  console.log(`   ✅ Super Admin: ${allMenus.length} menus`);
}

// Admin menus
if (adminRole) {
  const adminMenus = ['dashboard', 'analytics', 'projects', 'leads', 'materials', 'vendors', 'users'];
  adminMenus.forEach(menuName => {
    const menu = db.prepare('SELECT id FROM menus WHERE name = ?').get(menuName);
    if (menu) insertRoleMenu.run(adminRole.id, menu.id);
  });
  console.log(`   ✅ Admin: ${adminMenus.length} menus`);
}

// Project Manager menus
if (pmRole) {
  const pmMenus = ['dashboard', 'projects', 'leads', 'analytics'];
  pmMenus.forEach(menuName => {
    const menu = db.prepare('SELECT id FROM menus WHERE name = ?').get(menuName);
    if (menu) insertRoleMenu.run(pmRole.id, menu.id);
  });
  console.log(`   ✅ Project Manager: ${pmMenus.length} menus`);
}

// Interior Designer menus
if (designerRole) {
  const designerMenus = ['dashboard', 'projects', 'materials', 'communications'];
  designerMenus.forEach(menuName => {
    const menu = db.prepare('SELECT id FROM menus WHERE name = ?').get(menuName);
    if (menu) insertRoleMenu.run(designerRole.id, menu.id);
  });
  console.log(`   ✅ Interior Designer: ${designerMenus.length} menus`);
}

// Customer menus
if (customerRole) {
  const customerMenus = ['dashboard', 'projects', 'communications'];
  customerMenus.forEach(menuName => {
    const menu = db.prepare('SELECT id FROM menus WHERE name = ?').get(menuName);
    if (menu) insertRoleMenu.run(customerRole.id, menu.id);
  });
  console.log(`   ✅ Customer: ${customerMenus.length} menus`);
}

// Vendor menus
if (vendorRole) {
  const vendorMenus = ['dashboard', 'materials', 'finance', 'communications'];
  vendorMenus.forEach(menuName => {
    const menu = db.prepare('SELECT id FROM menus WHERE name = ?').get(menuName);
    if (menu) insertRoleMenu.run(vendorRole.id, menu.id);
  });
  console.log(`   ✅ Vendor: ${vendorMenus.length} menus`);
}

db.close();

console.log('\n🎉 Database setup completed successfully!');
console.log('✨ You can now start the server with: node backend/server-sqlite.js');

