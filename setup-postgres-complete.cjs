#!/usr/bin/env node

/**
 * Complete PostgreSQL Setup Script
 * Runs all migrations and seeds data
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbName = process.argv[2] || 'gharinto_dev';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: dbName,
  user: 'postgres',
  password: 'postgres',
});

console.log('🚀 Starting Complete PostgreSQL Setup\n');
console.log('═══════════════════════════════════════════════════════════\n');

async function runMigrations() {
  console.log('📊 Running Migrations...\n');
  
  const migrationsDir = path.join(__dirname, 'backend', 'db', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  Migrations directory not found, using inline schema...\n');
    return runInlineSchema();
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.up.sql'))
    .sort();
  
  for (const file of files) {
    console.log(`   📄 Running: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`   ✅ ${file} completed`);
    } catch (error) {
      console.log(`   ⚠️  ${file}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Migrations completed\n');
}

async function runInlineSchema() {
  console.log('📊 Creating tables from inline schema...\n');
  
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      avatar_url TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100) DEFAULT 'India',
      is_active BOOLEAN DEFAULT TRUE,
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Roles table
    CREATE TABLE IF NOT EXISTS roles (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Permissions table
    CREATE TABLE IF NOT EXISTS permissions (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(150) NOT NULL,
      description TEXT,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Role Permissions junction
    CREATE TABLE IF NOT EXISTS role_permissions (
      id BIGSERIAL PRIMARY KEY,
      role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
      permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(role_id, permission_id)
    );

    -- User Roles junction
    CREATE TABLE IF NOT EXISTS user_roles (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
      assigned_by BIGINT REFERENCES users(id),
      assigned_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, role_id)
    );

    -- Menus table
    CREATE TABLE IF NOT EXISTS menus (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      display_name VARCHAR(150) NOT NULL,
      icon VARCHAR(50),
      path VARCHAR(200),
      parent_id BIGINT REFERENCES menus(id),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Role Menus junction
    CREATE TABLE IF NOT EXISTS role_menus (
      id BIGSERIAL PRIMARY KEY,
      role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
      menu_id BIGINT REFERENCES menus(id) ON DELETE CASCADE,
      can_view BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(role_id, menu_id)
    );

    -- Analytics Events table
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      user_id BIGINT REFERENCES users(id),
      properties JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  try {
    await pool.query(schema);
    console.log('✅ Tables created successfully\n');
  } catch (error) {
    console.log(`⚠️  Error creating tables: ${error.message}\n`);
  }
}

async function seedData() {
  console.log('🌱 Seeding Data...\n');
  
  // Create roles
  console.log('   👥 Creating roles...');
  const roles = [
    { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access' },
    { name: 'admin', display_name: 'Admin', description: 'Administrative access' },
    { name: 'project_manager', display_name: 'Project Manager', description: 'Manage projects' },
    { name: 'interior_designer', display_name: 'Interior Designer', description: 'Design management' },
    { name: 'customer', display_name: 'Customer', description: 'Client access' },
    { name: 'vendor', display_name: 'Vendor', description: 'Supplier access' },
  ];
  
  for (const role of roles) {
    await pool.query(
      `INSERT INTO roles (name, display_name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
      [role.name, role.display_name, role.description]
    );
  }
  console.log('   ✅ Roles created\n');
  
  // Create permissions
  console.log('   🔐 Creating permissions...');
  const permissions = [
    { name: 'users.view', display_name: 'View Users', resource: 'users', action: 'view' },
    { name: 'users.create', display_name: 'Create Users', resource: 'users', action: 'create' },
    { name: 'users.edit', display_name: 'Edit Users', resource: 'users', action: 'edit' },
    { name: 'users.delete', display_name: 'Delete Users', resource: 'users', action: 'delete' },
    { name: 'projects.view', display_name: 'View Projects', resource: 'projects', action: 'view' },
    { name: 'projects.create', display_name: 'Create Projects', resource: 'projects', action: 'create' },
    { name: 'projects.edit', display_name: 'Edit Projects', resource: 'projects', action: 'edit' },
    { name: 'projects.delete', display_name: 'Delete Projects', resource: 'projects', action: 'delete' },
    { name: 'leads.view', display_name: 'View Leads', resource: 'leads', action: 'view' },
    { name: 'leads.create', display_name: 'Create Leads', resource: 'leads', action: 'create' },
    { name: 'leads.edit', display_name: 'Edit Leads', resource: 'leads', action: 'edit' },
    { name: 'leads.assign', display_name: 'Assign Leads', resource: 'leads', action: 'assign' },
    { name: 'analytics.view', display_name: 'View Analytics', resource: 'analytics', action: 'view' },
    { name: 'materials.view', display_name: 'View Materials', resource: 'materials', action: 'view' },
    { name: 'materials.manage', display_name: 'Manage Materials', resource: 'materials', action: 'manage' },
    { name: 'vendors.view', display_name: 'View Vendors', resource: 'vendors', action: 'view' },
    { name: 'vendors.manage', display_name: 'Manage Vendors', resource: 'vendors', action: 'manage' },
  ];
  
  for (const perm of permissions) {
    await pool.query(
      `INSERT INTO permissions (name, display_name, description, resource, action) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
      [perm.name, perm.display_name, perm.display_name, perm.resource, perm.action]
    );
  }
  console.log('   ✅ Permissions created\n');
  
  // Assign permissions to roles
  console.log('   🔗 Assigning permissions to roles...');
  
  // Super Admin gets all permissions
  const superAdminRole = await pool.query(`SELECT id FROM roles WHERE name = 'super_admin'`);
  if (superAdminRole.rows.length > 0) {
    const allPerms = await pool.query(`SELECT id FROM permissions`);
    for (const perm of allPerms.rows) {
      await pool.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [superAdminRole.rows[0].id, perm.id]
      );
    }
  }
  
  // Admin permissions
  const adminRole = await pool.query(`SELECT id FROM roles WHERE name = 'admin'`);
  if (adminRole.rows.length > 0) {
    const adminPerms = ['users.view', 'users.create', 'users.edit', 'projects.view', 'projects.create', 
                        'projects.edit', 'leads.view', 'leads.create', 'leads.edit', 'leads.assign',
                        'analytics.view', 'materials.view', 'vendors.view'];
    for (const permName of adminPerms) {
      const perm = await pool.query(`SELECT id FROM permissions WHERE name = $1`, [permName]);
      if (perm.rows.length > 0) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [adminRole.rows[0].id, perm.rows[0].id]
        );
      }
    }
  }
  
  console.log('   ✅ Permissions assigned\n');
  
  // Create menus
  console.log('   📋 Creating menus...');
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
  
  for (const menu of menus) {
    await pool.query(
      `INSERT INTO menus (name, display_name, icon, path, sort_order) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
      [menu.name, menu.display_name, menu.icon, menu.path, menu.sort_order]
    );
  }
  console.log('   ✅ Menus created\n');
  
  // Assign menus to roles
  console.log('   🔗 Assigning menus to roles...');
  
  // Super Admin gets all menus
  if (superAdminRole.rows.length > 0) {
    const allMenus = await pool.query(`SELECT id FROM menus`);
    for (const menu of allMenus.rows) {
      await pool.query(
        `INSERT INTO role_menus (role_id, menu_id, can_view) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
        [superAdminRole.rows[0].id, menu.id]
      );
    }
  }
  
  // Admin menus
  if (adminRole.rows.length > 0) {
    const adminMenus = ['dashboard', 'analytics', 'projects', 'leads', 'materials', 'vendors', 'users'];
    for (const menuName of adminMenus) {
      const menu = await pool.query(`SELECT id FROM menus WHERE name = $1`, [menuName]);
      if (menu.rows.length > 0) {
        await pool.query(
          `INSERT INTO role_menus (role_id, menu_id, can_view) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
          [adminRole.rows[0].id, menu.rows[0].id]
        );
      }
    }
  }
  
  console.log('   ✅ Menus assigned\n');
  
  // Create test users
  console.log('   👤 Creating test users...');
  const testUsers = [
    { email: 'admin@gharinto.com', password: 'admin123', firstName: 'System', lastName: 'Administrator', role: 'admin' },
    { email: 'superadmin@gharinto.com', password: 'superadmin123', firstName: 'Super', lastName: 'Admin', role: 'super_admin' },
    { email: 'pm@gharinto.com', password: 'pm123', firstName: 'Project', lastName: 'Manager', role: 'project_manager' },
    { email: 'designer@gharinto.com', password: 'designer123', firstName: 'Interior', lastName: 'Designer', role: 'interior_designer' },
    { email: 'customer@gharinto.com', password: 'customer123', firstName: 'Test', lastName: 'Customer', role: 'customer' },
    { email: 'vendor@gharinto.com', password: 'vendor123', firstName: 'Test', lastName: 'Vendor', role: 'vendor' },
  ];
  
  for (const user of testUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [user.email, passwordHash, user.firstName, user.lastName, '9999999999', 'Mumbai']
    );
    
    const userId = userResult.rows[0].id;
    
    // Assign role
    const roleResult = await pool.query(`SELECT id FROM roles WHERE name = $1`, [user.role]);
    if (roleResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, roleResult.rows[0].id]
      );
    }
    
    console.log(`   ✅ ${user.email} (${user.role})`);
  }
  
  console.log('\n✅ Data seeding completed\n');
}

async function main() {
  try {
    await runMigrations();
    await seedData();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 PostgreSQL setup completed successfully!\n');
    console.log('Test Accounts:');
    console.log('  - admin@gharinto.com / admin123');
    console.log('  - superadmin@gharinto.com / superadmin123');
    console.log('  - pm@gharinto.com / pm123');
    console.log('  - designer@gharinto.com / designer123');
    console.log('  - customer@gharinto.com / customer123');
    console.log('  - vendor@gharinto.com / vendor123');
    console.log('\nNext step: cd backend && npm start');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

