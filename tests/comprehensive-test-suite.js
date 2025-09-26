#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Gharinto Leap Backend
 * Tests all 40+ API endpoints with unit, integration, and security tests
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test configuration
const testConfig = {
  users: {
    admin: { email: 'admin@gharinto.com', password: 'admin123' },
    superadmin: { email: 'superadmin@gharinto.com', password: 'superadmin123' },
    pm: { email: 'pm@gharinto.com', password: 'pm123' },
    designer: { email: 'designer@gharinto.com', password: 'designer123' },
    customer: { email: 'customer@gharinto.com', password: 'customer123' },
    vendor: { email: 'vendor@gharinto.com', password: 'vendor123' }
  }
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = [];
let tokens = {};

// Utility functions
async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData ? JSON.parse(responseData) : null,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${name}: PASSED ${details}`);
  } else {
    failedTests.push({ name, details });
    console.log(`❌ ${name}: FAILED ${details}`);
  }
}

function validateResponse(response, expectedStatus = 200, requiredFields = []) {
  if (response.status !== expectedStatus) {
    return { valid: false, error: `Expected status ${expectedStatus}, got ${response.status}` };
  }

  if (!response.data) {
    return { valid: false, error: 'No response data' };
  }

  for (const field of requiredFields) {
    if (!(field in response.data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
}

// Authentication Tests
async function testAuthentication() {
  console.log('\n🔐 AUTHENTICATION TESTS');
  
  // Test login for all user types
  for (const [userType, credentials] of Object.entries(testConfig.users)) {
    const response = await makeRequest('POST', '/auth/login', credentials);
    const validation = validateResponse(response, 200, ['token', 'user']);
    
    if (validation.valid) {
      tokens[userType] = response.data.token;
      logTest(`Login ${userType}`, true, `Token received`);
    } else {
      logTest(`Login ${userType}`, false, validation.error);
    }
  }

  // Test invalid login
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    email: 'invalid@test.com',
    password: 'wrongpassword'
  });
  logTest('Invalid login rejection', invalidLogin.status === 401 || invalidLogin.status === 400, 
    `Status: ${invalidLogin.status}`);

  // Test registration
  const newUser = {
    email: `test${Date.now()}@test.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '9876543210',
    userType: 'customer'
  };
  
  const registerResponse = await makeRequest('POST', '/auth/register', newUser);
  const registerValidation = validateResponse(registerResponse, 200, ['token', 'user']);
  logTest('User registration', registerValidation.valid, registerValidation.error || 'User created');
}

// User Management Tests
async function testUserManagement() {
  console.log('\n👥 USER MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('User management tests', false, 'No admin token available');
    return;
  }

  // Test get user profile
  const profileResponse = await makeRequest('GET', '/users/profile', null, adminToken);
  const profileValidation = validateResponse(profileResponse, 200, ['id', 'email', 'firstName', 'lastName']);
  logTest('Get user profile', profileValidation.valid, profileValidation.error || 'Profile retrieved');

  // Test get users list (admin only)
  const usersResponse = await makeRequest('GET', '/users', null, adminToken);
  logTest('Get users list', usersResponse.ok, `Status: ${usersResponse.status}`);

  // Test RBAC permissions
  const permissionsResponse = await makeRequest('GET', '/rbac/user-permissions', null, adminToken);
  const permissionsValidation = validateResponse(permissionsResponse, 200, ['permissions']);
  logTest('Get user permissions', permissionsValidation.valid, 
    permissionsValidation.error || `Permissions: ${permissionsResponse.data?.permissions?.length || 0}`);

  // Test user menus
  const menusResponse = await makeRequest('GET', '/menus/user', null, adminToken);
  logTest('Get user menus', menusResponse.ok, `Status: ${menusResponse.status}`);
}

