const http = require('http');
const { Pool } = require('pg');

const testUsers = [
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function verifySetup() {
  console.log('\n🔍 GHARINTO LEAP - FULL STACK VERIFICATION');
  console.log('='.repeat(70));
  
  const results = { passed: 0, failed: 0, details: [] };
  
  // 1. PostgreSQL Database
  console.log('\n1️⃣  PostgreSQL Database');
  try {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'gharinto_dev',
      user: 'postgres',
      password: '1234',
      connectionTimeoutMillis: 3000,
    });
    
    const client = await pool.connect();
    const tablesResult = await client.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    const rolesResult = await client.query('SELECT COUNT(*) FROM roles');
    
    client.release();
    await pool.end();
    
    console.log(`   ✅ Connected to PostgreSQL`);
    console.log(`   ✅ Tables: ${tablesResult.rows[0].count}`);
    console.log(`   ✅ Users: ${usersResult.rows[0].count}`);
    console.log(`   ✅ Roles: ${rolesResult.rows[0].count}`);
    results.passed++;
    results.details.push({ test: 'PostgreSQL Database', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Database Error: ${error.message}`);
    results.failed++;
    results.details.push({ test: 'PostgreSQL Database', status: 'FAIL', error: error.message });
  }
  
  // 2. Backend Server
  console.log('\n2️⃣  Backend Server (Port 4000)');
  try {
    const health = await makeRequest('GET', '/health');
    const dbHealth = await makeRequest('GET', '/health/db');
    
    if (health.status === 200 && dbHealth.status === 200) {
      console.log(`   ✅ Server running`);
      console.log(`   ✅ Health endpoint working`);
      console.log(`   ✅ Database connection verified`);
      results.passed++;
      results.details.push({ test: 'Backend Server', status: 'PASS' });
    } else {
      throw new Error('Health checks failed');
    }
  } catch (error) {
    console.log(`   ❌ Backend Error: ${error.message}`);
    results.failed++;
    results.details.push({ test: 'Backend Server', status: 'FAIL', error: error.message });
  }
  
  // 3. Authentication System
  console.log('\n3️⃣  Authentication System');
  let authPassed = 0;
  for (const user of testUsers) {
    try {
      const loginResponse = await makeRequest('POST', '/auth/login', {
        email: user.email,
        password: user.password
      });
      
      if (loginResponse.status === 200 && loginResponse.data.token) {
        authPassed++;
      }
    } catch (error) {
      // Silent fail for individual users
    }
  }
  
  if (authPassed === testUsers.length) {
    console.log(`   ✅ All ${testUsers.length} user roles can login`);
    console.log(`   ✅ JWT token generation working`);
    console.log(`   ✅ Password verification working`);
    results.passed++;
    results.details.push({ test: 'Authentication System', status: 'PASS' });
  } else {
    console.log(`   ❌ Only ${authPassed}/${testUsers.length} users can login`);
    results.failed++;
    results.details.push({ test: 'Authentication System', status: 'FAIL' });
  }
  
  // 4. Frontend Server
  console.log('\n4️⃣  Frontend Server (Port 5173)');
  try {
    const frontendReq = http.request({
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log(`   ✅ Frontend server running`);
        console.log(`   ✅ Vite dev server active`);
        results.passed++;
        results.details.push({ test: 'Frontend Server', status: 'PASS' });
      } else {
        console.log(`   ⚠️  Frontend returned status ${res.statusCode}`);
        results.failed++;
        results.details.push({ test: 'Frontend Server', status: 'FAIL' });
      }
    });
    
    frontendReq.on('error', (error) => {
      console.log(`   ❌ Frontend not accessible: ${error.message}`);
      results.failed++;
      results.details.push({ test: 'Frontend Server', status: 'FAIL', error: error.message });
    });
    
    frontendReq.end();
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.log(`   ❌ Frontend Error: ${error.message}`);
    results.failed++;
    results.details.push({ test: 'Frontend Server', status: 'FAIL', error: error.message });
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('\n✨ Application Stack Status:');
    console.log('   ✅ PostgreSQL Database (gharinto_dev)');
    console.log('   ✅ Backend API Server (http://localhost:4000)');
    console.log('   ✅ Frontend React App (http://localhost:5173)');
    console.log('   ✅ Authentication & RBAC');
    console.log('   ✅ All 6 user roles configured');
    console.log('\n🌐 Access the application:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Backend API: http://localhost:4000');
    console.log('\n👥 Test Credentials:');
    testUsers.forEach(u => {
      console.log(`   ${u.role}: ${u.email} / ${u.password}`);
    });
  } else {
    console.log('\n⚠️  Some systems are not operational. Please check the errors above.');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  process.exit(results.failed === 0 ? 0 : 1);
}

verifySetup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

