// Password Update Script for Production Testing
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gharinto_db',
  password: 'postgres',
  port: 5432,
});

async function updateUserPasswords() {
  try {
    console.log('🔐 Updating user passwords for testing...');
    
    // Hash the test password
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    console.log('✅ Password hashed successfully');
    
    // Update all test users with the same password
    const updateQuery = 'UPDATE users SET password_hash = $1';
    await pool.query(updateQuery, [hashedPassword]);
    
    console.log('✅ All user passwords updated successfully');
    
    // Verify the update
    const countQuery = 'SELECT COUNT(*) as count FROM users';
    const result = await pool.query(countQuery);
    
    console.log(`✅ Updated ${result.rows[0].count} user passwords`);
    console.log('🔑 Test password for all users: password123');
    
    await pool.end();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
}

updateUserPasswords();