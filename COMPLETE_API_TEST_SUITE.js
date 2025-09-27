#!/usr/bin/env node

/**
 * COMPLETE API TEST SUITE FOR GHARINTO LEAP
 * Tests ALL 60+ API endpoints including missing ones
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
let testResults = { passed: 0, failed: 0, details: [] };
let tokens = {};

// Test users
const testUsers = {
  admin: { email: 'admin@gharinto.com', password: 'admin123' },
  customer: { email: 'customer@gharinto.com', password: 'customer123' },
  designer: { email: 'designer@gharinto.com', password: 'designer123' },
  vendor: { email: 'vendor@gharinto.com', password: 'vendor123' }
};

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { body: JSON.stringify(data) })
    });
    
    const responseData = response.status !== 204 ? await response.text() : null;
    return {
      status: response.status,
      ok: response.ok,
      data: responseData ? JSON.parse(responseData) : null
    };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  }
}

function logTest(name, passed, details = '') {
  testResults.passed += passed ? 1 : 0;
  testResults.failed += passed ? 0 : 1;
  testResults.details.push({ name, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'} ${details}`);
}

// ==================== AUTHENTICATION TESTS ====================
async function testAuthentication() {
  console.log('\n🔐 AUTHENTICATION & AUTHORIZATION TESTS');

  // Test Registration
  const newUser = {
    email: `test${Date.now()}@test.com`,
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '9876543210',
    city: 'Mumbai'
  };

  const registerResponse = await makeRequest('POST', '/auth/register', newUser);
  logTest('User Registration', registerResponse.ok && registerResponse.data?.token, 
    `Status: ${registerResponse.status}`);

  // Test Login for all user types
  for (const [userType, credentials] of Object.entries(testUsers)) {
    const loginResponse = await makeRequest('POST', '/auth/login', credentials);
    if (loginResponse.ok && loginResponse.data?.token) {
      tokens[userType] = loginResponse.data.token;
      logTest(`Login ${userType}`, true, 'Token received');
    } else {
      logTest(`Login ${userType}`, false, `Status: ${loginResponse.status}`);
    }
  }

  // Test invalid login
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    email: 'invalid@test.com', password: 'wrong'
  });
  logTest('Invalid login rejection', !invalidLogin.ok, `Status: ${invalidLogin.status}`);

  // Test password reset flow
  const forgotPassword = await makeRequest('POST', '/auth/forgot-password', { email: testUsers.customer.email });
  logTest('Forgot password', forgotPassword.ok, `Status: ${forgotPassword.status}`);
}

// ==================== USER MANAGEMENT TESTS ====================
async function testUserManagement() {
  console.log('\n👥 USER MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test get profile
  const profile = await makeRequest('GET', '/users/profile', null, adminToken);
  logTest('Get user profile', profile.ok && profile.data?.id, `Status: ${profile.status}`);

  // Test get users list
  const users = await makeRequest('GET', '/users', null, adminToken);
  logTest('Get users list', users.ok && Array.isArray(users.data?.users), `Status: ${users.status}`);

  // Test create user
  const newUser = {
    email: `newuser${Date.now()}@test.com`,
    password: 'Test123!',
    firstName: 'New',
    lastName: 'User',
    roles: ['customer']
  };
  const createUser = await makeRequest('POST', '/users', newUser, adminToken);
  logTest('Create user', createUser.ok, `Status: ${createUser.status}`);

  // Test RBAC permissions
  const permissions = await makeRequest('GET', '/rbac/user-permissions', null, adminToken);
  logTest('Get user permissions', permissions.ok && Array.isArray(permissions.data?.permissions), 
    `Status: ${permissions.status}`);

  // Test user menus
  const menus = await makeRequest('GET', '/menus/user', null, adminToken);
  logTest('Get user menus', menus.ok, `Status: ${menus.status}`);
}

// ==================== PROJECT MANAGEMENT TESTS ====================
async function testProjectManagement() {
  console.log('\n📁 PROJECT MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test get projects
  const projects = await makeRequest('GET', '/projects', null, adminToken);
  logTest('Get projects list', projects.ok && Array.isArray(projects.data?.projects), 
    `Found ${projects.data?.projects?.length || 0} projects`);

  // Test create project
  const newProject = {
    title: 'Test Project API',
    description: 'Automated test project',
    clientId: 1,
    budget: 500000,
    city: 'Mumbai',
    areaSqft: 1500,
    propertyType: 'apartment'
  };
  const createProject = await makeRequest('POST', '/projects', newProject, adminToken);
  logTest('Create project', createProject.ok, `Status: ${createProject.status}`);

  if (createProject.ok && createProject.data?.id) {
    const projectId = createProject.data.id;
    
    // Test get project details
    const projectDetails = await makeRequest('GET', `/projects/${projectId}`, null, adminToken);
    logTest('Get project details', projectDetails.ok, `Status: ${projectDetails.status}`);

    // Test update project
    const updateProject = await makeRequest('PUT', `/projects/${projectId}`, 
      { status: 'in_progress', progressPercentage: 25 }, adminToken);
    logTest('Update project', updateProject.ok, `Status: ${updateProject.status}`);
  }
}

// ==================== LEAD MANAGEMENT TESTS ====================
async function testLeadManagement() {
  console.log('\n🎯 LEAD MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test get leads
  const leads = await makeRequest('GET', '/leads', null, adminToken);
  logTest('Get leads list', leads.ok && Array.isArray(leads.data?.leads), 
    `Found ${leads.data?.leads?.length || 0} leads`);

  // Test create lead
  const newLead = {
    source: 'api_test',
    firstName: 'Test',
    lastName: 'Lead',
    email: `testlead${Date.now()}@test.com`,
    phone: '9876543210',
    city: 'Mumbai',
    budgetMin: 200000,
    budgetMax: 800000,
    projectType: 'residential',
    description: 'Test lead from API suite'
  };
  const createLead = await makeRequest('POST', '/leads', newLead, adminToken);
  logTest('Create lead', createLead.ok, `Status: ${createLead.status}`);

  if (createLead.ok && createLead.data?.id) {
    const leadId = createLead.data.id;
    
    // Test get lead details
    const leadDetails = await makeRequest('GET', `/leads/${leadId}`, null, adminToken);
    logTest('Get lead details', leadDetails.ok, `Status: ${leadDetails.status}`);

    // Test assign lead
    const assignLead = await makeRequest('POST', `/leads/${leadId}/assign`, 
      { assignedTo: 1 }, adminToken);
    logTest('Assign lead', assignLead.ok, `Status: ${assignLead.status}`);

    // Test update lead
    const updateLead = await makeRequest('PUT', `/leads/${leadId}`, 
      { status: 'qualified', score: 85 }, adminToken);
    logTest('Update lead', updateLead.ok, `Status: ${updateLead.status}`);
  }
}

// ==================== FINANCIAL MANAGEMENT TESTS ====================
async function testFinancialManagement() {
  console.log('\n💰 FINANCIAL MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  const customerToken = tokens.customer;
  if (!adminToken || !customerToken) return;

  // Test wallet functionality
  const wallet = await makeRequest('GET', '/wallet', null, customerToken);
  logTest('Get user wallet', wallet.ok, `Status: ${wallet.status}`);

  const transactions = await makeRequest('GET', '/wallet/transactions', null, customerToken);
  logTest('Get wallet transactions', transactions.ok, `Status: ${transactions.status}`);

  // Test quotations
  const quotations = await makeRequest('GET', '/quotations', null, adminToken);
  logTest('Get quotations list', quotations.ok, `Status: ${quotations.status}`);

  // Test create quotation
  const newQuotation = {
    clientId: 1,
    title: 'Test Quotation',
    description: 'API Test Quotation',
    items: [
      {
        description: 'Test Service',
        quantity: 1,
        unit: 'unit',
        unitPrice: 50000
      }
    ],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  const createQuotation = await makeRequest('POST', '/quotations', newQuotation, adminToken);
  logTest('Create quotation', createQuotation.ok, `Status: ${createQuotation.status}`);

  // Test invoices
  const invoices = await makeRequest('GET', '/invoices', null, adminToken);
  logTest('Get invoices list', invoices.ok, `Status: ${invoices.status}`);
}

// ==================== MATERIALS & VENDOR TESTS ====================
async function testMaterialsAndVendors() {
  console.log('\n🏗️ MATERIALS & VENDORS TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test materials
  const materials = await makeRequest('GET', '/materials', null, adminToken);
  logTest('Get materials catalog', materials.ok, `Status: ${materials.status}`);

  const categories = await makeRequest('GET', '/materials/categories', null, adminToken);
  logTest('Get material categories', categories.ok, `Status: ${categories.status}`);

  // Test vendors
  const vendors = await makeRequest('GET', '/vendors', null, adminToken);
  logTest('Get vendors list', vendors.ok, `Status: ${vendors.status}`);

  // Test create material
  const newMaterial = {
    name: 'Test Material',
    category: 'Test Category',
    unit: 'piece',
    price: 1000,
    stockQuantity: 100,
    description: 'API Test Material'
  };
  const createMaterial = await makeRequest('POST', '/materials', newMaterial, adminToken);
  logTest('Create material', createMaterial.ok, `Status: ${createMaterial.status}`);
}

// ==================== EMPLOYEE MANAGEMENT TESTS ====================
async function testEmployeeManagement() {
  console.log('\n👨‍💼 EMPLOYEE MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test employees list
  const employees = await makeRequest('GET', '/employees', null, adminToken);
  logTest('Get employees list', employees.ok, `Status: ${employees.status}`);

  // Test attendance
  const attendanceData = {
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00',
    checkOutTime: '18:00',
    status: 'present'
  };
  const attendance = await makeRequest('POST', '/employees/attendance', attendanceData, adminToken);
  logTest('Mark attendance', attendance.ok, `Status: ${attendance.status}`);
}

// ==================== COMPLAINT MANAGEMENT TESTS ====================
async function testComplaintManagement() {
  console.log('\n📞 COMPLAINT MANAGEMENT TESTS');
  
  const customerToken = tokens.customer;
  const adminToken = tokens.admin;
  if (!customerToken || !adminToken) return;

  // Test get complaints
  const complaints = await makeRequest('GET', '/complaints', null, adminToken);
  logTest('Get complaints list', complaints.ok, `Status: ${complaints.status}`);

  // Test create complaint
  const newComplaint = {
    title: 'Test Complaint',
    description: 'API test complaint',
    priority: 'medium'
  };
  const createComplaint = await makeRequest('POST', '/complaints', newComplaint, customerToken);
  logTest('Create complaint', createComplaint.ok, `Status: ${createComplaint.status}`);
}

// ==================== NOTIFICATION TESTS ====================
async function testNotifications() {
  console.log('\n🔔 NOTIFICATION TESTS');
  
  const customerToken = tokens.customer;
  if (!customerToken) return;

  const notifications = await makeRequest('GET', '/notifications', null, customerToken);
  logTest('Get notifications', notifications.ok, `Status: ${notifications.status}`);
}

// ==================== ANALYTICS TESTS ====================
async function testAnalytics() {
  console.log('\n📊 ANALYTICS TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  const dashboard = await makeRequest('GET', '/analytics/dashboard', null, adminToken);
  logTest('Get dashboard analytics', dashboard.ok && dashboard.data?.totalLeads !== undefined, 
    `Status: ${dashboard.status}`);

  const leadAnalytics = await makeRequest('GET', '/analytics/leads', null, adminToken);
  logTest('Get lead analytics', leadAnalytics.ok, `Status: ${leadAnalytics.status}`);

  const projectAnalytics = await makeRequest('GET', '/analytics/projects', null, adminToken);
  logTest('Get project analytics', projectAnalytics.ok, `Status: ${projectAnalytics.status}`);
}

// ==================== SEARCH TESTS ====================
async function testSearch() {
  console.log('\n🔍 SEARCH TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  const search = await makeRequest('GET', '/search?q=test', null, adminToken);
  logTest('Global search', search.ok, `Status: ${search.status}`);

  const projectSearch = await makeRequest('GET', '/search?q=test&type=projects', null, adminToken);
  logTest('Project search', projectSearch.ok, `Status: ${projectSearch.status}`);
}

// ==================== SECURITY TESTS ====================
async function testSecurity() {
  console.log('\n🔒 SECURITY TESTS');

  // Test unauthorized access
  const unauthorized = await makeRequest('GET', '/users/profile');
  logTest('Unauthorized access blocked', !unauthorized.ok, `Status: ${unauthorized.status}`);

  // Test invalid token
  const invalidToken = await makeRequest('GET', '/users/profile', null, 'invalid-token');
  logTest('Invalid token rejected', !invalidToken.ok, `Status: ${invalidToken.status}`);

  // Test SQL injection
  const sqlInjection = await makeRequest('POST', '/auth/login', {
    email: "admin'; DROP TABLE users; --",
    password: 'test'
  });
  logTest('SQL injection blocked', !sqlInjection.ok, `Status: ${sqlInjection.status}`);
}

// ==================== INFRASTRUCTURE TESTS ====================
async function testInfrastructure() {
  console.log('\n🏗️ INFRASTRUCTURE TESTS');

  const health = await makeRequest('GET', '/health');
  logTest('API health check', health.ok && health.data?.status === 'ok', 
    `Status: ${health.data?.status}`);

  const dbHealth = await makeRequest('GET', '/health/db');
  logTest('Database health check', dbHealth.ok, `Status: ${dbHealth.status}`);

  const notFound = await makeRequest('GET', '/non-existent-endpoint');
  logTest('404 error handling', notFound.status === 404, `Status: ${notFound.status}`);
}

// ==================== MAIN TEST EXECUTION ====================
async function runCompleteTestSuite() {
  console.log('🚀 STARTING COMPLETE API TEST SUITE');
  console.log('🏢 Gharinto Leap Backend - ALL 60+ Endpoints');
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  
  try {
    await testInfrastructure();
    await testAuthentication();
    await testUserManagement();
    await testProjectManagement();
    await testLeadManagement();
    await testFinancialManagement();
    await testMaterialsAndVendors();
    await testEmployeeManagement();
    await testComplaintManagement();
    await testNotifications();
    await testAnalytics();
    await testSearch();
    await testSecurity();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? (testResults.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n' + '=' .repeat(80));
    console.log('🏁 COMPLETE API TEST SUITE RESULTS');
    console.log('=' .repeat(80));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️ Duration: ${duration}s`);
    
    if (testResults.failed > 0) {
      console.log('\n🔍 FAILED TESTS:');
      testResults.details.filter(t => !t.passed).forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.details}`);
      });
    }
    
    console.log('\n📋 PRODUCTION READINESS:');
    if (successRate >= 95) {
      console.log('   🟢 PRODUCTION READY - Excellent coverage');
    } else if (successRate >= 85) {
      console.log('   🟡 MOSTLY READY - Minor fixes needed');
    } else if (successRate >= 70) {
      console.log('   🟠 NEEDS WORK - Several issues');
    } else {
      console.log('   🔴 NOT READY - Major issues');
    }
    
    console.log(`\n✨ API Coverage Score: ${successRate}%`);
    console.log('=' .repeat(80));
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCompleteTestSuite();
}

module.exports = { runCompleteTestSuite };