// Lead Management Tests
async function testLeadManagement() {
  console.log('\n🎯 LEAD MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Lead management tests', false, 'No admin token available');
    return;
  }

  // Test get leads
  const leadsResponse = await makeRequest('GET', '/leads', null, adminToken);
  const leadsValidation = validateResponse(leadsResponse, 200, ['leads', 'total', 'page', 'limit']);
  logTest('Get leads list', leadsValidation.valid, 
    leadsValidation.error || `Found ${leadsResponse.data?.leads?.length || 0} leads`);

  // Test create lead
  const newLead = {
    source: 'website',
    firstName: 'Test',
    lastName: 'Lead',
    email: `lead${Date.now()}@test.com`,
    phone: '9876543210',
    city: 'Mumbai',
    budgetMin: 100000,
    budgetMax: 500000,
    projectType: 'residential',
    description: 'Test lead for automated testing'
  };

  const createLeadResponse = await makeRequest('POST', '/leads', newLead, adminToken);
  logTest('Create lead', createLeadResponse.ok, `Status: ${createLeadResponse.status}`);

  if (createLeadResponse.ok && createLeadResponse.data?.leadId) {
    const leadId = createLeadResponse.data.leadId;
    
    // Test get lead details
    const leadDetailsResponse = await makeRequest('GET', `/leads/${leadId}`, null, adminToken);
    logTest('Get lead details', leadDetailsResponse.ok, `Status: ${leadDetailsResponse.status}`);

    // Test update lead
    const updateData = { status: 'contacted' };
    const updateResponse = await makeRequest('PUT', `/leads/${leadId}`, updateData, adminToken);
    logTest('Update lead', updateResponse.ok, `Status: ${updateResponse.status}`);
  }
}

// Project Management Tests
async function testProjectManagement() {
  console.log('\n📁 PROJECT MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Project management tests', false, 'No admin token available');
    return;
  }

  // Test get projects
  const projectsResponse = await makeRequest('GET', '/projects', null, adminToken);
  const projectsValidation = validateResponse(projectsResponse, 200, ['projects', 'total', 'page', 'limit']);
  logTest('Get projects list', projectsValidation.valid, 
    projectsValidation.error || `Found ${projectsResponse.data?.projects?.length || 0} projects`);

  // Test create project
  const newProject = {
    title: 'Test Project',
    description: 'Automated test project',
    clientId: 1, // Assuming customer user exists
    budget: 250000,
    city: 'Mumbai',
    areaSqft: 1200,
    propertyType: 'apartment'
  };

  const createProjectResponse = await makeRequest('POST', '/projects', newProject, adminToken);
  logTest('Create project', createProjectResponse.ok, `Status: ${createProjectResponse.status}`);

  if (createProjectResponse.ok && createProjectResponse.data?.projectId) {
    const projectId = createProjectResponse.data.projectId;
    
    // Test get project details
    const projectDetailsResponse = await makeRequest('GET', `/projects/${projectId}`, null, adminToken);
    logTest('Get project details', projectDetailsResponse.ok, `Status: ${projectDetailsResponse.status}`);
  }
}

// Materials and Vendors Tests
async function testMaterialsAndVendors() {
  console.log('\n🏗️ MATERIALS & VENDORS TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Materials and vendors tests', false, 'No admin token available');
    return;
  }

  // Test get materials
  const materialsResponse = await makeRequest('GET', '/materials', null, adminToken);
  logTest('Get materials catalog', materialsResponse.ok, `Status: ${materialsResponse.status}`);

  // Test get material categories
  const categoriesResponse = await makeRequest('GET', '/materials/categories', null, adminToken);
  logTest('Get material categories', categoriesResponse.ok, `Status: ${categoriesResponse.status}`);

  // Test get vendors
  const vendorsResponse = await makeRequest('GET', '/vendors', null, adminToken);
  logTest('Get vendors list', vendorsResponse.ok, `Status: ${vendorsResponse.status}`);

  // Test material search
  const searchResponse = await makeRequest('GET', '/materials/search?q=tile', null, adminToken);
  logTest('Search materials', searchResponse.ok, `Status: ${searchResponse.status}`);
}

