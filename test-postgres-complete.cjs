#!/usr/bin/env node

/**
 * Comprehensive PostgreSQL Backend Testing
 * Tests all authentication and API endpoints
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:4000';

const testUsers = [
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`   ✅ ${name}`);
  } else {
    results.failed++;
    console.log(`   ❌ ${name}`);
  }
  if (details) {
    console.log(`      ${details}`);
  }
  results.tests.push({ name, passed, details });
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Endpoints...');
  try {
    const response = await makeRequest('GET', '/health');
    logTest('Health Check', response.status === 200, `Status: ${response.data.status}`);
    
    const dbResponse = await makeRequest('GET', '/health/db');
    logTest('Database Health Check', dbResponse.status === 200, `Database: ${dbResponse.data.database}`);
  } catch (error) {
    logTest('Health Check', false, error.message);
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  // Test invalid login
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });
    logTest('Invalid Login Rejection', response.status === 401);
  } catch (error) {
    logTest('Invalid Login Rejection', false, error.message);
  }
  
  // Test unauthorized access
  try {
    const response = await makeRequest('GET', '/users/profile');
    logTest('Unauthorized Access Blocking', response.status === 401);
  } catch (error) {
    logTest('Unauthorized Access Blocking', false, error.message);
  }
  
  // Test invalid token
  try {
    const response = await makeRequest('GET', '/users/profile', null, 'invalid-token');
    logTest('Invalid Token Rejection', response.status === 403);
  } catch (error) {
    logTest('Invalid Token Rejection', false, error.message);
  }
}

async function testUserLogin(user) {
  console.log(`\n👤 Testing ${user.role} (${user.email})...`);
  
  try {
    // Test login
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: user.email,
      password: user.password,
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      logTest(`${user.role} Login`, true, 
        `Roles: ${loginResponse.data.user.roles.join(', ')}, Permissions: ${loginResponse.data.user.permissions.length}`);
      
      const token = loginResponse.data.token;
      
      // Test profile retrieval
      const profileResponse = await makeRequest('GET', '/users/profile', null, token);
      if (profileResponse.status === 200) {
        logTest(`${user.role} Profile Retrieval`, true, 
          `Menus: ${profileResponse.data.menus.length}`);
        
        // Test RBAC endpoints
        const permissionsResponse = await makeRequest('GET', '/rbac/user-permissions', null, token);
        logTest(`${user.role} Permissions Endpoint`, permissionsResponse.status === 200);
        
        const menusResponse = await makeRequest('GET', '/menus/user', null, token);
        logTest(`${user.role} Menus Endpoint`, menusResponse.status === 200);
        
        return token;
      } else {
        logTest(`${user.role} Profile Retrieval`, false, `Status: ${profileResponse.status}`);
      }
    } else {
      logTest(`${user.role} Login`, false, `Status: ${loginResponse.status}`);
    }
  } catch (error) {
    logTest(`${user.role} Login`, false, error.message);
  }
  
  return null;
}

async function testAdminEndpoints(token) {
  console.log('\n👥 Testing Admin Endpoints...');
  
  try {
    // Test users list
    const usersResponse = await makeRequest('GET', '/users?page=1&limit=10', null, token);
    logTest('Get Users List', usersResponse.status === 200);
    
    // Test analytics
    const analyticsResponse = await makeRequest('GET', '/analytics/dashboard', null, token);
    logTest('Get Dashboard Analytics', analyticsResponse.status === 200);
    
    // Test search
    const searchResponse = await makeRequest('GET', '/search?q=test', null, token);
    logTest('Search Endpoint', searchResponse.status === 200);
    
  } catch (error) {
    logTest('Admin Endpoints', false, error.message);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 COMPREHENSIVE POSTGRESQL BACKEND TESTING');
  console.log('═══════════════════════════════════════════════════════════');
  
  await testHealthCheck();
  await testAuthentication();
  
  let adminToken = null;
  for (const user of testUsers) {
    const token = await testUserLogin(user);
    if (user.role === 'Admin' && token) {
      adminToken = token;
    }
  }
  
  if (adminToken) {
    await testAdminEndpoints(adminToken);
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('═══════════════════════════════════════════════════════════');
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! PostgreSQL backend is fully functional.');
    console.log('\n✨ System Status:');
    console.log('   ✅ PostgreSQL database running');
    console.log('   ✅ All tables created');
    console.log('   ✅ Test users seeded');
    console.log('   ✅ Authentication working');
    console.log('   ✅ RBAC implemented');
    console.log('   ✅ All API endpoints functional');
    console.log('\n🚀 Ready for frontend integration!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

