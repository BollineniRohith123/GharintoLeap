#!/usr/bin/env node

/**
 * 🔐 QUICK PASSWORD RESET UTILITY
 * Simple utility to reset passwords and set up test accounts
 */

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'fs';

// Create SQLite database
const db = new Database('./gharinto_dev.db');

// Create basic tables
const setupTables = () => {
  console.log('📊 Setting up basic database tables...');
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      is_active INTEGER DEFAULT 1,
      email_verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User roles junction
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      role_id INTEGER REFERENCES roles(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    )
  `);

  // Password reset tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Basic tables created');
};

// Create test users
const createTestUsers = async () => {
  console.log('👤 Creating test users with known passwords...');

  // First create roles
  const roles = [
    { name: 'super_admin', display_name: 'Super Administrator' },
    { name: 'admin', display_name: 'Administrator' },
    { name: 'project_manager', display_name: 'Project Manager' },
    { name: 'interior_designer', display_name: 'Interior Designer' },
    { name: 'customer', display_name: 'Customer' },
    { name: 'vendor', display_name: 'Vendor' },
    { name: 'finance_manager', display_name: 'Finance Manager' }
  ];

  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (name, display_name, description) 
    VALUES (?, ?, ?)
  `);

  roles.forEach(role => {
    insertRole.run(role.name, role.display_name, role.display_name);
  });

  // Create test users
  const testUsers = [
    {
      email: 'admin@gharinto.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '9999999999',
      city: 'Mumbai',
      role: 'admin'
    },
    {
      email: 'superadmin@gharinto.com',
      password: 'superadmin123',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '9999999998',
      city: 'Mumbai',
      role: 'super_admin'
    },
    {
      email: 'pm@gharinto.com',
      password: 'pm123',
      firstName: 'Project',
      lastName: 'Manager',
      phone: '9999999997',
      city: 'Mumbai',
      role: 'project_manager'
    },
    {
      email: 'designer@gharinto.com',
      password: 'designer123',
      firstName: 'Interior',
      lastName: 'Designer',
      phone: '9999999996',
      city: 'Mumbai',
      role: 'interior_designer'
    },
    {
      email: 'customer@gharinto.com',
      password: 'customer123',
      firstName: 'Test',
      lastName: 'Customer',
      phone: '9999999995',
      city: 'Mumbai',
      role: 'customer'
    },
    {
      email: 'vendor@gharinto.com',
      password: 'vendor123',
      firstName: 'Test',
      lastName: 'Vendor',
      phone: '9999999994',
      city: 'Mumbai',
      role: 'vendor'
    },
    {
      email: 'finance@gharinto.com',
      password: 'finance123',
      firstName: 'Finance',
      lastName: 'Manager',
      phone: '9999999993',
      city: 'Mumbai',
      role: 'finance_manager'
    }
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1)
  `);

  const insertUserRole = db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id)
    VALUES (?, ?)
  `);

  const getRoleId = db.prepare('SELECT id FROM roles WHERE name = ?');
  const getUserId = db.prepare('SELECT id FROM users WHERE email = ?');

  for (const user of testUsers) {
    try {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Insert user
      insertUser.run(user.email, passwordHash, user.firstName, user.lastName, user.phone, user.city);
      
      // Get user ID and role ID
      const userData = getUserId.get(user.email);
      const roleData = getRoleId.get(user.role);
      
      if (userData && roleData) {
        insertUserRole.run(userData.id, roleData.id);
      }

      console.log(`   ✅ ${user.email} (${user.role}) - Password: ${user.password}`);
    } catch (error) {
      console.log(`   ❌ ${user.email}: ${error.message}`);
    }
  }
};

// Reset specific user password
const resetUserPassword = async (email, newPassword) => {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateUser = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    const result = updateUser.run(passwordHash, email);
    
    if (result.changes > 0) {
      console.log(`✅ Password reset successful for ${email}`);
      console.log(`🔑 New password: ${newPassword}`);
      return true;
    } else {
      console.log(`❌ User not found: ${email}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Password reset failed: ${error.message}`);
    return false;
  }
};

// List all users
const listUsers = () => {
  console.log('👥 Current users in database:');
  const users = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, r.name as role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ORDER BY u.created_at DESC
  `).all();

  users.forEach(user => {
    console.log(`   📧 ${user.email} - ${user.first_name} ${user.last_name} (${user.role || 'No role'})`);
  });

  return users;
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || '--setup';

  console.log('🔐 GHARINTO LEAP PASSWORD RESET UTILITY');
  console.log('═══════════════════════════════════════════\n');

  try {
    setupTables();

    switch (command) {
      case '--setup':
        await createTestUsers();
        console.log('\n🎉 Setup completed! You can now use any of the test accounts above.');
        break;
        
      case '--reset':
        const email = args[1];
        const password = args[2] || 'newpassword123';
        
        if (!email) {
          console.log('❌ Please provide email: node password-reset.js --reset user@example.com [newpassword]');
          break;
        }
        
        await resetUserPassword(email, password);
        break;
        
      case '--list':
        listUsers();
        break;
        
      default:
        console.log('Available commands:');
        console.log('  --setup                           # Create test accounts');
        console.log('  --reset email [password]          # Reset specific user password');
        console.log('  --list                           # List all users');
    }

    console.log('\n📱 You can now start the server and login with these credentials!');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    db.close();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;