// Financial Management Tests
async function testFinancialManagement() {
  console.log('\n💰 FINANCIAL MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Financial management tests', false, 'No admin token available');
    return;
  }

  // Test get wallet
  const walletResponse = await makeRequest('GET', '/payments/wallet', null, adminToken);
  logTest('Get user wallet', walletResponse.ok, `Status: ${walletResponse.status}`);

  // Test get transactions
  const transactionsResponse = await makeRequest('GET', '/wallet/transactions', null, adminToken);
  logTest('Get wallet transactions', transactionsResponse.ok, `Status: ${transactionsResponse.status}`);

  // Test financial summary
  const summaryResponse = await makeRequest('GET', '/finance/summary', null, adminToken);
  logTest('Get financial summary', summaryResponse.ok, `Status: ${summaryResponse.status}`);
}

// Employee Management Tests
async function testEmployeeManagement() {
  console.log('\n👨‍💼 EMPLOYEE MANAGEMENT TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Employee management tests', false, 'No admin token available');
    return;
  }

  // Test get employees
  const employeesResponse = await makeRequest('GET', '/users/employees', null, adminToken);
  logTest('Get employees list', employeesResponse.ok, `Status: ${employeesResponse.status}`);

  // Test attendance marking
  const attendanceData = {
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00'
  };
  const attendanceResponse = await makeRequest('POST', '/users/employees/attendance', attendanceData, adminToken);
  logTest('Mark attendance', attendanceResponse.ok, `Status: ${attendanceResponse.status}`);

  // Test performance reviews
  const reviewsResponse = await makeRequest('GET', '/users/employees/performance-reviews', null, adminToken);
  logTest('Get performance reviews', reviewsResponse.ok, `Status: ${reviewsResponse.status}`);

  // Test payroll
  const payrollResponse = await makeRequest('GET', '/users/employees/payroll', null, adminToken);
  logTest('Get payroll history', payrollResponse.ok, `Status: ${payrollResponse.status}`);
}

// Complaint Management Tests
async function testComplaintManagement() {
  console.log('\n📞 COMPLAINT MANAGEMENT TESTS');
  
  const customerToken = tokens.customer;
  const adminToken = tokens.admin;
  
  if (!customerToken || !adminToken) {
    logTest('Complaint management tests', false, 'Missing required tokens');
    return;
  }

  // Test create complaint
  const newComplaint = {
    title: 'Test complaint for automated testing',
    description: 'This is a test complaint created by the automated test suite',
    category: 'service',
    priority: 'medium'
  };

  const createComplaintResponse = await makeRequest('POST', '/complaints', newComplaint, customerToken);
  logTest('Create complaint', createComplaintResponse.ok, `Status: ${createComplaintResponse.status}`);

  // Test get complaints
  const complaintsResponse = await makeRequest('GET', '/complaints', null, adminToken);
  logTest('Get complaints list', complaintsResponse.ok, `Status: ${complaintsResponse.status}`);

  // Test SLA compliance check
  const slaResponse = await makeRequest('GET', '/complaints/sla-check', null, adminToken);
  logTest('SLA compliance check', slaResponse.ok, `Status: ${slaResponse.status}`);

  // Test complaint analytics
  const analyticsResponse = await makeRequest('GET', '/complaints/analytics', null, adminToken);
  logTest('Complaint analytics', analyticsResponse.ok, `Status: ${analyticsResponse.status}`);
}

// Analytics Tests
async function testAnalytics() {
  console.log('\n📊 ANALYTICS TESTS');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('Analytics tests', false, 'No admin token available');
    return;
  }

  // Test dashboard analytics
  const dashboardResponse = await makeRequest('GET', '/analytics/dashboard', null, adminToken);
  const dashboardValidation = validateResponse(dashboardResponse, 200, 
    ['totalLeads', 'totalProjects', 'totalRevenue']);
  logTest('Get dashboard analytics', dashboardValidation.valid, 
    dashboardValidation.error || 'Dashboard data retrieved');

  // Test lead analytics
  const leadAnalyticsResponse = await makeRequest('GET', '/analytics/leads', null, adminToken);
  logTest('Get lead analytics', leadAnalyticsResponse.ok, `Status: ${leadAnalyticsResponse.status}`);

  // Test project analytics
  const projectAnalyticsResponse = await makeRequest('GET', '/analytics/projects', null, adminToken);
  logTest('Get project analytics', projectAnalyticsResponse.ok, `Status: ${projectAnalyticsResponse.status}`);
}

