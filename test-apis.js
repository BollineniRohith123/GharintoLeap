#!/usr/bin/env node

const API_BASE = 'http://localhost:4000';

// Test function with colored output
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m'  // Yellow
  };
  console.log(`${colors[type]}${message}\x1b[0m`);
}

async function apiTest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (response.ok) {
      log(`✅ ${options.method || 'GET'} ${endpoint} - SUCCESS`, 'success');
      if (options.showData) {
        console.log(JSON.stringify(data, null, 2));
      }
      return data;
    } else {
      log(`❌ ${options.method || 'GET'} ${endpoint} - FAILED (${response.status})`, 'error');
      console.log(data);
      return null;
    }
  } catch (error) {
    log(`❌ ${options.method || 'GET'} ${endpoint} - ERROR: ${error.message}`, 'error');
    return null;
  }
}

async function runTests() {
  log('🧪 Starting API Tests with Real Database\n', 'info');

  // 1. Test Database Health
  log('1. Testing Database Health Check', 'info');
  await apiTest('/health/db', { showData: true });
  console.log();

  // 2. Test Authentication
  log('2. Testing Authentication', 'info');
  const authData = await apiTest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@gharinto.com',
      password: 'password123'
    }),
    showData: true
  });
  
  if (!authData || !authData.token) {
    log('❌ Authentication failed! Cannot proceed with other tests.', 'error');
    return;
  }

  const token = authData.token;
  console.log();

  // 3. Test User Profile
  log('3. Testing User Profile', 'info');
  await apiTest('/users/profile', {
    headers: { 'Authorization': `Bearer ${token}` },
    showData: true
  });
  console.log();

  // 4. Test User Permissions
  log('4. Testing User Permissions', 'info');
  await apiTest('/rbac/user-permissions', {
    headers: { 'Authorization': `Bearer ${token}` },
    showData: true
  });
  console.log();

  // 5. Test User Menus
  log('5. Testing User Menus', 'info');
  await apiTest('/menus/user', {
    headers: { 'Authorization': `Bearer ${token}` },
    showData: true
  });
  console.log();

  // 6. Test Leads
  log('6. Testing Leads', 'info');
  await apiTest('/leads', {
    headers: { 'Authorization': `Bearer ${token}` },
    showData: true
  });
  console.log();

  // 7. Test Analytics Dashboard
  log('7. Testing Analytics Dashboard', 'info');
  await apiTest('/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` },
    showData: true
  });
  console.log();

  // 8. Test Different User Roles
  log('8. Testing Different User Roles', 'info');
  
  const testUsers = [
    { email: 'superadmin@gharinto.com', role: 'Super Admin' },
    { email: 'pm@gharinto.com', role: 'Project Manager' },
    { email: 'designer@gharinto.com', role: 'Interior Designer' },
    { email: 'customer@gharinto.com', role: 'Customer' }
  ];

  for (const user of testUsers) {
    log(`Testing ${user.role}:`, 'warning');
    const userData = await apiTest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: 'password123'
      })
    });
    
    if (userData && userData.token) {
      log(`  ✅ Login successful for ${user.role}`, 'success');
      
      // Test profile for this user
      const profile = await apiTest('/users/profile', {
        headers: { 'Authorization': `Bearer ${userData.token}` }
      });
      
      if (profile) {
        log(`  ✅ Profile loaded - Roles: ${profile.roles.join(', ')}`, 'success');
      }
    }
  }

  log('\n🎉 All API Tests Completed!', 'success');
}

runTests().catch(console.error);