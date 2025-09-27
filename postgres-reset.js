#!/usr/bin/env node

/**
 * 🐘 POSTGRESQL PASSWORD RESET & SETUP UTILITY
 * 
 * Gharinto Leap Interior Design Marketplace
 * PostgreSQL-specific password reset and user management tool
 * 
 * Features:
 * ✅ PostgreSQL connection testing
 * ✅ User password reset functionality  
 * ✅ Test account creation
 * ✅ Database health checks
 * ✅ Production-ready error handling
 * 
 * Usage:
 * node postgres-reset.js --test-connection    # Test PostgreSQL connection
 * node postgres-reset.js --create-users       # Create test users
 * node postgres-reset.js --reset-password email newpassword
 * node postgres-reset.js --list-users         # List all users
 * node postgres-reset.js --health-check       # Full health check
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// PostgreSQL Configuration
const config = {
  host: 'localhost',
  port: 5432,
  database: 'gharinto_db',
  user: 'postgres',
  password: 'postgres',
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

console.log('🐘 GHARINTO LEAP POSTGRESQL UTILITY');
console.log('═══════════════════════════════════════════');
console.log(`📍 Connecting to: ${config.host}:${config.port}/${config.database}`);
console.log(`👤 User: ${config.user}`);
console.log('═══════════════════════════════════════════\n');

/**
 * 🔌 Database Connection Manager
 */
class PostgreSQLManager {
  constructor() {
    this.pool = new Pool(config);
    this.connected = false;
  }