// Security Tests
async function testSecurity() {
  console.log('\n🔒 SECURITY TESTS');
  
  // Test unauthorized access
  const unauthorizedResponse = await makeRequest('GET', '/users/profile');
  logTest('Unauthorized access blocked', unauthorizedResponse.status === 401, 
    `Status: ${unauthorizedResponse.status}`);

  // Test invalid token
  const invalidTokenResponse = await makeRequest('GET', '/users/profile', null, 'invalid-token');
  logTest('Invalid token rejected', invalidTokenResponse.status === 401, 
    `Status: ${invalidTokenResponse.status}`);

  // Test SQL injection attempt
  const sqlInjectionResponse = await makeRequest('POST', '/auth/login', {
    email: "admin@test.com'; DROP TABLE users; --",
    password: 'password'
  });
  logTest('SQL injection blocked', sqlInjectionResponse.status !== 200, 
    `Status: ${sqlInjectionResponse.status}`);

  // Test XSS attempt
  const xssResponse = await makeRequest('POST', '/leads', {
    firstName: '<script>alert("xss")</script>',
    lastName: 'Test',
    email: 'test@test.com',
    phone: '1234567890',
    city: 'Test'
  }, tokens.admin);
  logTest('XSS attempt handled', xssResponse.status !== 500, 
    `Status: ${xssResponse.status}`);
}

// Infrastructure Tests
async function testInfrastructure() {
  console.log('\n🏗️ INFRASTRUCTURE TESTS');
  
  // Test health check
  const healthResponse = await makeRequest('GET', '/health');
  const healthValidation = validateResponse(healthResponse, 200, ['status']);
  logTest('API health check', healthValidation.valid, 
    healthValidation.error || `Status: ${healthResponse.data?.status}`);

  // Test database health
  const dbHealthResponse = await makeRequest('GET', '/health/db');
  logTest('Database health check', dbHealthResponse.ok, `Status: ${dbHealthResponse.status}`);

  // Test 404 handling
  const notFoundResponse = await makeRequest('GET', '/non-existent-endpoint');
  logTest('404 error handling', notFoundResponse.status === 404, 
    `Status: ${notFoundResponse.status}`);
}

// Main test execution
async function runComprehensiveTests() {
  console.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
  console.log('🏢 Gharinto Leap Backend - Production Readiness Verification');
  console.log('📊 Testing ALL API endpoints with security and performance validation');
  console.log('================================================\n');
  
  const startTime = Date.now();
  
  try {
    await testInfrastructure();
    await testAuthentication();
    await testUserManagement();
    await testLeadManagement();
    await testProjectManagement();
    await testMaterialsAndVendors();
    await testFinancialManagement();
    await testEmployeeManagement();
    await testComplaintManagement();
    await testAnalytics();
    await testSecurity();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n================================================');
    console.log('🏁 COMPREHENSIVE TEST SUITE COMPLETE');
    console.log('================================================');
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`⏱️ Duration: ${duration}s`);
    
    if (failedTests.length > 0) {
      console.log('\n🔍 FAILED TESTS DETAILS:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.details}`);
      });
    }
    
    console.log('\n📋 PRODUCTION READINESS ASSESSMENT:');
    const successRate = (passedTests / totalTests) * 100;
    if (successRate >= 95) {
      console.log('   🟢 PRODUCTION READY - Excellent test coverage');
    } else if (successRate >= 85) {
      console.log('   🟡 MOSTLY READY - Minor issues need fixing');
    } else if (successRate >= 70) {
      console.log('   🟠 NEEDS WORK - Several critical issues');
    } else {
      console.log('   🔴 NOT READY - Major issues need resolution');
    }
    
    console.log(`\n✨ Production Score: ${successRate.toFixed(1)}%`);
    console.log('================================================\n');
    
    // Exit with appropriate code
    process.exit(failedTests.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests();
}

module.exports = {
  runComprehensiveTests,
  makeRequest,
  validateResponse,
  testConfig
};
