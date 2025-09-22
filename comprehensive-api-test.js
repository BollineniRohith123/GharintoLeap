#!/usr/bin/env node

const API_BASE = 'http://localhost:4000';

// Colors for output
const colors = {
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  error: '\x1b[31m',   // Red
  warning: '\x1b[33m', // Yellow
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  console.log(`${colors[type]}${message}${colors.reset}`);
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
      log(`✅ ${options.method || 'GET'} ${endpoint} - SUCCESS (${response.status})`, 'success');
      return { success: true, data, status: response.status };
    } else {
      log(`❌ ${options.method || 'GET'} ${endpoint} - FAILED (${response.status})`, 'error');
      console.log('Error details:', data);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`❌ ${options.method || 'GET'} ${endpoint} - ERROR: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTests() {
  log('🧪 Starting Comprehensive API Testing Suite\n', 'info');
  
  const testResults = {};

  // Test 1: Database Health Check
  log('1. Testing Database Health Check', 'warning');
  const healthResult = await apiTest('/health/db');
  testResults.health = healthResult;
  if (healthResult.success) {
    console.log('   Database Status:', healthResult.data.status);
    console.log('   Connection Time:', healthResult.data.timestamp);
  }
  console.log();

  // Test 2: Authentication (Multiple Users)
  log('2. Testing Authentication for Different User Types', 'warning');
  
  const testUsers = [
    { email: 'admin@gharinto.com', role: 'System Admin' },
    { email: 'superadmin@gharinto.com', role: 'Super Admin' },
    { email: 'pm@gharinto.com', role: 'Project Manager' },
    { email: 'designer@gharinto.com', role: 'Interior Designer' },
    { email: 'customer@gharinto.com', role: 'Customer' },
    { email: 'vendor@gharinto.com', role: 'Vendor' }
  ];

  let primaryToken = null;
  testResults.authentication = {};

  for (const user of testUsers) {
    log(`   Testing ${user.role} (${user.email})`, 'info');
    
    const authResult = await apiTest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: 'password123'
      })
    });
    
    testResults.authentication[user.email] = authResult;
    
    if (authResult.success) {
      log(`   ✅ Login successful for ${user.role}`, 'success');
      console.log(`   Token: ${authResult.data.token.substring(0, 20)}...`);
      console.log(`   User ID: ${authResult.data.user.id}`);
      console.log(`   Roles: ${authResult.data.user.roles.join(', ')}`);
      console.log(`   Permissions: ${authResult.data.user.permissions.slice(0, 3).join(', ')}${authResult.data.user.permissions.length > 3 ? '...' : ''}`);
      
      if (!primaryToken) {
        primaryToken = authResult.data.token;
      }
    } else {
      log(`   ❌ Login failed for ${user.role}`, 'error');
    }
    console.log();
  }

  if (!primaryToken) {
    log('❌ No valid authentication token obtained. Cannot proceed with protected endpoints.', 'error');
    return testResults;
  }

  // Test 3: User Profile
  log('3. Testing User Profile Endpoint', 'warning');
  const profileResult = await apiTest('/users/profile', {
    headers: { 'Authorization': `Bearer ${primaryToken}` }
  });
  testResults.profile = profileResult;
  
  if (profileResult.success) {
    console.log('   Profile loaded successfully');
    console.log(`   Name: ${profileResult.data.firstName} ${profileResult.data.lastName}`);
    console.log(`   Email: ${profileResult.data.email}`);
    console.log(`   Roles: ${profileResult.data.roles.join(', ')}`);
    console.log(`   Menus: ${profileResult.data.menus?.length || 0} items`);
  }
  console.log();

  // Test 4: User Permissions
  log('4. Testing User Permissions Endpoint', 'warning');
  const permissionsResult = await apiTest('/rbac/user-permissions', {
    headers: { 'Authorization': `Bearer ${primaryToken}` }
  });
  testResults.permissions = permissionsResult;
  
  if (permissionsResult.success) {
    console.log('   Permissions loaded successfully');
    console.log(`   Total permissions: ${permissionsResult.data.permissions?.length || 0}`);
    console.log(`   Sample permissions: ${permissionsResult.data.permissions?.slice(0, 5).join(', ')}`);
  }
  console.log();

  // Test 5: User Menus
  log('5. Testing User Menus Endpoint', 'warning');
  const menusResult = await apiTest('/menus/user', {
    headers: { 'Authorization': `Bearer ${primaryToken}` }
  });
  testResults.menus = menusResult;
  
  if (menusResult.success) {
    console.log('   Menus loaded successfully');
    console.log(`   Available menus: ${menusResult.data.menus?.length || 0}`);
    menusResult.data.menus?.forEach(menu => {
      console.log(`   - ${menu.displayName} (${menu.path})`);
    });
  }
  console.log();

  // Test 6: Leads
  log('6. Testing Leads Management Endpoint', 'warning');
  const leadsResult = await apiTest('/leads', {
    headers: { 'Authorization': `Bearer ${primaryToken}` }
  });
  testResults.leads = leadsResult;
  
  if (leadsResult.success) {
    console.log('   Leads loaded successfully');
    console.log(`   Total leads: ${leadsResult.data.total}`);
    console.log(`   Current page: ${leadsResult.data.page}`);
    console.log(`   Leads on this page: ${leadsResult.data.leads?.length || 0}`);
    
    if (leadsResult.data.leads?.length > 0) {
      const firstLead = leadsResult.data.leads[0];
      console.log(`   Sample lead: ${firstLead.firstName} ${firstLead.lastName} (${firstLead.email})`);
    }
  }
  console.log();

  // Test 7: Analytics Dashboard
  log('7. Testing Analytics Dashboard Endpoint', 'warning');
  const analyticsResult = await apiTest('/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${primaryToken}` }
  });
  testResults.analytics = analyticsResult;
  
  if (analyticsResult.success) {
    console.log('   Analytics loaded successfully');
    console.log(`   Total Leads: ${analyticsResult.data.totalLeads}`);
    console.log(`   Total Projects: ${analyticsResult.data.totalProjects}`);
    console.log(`   Total Revenue: ₹${analyticsResult.data.totalRevenue?.toLocaleString() || 0}`);
    console.log(`   Active Projects: ${analyticsResult.data.activeProjects}`);
    console.log(`   Conversion Rate: ${analyticsResult.data.conversionRate}%`);
    console.log(`   Leads This Month: ${analyticsResult.data.leadsThisMonth}`);
  }
  console.log();

  // Test 8: Authorization Tests (Invalid Token)
  log('8. Testing Authorization (Invalid Token)', 'warning');
  const invalidAuthResult = await apiTest('/users/profile', {
    headers: { 'Authorization': 'Bearer invalid-token' }
  });
  testResults.invalidAuth = invalidAuthResult;
  
  if (!invalidAuthResult.success && invalidAuthResult.status === 403) {
    log('   ✅ Properly rejected invalid token', 'success');
  } else {
    log('   ❌ Should have rejected invalid token', 'error');
  }
  console.log();

  // Test 9: Unauthorized Access (No Token)
  log('9. Testing Unauthorized Access (No Token)', 'warning');
  const noAuthResult = await apiTest('/users/profile');
  testResults.noAuth = noAuthResult;
  
  if (!noAuthResult.success && noAuthResult.status === 401) {
    log('   ✅ Properly rejected request without token', 'success');
  } else {
    log('   ❌ Should have rejected request without token', 'error');
  }
  console.log();

  // Summary
  log('📊 TEST SUMMARY', 'warning');
  console.log('='.repeat(50));
  
  const totalTests = Object.keys(testResults).length;
  const successfulTests = Object.values(testResults).filter(result => result.success).length;
  const failedTests = totalTests - successfulTests;
  
  log(`Total Tests: ${totalTests}`, 'info');
  log(`Successful: ${successfulTests}`, 'success');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'success');
  
  console.log('\nDetailed Results:');
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'success' : 'error';
    log(`  ${test}: ${status}`, color);
  });
  
  if (successfulTests === totalTests) {
    log('\n🎉 All tests passed! Backend APIs are working correctly.', 'success');
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Please check the errors above.`, 'warning');
  }
  
  return testResults;
}

runComprehensiveTests().catch(console.error);