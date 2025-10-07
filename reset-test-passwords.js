const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gharinto_db',
  user: 'postgres',
  password: '1234'
});

async function resetPasswords() {
  try {
    console.log('🔐 Resetting test user passwords...');
    
    const users = [
      { email: 'superadmin@gharinto.com', password: 'superadmin123' },
      { email: 'admin@gharinto.com', password: 'admin123' },
      { email: 'pm@gharinto.com', password: 'pm123' },
      { email: 'designer@gharinto.com', password: 'designer123' },
      { email: 'customer@gharinto.com', password: 'customer123' },
      { email: 'vendor@gharinto.com', password: 'vendor123' }
    ];

    for (const user of users) {
      console.log(`Updating password for: ${user.email}`);
      
      // Hash the password
      const hash = await bcrypt.hash(user.password, 10);
      
      // Update the database
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hash, user.email]
      );
      
      console.log(`  ✅ Updated (${result.rowCount} rows affected)`);
    }
    
    console.log('\n🎉 Password reset complete!');
    
    // Test one login
    console.log('\n🧪 Testing SuperAdmin login...');
    const testResult = await pool.query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['superadmin@gharinto.com']
    );
    
    if (testResult.rows.length > 0) {
      const user = testResult.rows[0];
      const isValid = await bcrypt.compare('superadmin123', user.password_hash);
      console.log(`Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

resetPasswords();
