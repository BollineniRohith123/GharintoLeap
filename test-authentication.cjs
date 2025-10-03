#!/usr/bin/env node

/**
 * Comprehensive Authentication and API Connectivity Test
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:4000';

// Test users
const testUsers = [
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

// Helper function to make HTTP requests
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

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200) {
      console.log('   ✅ Health check passed');
      console.log('   📊 Status:', response.data.status);
      console.log('   💾 Database:', response.data.database);
      return true;
    } else {
      console.log('   ❌ Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

async function testLogin(user) {
  console.log(`\n🔐 Testing Login: ${user.email} (${user.role})`);
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: user.email,
      password: user.password,
    });

    if (response.status === 200 && response.data.token) {
      console.log('   ✅ Login successful');
      console.log('   👤 User:', response.data.user.firstName, response.data.user.lastName);
      console.log('   🎭 Roles:', response.data.user.roles.join(', '));
      console.log('   🔑 Permissions:', response.data.user.permissions.length);
      console.log('   🎫 Token:', response.data.token.substring(0, 50) + '...');
      return response.data.token;
    } else {
      console.log('   ❌ Login failed:', response.status, response.data.error);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return null;
  }
}

async function testGetProfile(token, userRole) {
  console.log(`\n👤 Testing Get Profile (${userRole})...`);
  try {
    const response = await makeRequest('GET', '/users/profile', null, token);

    if (response.status === 200) {
      console.log('   ✅ Profile retrieved successfully');
      console.log('   📧 Email:', response.data.email);
      console.log('   👤 Name:', response.data.firstName, response.data.lastName);
      console.log('   🎭 Roles:', response.data.roles.join(', '));
      console.log('   🔑 Permissions:', response.data.permissions.length);
      console.log('   📋 Menus:', response.data.menus.length);
      
      if (response.data.menus.length > 0) {
        console.log('   📂 Available Menus:');
        response.data.menus.forEach(menu => {
          console.log(`      - ${menu.displayName} (${menu.path})`);
        });
      }
      return true;
    } else {
      console.log('   ❌ Profile retrieval failed:', response.status, response.data.error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Profile error:', error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n🚫 Testing Invalid Login...');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });

    if (response.status === 401) {
      console.log('   ✅ Invalid login correctly rejected');
      return true;
    } else {
      console.log('   ❌ Invalid login should have been rejected');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Invalid login test error:', error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔒 Testing Unauthorized Access...');
  try {
    const response = await makeRequest('GET', '/users/profile');

    if (response.status === 401) {
      console.log('   ✅ Unauthorized access correctly blocked');
      return true;
    } else {
      console.log('   ❌ Unauthorized access should have been blocked');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Unauthorized access test error:', error.message);
    return false;
  }
}

async function testInvalidToken() {
  console.log('\n🎫 Testing Invalid Token...');
  try {
    const response = await makeRequest('GET', '/users/profile', null, 'invalid-token-12345');

    if (response.status === 403) {
      console.log('   ✅ Invalid token correctly rejected');
      return true;
    } else {
      console.log('   ❌ Invalid token should have been rejected');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Invalid token test error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 GHARINTO LEAP - AUTHENTICATION & API CONNECTIVITY TESTS');
  console.log('═══════════════════════════════════════════════════════════');

  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  // Test 1: Health Check
  results.total++;
  if (await testHealthCheck()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: Invalid Login
  results.total++;
  if (await testInvalidLogin()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Unauthorized Access
  results.total++;
  if (await testUnauthorizedAccess()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Invalid Token
  results.total++;
  if (await testInvalidToken()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 5-10: Login and Profile for each user
  for (const user of testUsers) {
    results.total++;
    const token = await testLogin(user);
    if (token) {
      results.passed++;
      
      results.total++;
      if (await testGetProfile(token, user.role)) {
        results.passed++;
      } else {
        results.failed++;
      }
    } else {
      results.failed++;
    }
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
    console.log('\n🎉 ALL TESTS PASSED! Authentication system is working correctly.');
    console.log('\n✨ Next Steps:');
    console.log('   1. Frontend is running at: http://localhost:5173');
    console.log('   2. Backend is running at: http://localhost:4000');
    console.log('   3. Try logging in with any of these accounts:');
    testUsers.forEach(user => {
      console.log(`      - ${user.email} / ${user.password} (${user.role})`);
    });
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