  async testConnection() {
    console.log('🔌 Testing PostgreSQL connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT current_database(), current_user, version(), NOW()');
      client.release();
      
      console.log('✅ Connection successful!');
      console.log('📊 Database Info:');
      console.log(`   🗄️  Database: ${result.rows[0].current_database}`);
      console.log(`   👤 User: ${result.rows[0].current_user}`);
      console.log(`   🕐 Time: ${result.rows[0].now}`);
      console.log(`   🏷️  Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
      
      this.connected = true;
      return true;
    } catch (error) {
      console.log('❌ Connection failed!');
      console.log('🔍 Error details:');
      console.log(`   📝 Message: ${error.message}`);
      console.log(`   🏷️  Code: ${error.code}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Solutions:');
        console.log('   1️⃣  Start PostgreSQL service: net start postgresql-x64-16 (as admin)');
        console.log('   2️⃣  Check if PostgreSQL is installed');
        console.log('   3️⃣  Verify port 5432 is not blocked');
      } else if (error.code === '28P01') {
        console.log('\n💡 Authentication issue:');
        console.log('   🔑 Check username/password combination');
        console.log('   📝 Default: postgres/postgres');
      } else if (error.code === '3D000') {
        console.log('\n💡 Database does not exist:');
        console.log('   🗄️  Create database: CREATE DATABASE gharinto_db;');
      }
      
      this.connected = false;
      return false;
    }
  }

  async query(text, params = []) {
    if (!this.connected) {
      throw new Error('❌ Database not connected. Run --test-connection first.');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`❌ Query failed: ${error.message}`);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

/**
 * 👤 User Management
 */
class UserManager {
  constructor(db) {
    this.db = db;
  }

  async createTestUsers() {
    console.log('👤 Creating test users with known passwords...');
    console.log('═══════════════════════════════════════════');

    // Test users for the educational platform
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
        lastName: 'Administrator',
        phone: '9999999998',
        city: 'Mumbai',
        role: 'super_admin'
      },
      {
        email: 'teacher@gharinto.com',
        password: 'teacher123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '9999999997',
        city: 'Delhi',
        role: 'interior_designer'
      },
      {
        email: 'principal@gharinto.com',
        password: 'principal123',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '9999999996',
        city: 'Bangalore',
        role: 'project_manager'
      },
      {
        email: 'student@gharinto.com',
        password: 'student123',
        firstName: 'Emma',
        lastName: 'Williams',
        phone: '9999999995',
        city: 'Chennai',
        role: 'customer'
      },
      {
        email: 'parent@gharinto.com',
        password: 'parent123',
        firstName: 'Robert',
        lastName: 'Davis',
        phone: '9999999994',
        city: 'Pune',
        role: 'customer'
      },
      {
        email: 'vendor@gharinto.com',
        password: 'vendor123',
        firstName: 'Lisa',
        lastName: 'Anderson',
        phone: '9999999993',
        city: 'Hyderabad',
        role: 'vendor'
      },
      {
        email: 'finance@gharinto.com',
        password: 'finance123',
        firstName: 'David',
        lastName: 'Martinez',
        phone: '9999999992',
        city: 'Kolkata',
        role: 'finance_manager'
      }
    ];

    let created = 0;
    let updated = 0;

    for (const user of testUsers) {
      try {
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        // Check if user exists
        const existingUser = await this.db.query('SELECT id FROM users WHERE email = $1', [user.email]);
        
        if (existingUser.rows.length > 0) {
          // Update existing user
          await this.db.query(`
            UPDATE users SET 
              password_hash = $1, 
              first_name = $2, 
              last_name = $3, 
              phone = $4, 
              city = $5,
              updated_at = NOW()
            WHERE email = $6
          `, [passwordHash, user.firstName, user.lastName, user.phone, user.city, user.email]);
          
          updated++;
          console.log(`   🔄 Updated: ${user.email} (${user.role}) - Password: ${user.password}`);
        } else {
          // Create new user
          await this.db.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, true, true)
          `, [user.email, passwordHash, user.firstName, user.lastName, user.phone, user.city]);
          
          created++;
          console.log(`   ✅ Created: ${user.email} (${user.role}) - Password: ${user.password}`);
        }

      } catch (error) {
        console.log(`   ❌ Failed: ${user.email} - ${error.message}`);
      }
    }

    console.log(`\n📊 Summary: ${created} created, ${updated} updated`);
    console.log('\n🎓 K-12 Educational Platform Test Accounts:');
    console.log('   👨‍💼 Administrator: admin@gharinto.com / admin123');
    console.log('   🏫 Principal: principal@gharinto.com / principal123');
    console.log('   👩‍🏫 Teacher: teacher@gharinto.com / teacher123');
    console.log('   👨‍🎓 Student: student@gharinto.com / student123');
    console.log('   👪 Parent: parent@gharinto.com / parent123');
    console.log('   🏢 Vendor: vendor@gharinto.com / vendor123');
    console.log('   💰 Finance: finance@gharinto.com / finance123');

    return { created, updated };
  }

  async resetPassword(email, newPassword) {
    console.log(`🔑 Resetting password for: ${email}`);
    console.log('═══════════════════════════════════════════');

    try {
      // Check if user exists
      const userResult = await this.db.query('SELECT id, first_name, last_name FROM users WHERE email = $1', [email]);
      
      if (userResult.rows.length === 0) {
        console.log('❌ User not found!');
        console.log('💡 Use --list-users to see available users');
        return false;
      }

      const user = userResult.rows[0];
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updateResult = await this.db.query(`
        UPDATE users SET 
          password_hash = $1, 
          updated_at = NOW()
        WHERE email = $2
      `, [passwordHash, email]);

      if (updateResult.rowCount > 0) {
        console.log('✅ Password reset successful!');
        console.log(`👤 User: ${user.first_name} ${user.last_name}`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('🕐 Updated: ' + new Date().toISOString());
        return true;
      } else {
        console.log('❌ Password reset failed - no rows updated');
        return false;
      }

    } catch (error) {
      console.log(`❌ Password reset failed: ${error.message}`);
      return false;
    }
  }

  async listUsers() {
    console.log('👥 Current users in database:');
    console.log('═══════════════════════════════════════════');

    try {
      const result = await this.db.query(`
        SELECT 
          u.id, 
          u.email, 
          u.first_name, 
          u.last_name, 
          u.phone,
          u.city,
          u.is_active,
          u.email_verified,
          u.created_at,
          u.last_login_at,
          COALESCE(string_agg(r.name, ', '), 'No roles') as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.email_verified, u.created_at, u.last_login_at
        ORDER BY u.created_at DESC
      `);

      if (result.rows.length === 0) {
        console.log('📭 No users found in database');
        console.log('💡 Use --create-users to create test accounts');
        return [];
      }

      result.rows.forEach((user, index) => {
        const status = user.is_active ? '🟢' : '🔴';
        const verified = user.email_verified ? '✅' : '❌';
        const lastLogin = user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never';
        
        console.log(`\n${index + 1}. ${status} ${user.first_name} ${user.last_name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   📱 Phone: ${user.phone || 'Not provided'}`);
        console.log(`   🏙️  City: ${user.city || 'Not specified'}`);
        console.log(`   🏷️  Roles: ${user.roles}`);
        console.log(`   ${verified} Verified | 🕐 Last Login: ${lastLogin}`);
      });

      console.log(`\n📊 Total users: ${result.rows.length}`);
      return result.rows;

    } catch (error) {
      console.log(`❌ Failed to list users: ${error.message}`);
      return [];
    }
  }

  async healthCheck() {
    console.log('🏥 Running comprehensive health check...');
    console.log('═══════════════════════════════════════════');

    const checks = [
      { name: 'Database Connection', test: () => this.db.testConnection() },
      { name: 'Users Table', test: () => this.checkUsersTable() },
      { name: 'Roles System', test: () => this.checkRolesSystem() },
      { name: 'Authentication Test', test: () => this.testAuthentication() },
      { name: 'Sample Data', test: () => this.checkSampleData() }
    ];

    let passed = 0;
    const results = [];

    for (const check of checks) {
      try {
        console.log(`🔍 Checking: ${check.name}...`);
        const result = await check.test();
        
        if (result) {
          console.log(`   ✅ ${check.name}: PASSED`);
          passed++;
          results.push({ name: check.name, status: 'PASSED', error: null });
        } else {
          console.log(`   ❌ ${check.name}: FAILED`);
          results.push({ name: check.name, status: 'FAILED', error: 'Test returned false' });
        }
      } catch (error) {
        console.log(`   ❌ ${check.name}: ERROR - ${error.message}`);
        results.push({ name: check.name, status: 'ERROR', error: error.message });
      }
    }

    const percentage = Math.round((passed / checks.length) * 100);
    console.log(`\n🎯 Health Score: ${percentage}% (${passed}/${checks.length} checks passed)`);
    
    if (percentage >= 80) {
      console.log('🎉 System is healthy and ready for use!');
    } else if (percentage >= 60) {
      console.log('⚠️  System has some issues but may be functional');
    } else {
      console.log('🚨 System has critical issues that need attention');
    }

    return { percentage, passed, total: checks.length, results };
  }

  async checkUsersTable() {
    const result = await this.db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    return parseInt(result.rows[0].count) > 0;
  }

  async checkRolesSystem() {
    const result = await this.db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name IN ('roles', 'user_roles', 'role_permissions') 
      AND table_schema = 'public'
    `);
    return parseInt(result.rows[0].count) >= 2; // At least roles and user_roles tables
  }

  async testAuthentication() {
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE email = 'admin@gharinto.com' AND password_hash IS NOT NULL
      `);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      return false;
    }
  }

  async checkSampleData() {
    try {
      const userCount = await this.db.query('SELECT COUNT(*) as count FROM users');
      return parseInt(userCount.rows[0].count) >= 3;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 🎯 Main Application Controller
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--help';

  const db = new PostgreSQLManager();
  const userManager = new UserManager(db);

  try {
    switch (command) {
      case '--test-connection':
        await db.testConnection();
        break;

      case '--create-users':
        if (await db.testConnection()) {
          await userManager.createTestUsers();
        }
        break;

      case '--reset-password':
        const email = args[1];
        const password = args[2] || 'newpassword123';
        
        if (!email) {
          console.log('❌ Usage: --reset-password <email> [password]');
          console.log('Example: --reset-password admin@gharinto.com mynewpassword');
          break;
        }
        
        if (await db.testConnection()) {
          await userManager.resetPassword(email, password);
        }
        break;

      case '--list-users':
        if (await db.testConnection()) {
          await userManager.listUsers();
        }
        break;

      case '--health-check':
        await userManager.healthCheck();
        break;

      case '--help':
      default:
        console.log('🐘 PostgreSQL Utility Commands:');
        console.log('═══════════════════════════════════════════');
        console.log('  --test-connection     Test PostgreSQL connection');
        console.log('  --create-users        Create test user accounts');
        console.log('  --reset-password <email> [password]');
        console.log('                        Reset specific user password');
        console.log('  --list-users          List all users in database');
        console.log('  --health-check        Run comprehensive health check');
        console.log('  --help                Show this help message');
        console.log('\n💡 Examples:');
        console.log('  node postgres-reset.js --test-connection');
        console.log('  node postgres-reset.js --create-users');
        console.log('  node postgres-reset.js --reset-password admin@gharinto.com newpass123');
        console.log('\n🎓 Educational Platform Focus:');
        console.log('  This tool creates accounts suitable for K-12 school administrators,');
        console.log('  management, and educational technology buyers.');
        break;
    }

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;