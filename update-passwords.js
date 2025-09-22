import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gharinto_dev',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
});

async function updatePasswords() {
  try {
    console.log('🔐 Generating new bcrypt hash for password123...');
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log(`✅ Generated hash: ${hash}`);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log(`✅ Hash validation test: ${isValid}`);
    
    if (!isValid) {
      throw new Error('Generated hash failed validation test');
    }
    
    console.log('📝 Updating all test users with new password hash...');
    
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1
      WHERE email IN (
        'superadmin@gharinto.com',
        'admin@gharinto.com', 
        'pm@gharinto.com',
        'designer@gharinto.com',
        'customer@gharinto.com',
        'vendor@gharinto.com',
        'operations@gharinto.com'
      )
    `;
    
    const result = await pool.query(updateQuery, [hash]);
    console.log(`✅ Updated ${result.rowCount} users`);
    
    // Verify the update
    const verifyQuery = `
      SELECT email, 
             CASE 
               WHEN password_hash = $1 THEN 'UPDATED' 
               ELSE 'OLD_HASH' 
             END as status
      FROM users 
      WHERE email IN (
        'superadmin@gharinto.com',
        'admin@gharinto.com', 
        'pm@gharinto.com',
        'designer@gharinto.com',
        'customer@gharinto.com',
        'vendor@gharinto.com',
        'operations@gharinto.com'
      )
      ORDER BY email
    `;
    
    const verifyResult = await pool.query(verifyQuery, [hash]);
    console.log('🔍 Verification results:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.status}`);
    });
    
    console.log('🎉 Password update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await pool.end();
  }
}

updatePasswords();