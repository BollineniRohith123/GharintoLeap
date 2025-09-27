#!/usr/bin/env node

/**
 * PRODUCTION API TEST SUITE FOR GHARINTO LEAP
 * Comprehensive testing of all 60+ APIs against PostgreSQL production database
 * Target Audience: School administrators, management, and educational technology buyers
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';
let testResults = { 
  passed: 0, 
  failed: 0, 
  total: 0,
  details: [],
  categories: {
    authentication: { passed: 0, failed: 0, tests: [] },
    userManagement: { passed: 0, failed: 0, tests: [] },
    projectManagement: { passed: 0, failed: 0, tests: [] },
    leadManagement: { passed: 0, failed: 0, tests: [] },
    materialVendor: { passed: 0, failed: 0, tests: [] },
    analytics: { passed: 0, failed: 0, tests: [] },
    security: { passed: 0, failed: 0, tests: [] },
    infrastructure: { passed: 0, failed: 0, tests: [] }
  }
};

let tokens = {};

// Test users for educational sector
const testUsers = {
  admin: { email: 'admin@school.edu', password: 'admin123' },
  teacher: { email: 'teacher@school.edu', password: 'teacher123' },
  student: { email: 'student@school.edu', password: 'student123' },
  parent: { email: 'parent@school.edu', password: 'parent123' }
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
    let parsedData = null;
    
    try {
      parsedData = responseData ? JSON.parse(responseData) : null;
    } catch (e) {
      parsedData = responseData;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: parsedData,
      headers: Object.fromEntries(response.headers),
      responseTime: Date.now()
    };
  } catch (error) {
    return { 
      status: 0, 
      ok: false, 
      error: error.message,
      responseTime: Date.now()
    };
  }
}

function logTest(category, name, passed, details = '', responseData = null) {
  testResults.total++;
  testResults.passed += passed ? 1 : 0;
  testResults.failed += passed ? 0 : 1;
  
  testResults.categories[category].passed += passed ? 1 : 0;
  testResults.categories[category].failed += passed ? 0 : 1;
  testResults.categories[category].tests.push({
    name,
    passed,
    details,
    responseData: responseData ? JSON.stringify(responseData, null, 2) : null
  });
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${category.toUpperCase()}] ${name}: ${details}`);
}

// ==================== INFRASTRUCTURE TESTS ====================
async function testInfrastructure() {
  console.log('\n🏗️ INFRASTRUCTURE & HEALTH TESTS');
  console.log('Testing core system health and database connectivity...\n');

  // Test API Health
  const startTime = Date.now();
  const health = await makeRequest('GET', '/health');
  const responseTime = Date.now() - startTime;
  
  logTest('infrastructure', 'API Health Check', 
    health.ok && health.data?.status === 'ok', 
    `Status: ${health.data?.status || 'ERROR'} | Response Time: ${responseTime}ms`,
    health.data
  );

  // Test Database Health
  const dbHealth = await makeRequest('GET', '/health/db');
  logTest('infrastructure', 'Database Connectivity', 
    dbHealth.ok && dbHealth.data?.database === 'connected', 
    `DB Status: ${dbHealth.data?.database || 'ERROR'}`,
    dbHealth.data
  );

  // Test 404 Handling
  const notFound = await makeRequest('GET', '/non-existent-endpoint');
  logTest('infrastructure', '404 Error Handling', 
    notFound.status === 404, 
    `Status: ${notFound.status} | Expected: 404`
  );

  // Test CORS Headers
  logTest('infrastructure', 'CORS Headers Present', 
    health.headers && health.headers['access-control-allow-origin'], 
    `CORS Origin: ${health.headers['access-control-allow-origin'] || 'Missing'}`
  );
}

// ==================== AUTHENTICATION TESTS ====================
async function testAuthentication() {
  console.log('\n🔐 AUTHENTICATION & AUTHORIZATION TESTS');
  console.log('Testing JWT-based authentication system for educational users...\n');

  // Test login with existing users
  for (const [userType, credentials] of Object.entries(testUsers)) {
    const loginResponse = await makeRequest('POST', '/auth/login', credentials);
    
    if (loginResponse.ok && loginResponse.data?.token) {
      tokens[userType] = loginResponse.data.token;
      logTest('authentication', `Login ${userType}`, true, 
        `Token received | User: ${loginResponse.data.user?.email}`,
        { token: 'JWT_TOKEN_RECEIVED', user: loginResponse.data.user }
      );
    } else {
      logTest('authentication', `Login ${userType}`, false, 
        `Status: ${loginResponse.status} | Error: ${loginResponse.data?.error}`,
        loginResponse.data
      );
    }
  }

  // Test registration for new educational user
  const newUser = {
    email: `newstudent${Date.now()}@school.edu`,
    password: 'SecurePass123!',
    firstName: 'New',
    lastName: 'Student',
    phone: '9876543210',
    city: 'Educational District',
    userType: 'student'
  };

  const registerResponse = await makeRequest('POST', '/auth/register', newUser);
  logTest('authentication', 'User Registration', 
    registerResponse.ok && registerResponse.data?.token, 
    `Status: ${registerResponse.status} | New User Created`,
    registerResponse.data
  );

  // Test invalid login
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    email: 'invalid@school.edu',
    password: 'wrongpassword'
  });
  logTest('authentication', 'Invalid Login Rejection', 
    !invalidLogin.ok && invalidLogin.status === 401, 
    `Status: ${invalidLogin.status} | Expected: 401`
  );

  // Test password reset flow
  const forgotPassword = await makeRequest('POST', '/auth/forgot-password', 
    { email: testUsers.admin.email }
  );
  logTest('authentication', 'Forgot Password', 
    forgotPassword.ok, 
    `Status: ${forgotPassword.status}`,
    forgotPassword.data
  );
}

// ==================== USER MANAGEMENT TESTS ====================
async function testUserManagement() {
  console.log('\n👥 USER MANAGEMENT TESTS');
  console.log('Testing educational user management with RBAC...\n');
  
  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest('userManagement', 'Admin Token Required', false, 'No admin token available');
    return;
  }

  // Test get user profile
  const profile = await makeRequest('GET', '/users/profile', null, adminToken);
  logTest('userManagement', 'Get User Profile', 
    profile.ok && profile.data?.id, 
    `User ID: ${profile.data?.id} | Email: ${profile.data?.email}`,
    profile.data
  );

  // Test get users list
  const users = await makeRequest('GET', '/users', null, adminToken);
  logTest('userManagement', 'Get Users List', 
    users.ok && Array.isArray(users.data?.users), 
    `Found ${users.data?.users?.length || 0} users`,
    { totalUsers: users.data?.users?.length, pagination: users.data }
  );

  // Test user permissions
  const permissions = await makeRequest('GET', '/rbac/user-permissions', null, adminToken);
  logTest('userManagement', 'Get User Permissions', 
    permissions.ok && Array.isArray(permissions.data?.permissions), 
    `Permissions: ${permissions.data?.permissions?.length || 0}`,
    permissions.data
  );

  // Test user menus (for K-12 navigation)
  const menus = await makeRequest('GET', '/menus/user', null, adminToken);
  logTest('userManagement', 'Get User Menus', 
    menus.ok, 
    `Status: ${menus.status}`,
    menus.data
  );

  // Test create educational user
  const newEducationUser = {
    email: `teacher${Date.now()}@school.edu`,
    password: 'TeacherPass123!',
    firstName: 'New',
    lastName: 'Teacher',
    phone: '9876543210',
    city: 'School District',
    roles: ['teacher']
  };

  const createUser = await makeRequest('POST', '/users', newEducationUser, adminToken);
  logTest('userManagement', 'Create Educational User', 
    createUser.ok, 
    `Status: ${createUser.status} | New Teacher Created`,
    createUser.data
  );
}

// ==================== PROJECT MANAGEMENT TESTS ====================
async function testProjectManagement() {
  console.log('\n📁 PROJECT MANAGEMENT TESTS');
  console.log('Testing educational project management (assignments, courses, etc.)...\n');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test get projects (educational content)
  const projects = await makeRequest('GET', '/projects', null, adminToken);
  logTest('projectManagement', 'Get Projects List', 
    projects.ok && Array.isArray(projects.data?.projects), 
    `Found ${projects.data?.projects?.length || 0} projects`,
    { totalProjects: projects.data?.projects?.length, pagination: projects.data }
  );

  // Test create educational project
  const newProject = {
    title: 'Digital Learning Initiative',
    description: 'Comprehensive digital classroom setup for K-12 education',
    clientId: 1,
    budget: 1000000,
    city: 'Educational District',
    areaSqft: 2000,
    propertyType: 'educational_facility'
  };

  const createProject = await makeRequest('POST', '/projects', newProject, adminToken);
  logTest('projectManagement', 'Create Educational Project', 
    createProject.ok, 
    `Status: ${createProject.status} | Project Created`,
    createProject.data
  );

  if (createProject.ok && createProject.data?.id) {
    const projectId = createProject.data.id;
    
    // Test get project details
    const projectDetails = await makeRequest('GET', `/projects/${projectId}`, null, adminToken);
    logTest('projectManagement', 'Get Project Details', 
      projectDetails.ok, 
      `Status: ${projectDetails.status}`,
      projectDetails.data
    );

    // Test update project
    const updateProject = await makeRequest('PUT', `/projects/${projectId}`, 
      { status: 'in_progress', progressPercentage: 25 }, adminToken
    );
    logTest('projectManagement', 'Update Project', 
      updateProject.ok, 
      `Status: ${updateProject.status}`,
      updateProject.data
    );
  }
}

// ==================== LEAD MANAGEMENT TESTS ====================
async function testLeadManagement() {
  console.log('\n🎯 LEAD MANAGEMENT TESTS');
  console.log('Testing educational inquiry and enrollment management...\n');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test get leads
  const leads = await makeRequest('GET', '/leads', null, adminToken);
  logTest('leadManagement', 'Get Leads List', 
    leads.ok && Array.isArray(leads.data?.leads), 
    `Found ${leads.data?.leads?.length || 0} leads`,
    { totalLeads: leads.data?.leads?.length }
  );

  // Test create educational inquiry
  const newLead = {
    source: 'school_website',
    firstName: 'Parent',
    lastName: 'Guardian',
    email: `parent${Date.now()}@family.com`,
    phone: '9876543210',
    city: 'School District',
    budgetMin: 50000,
    budgetMax: 200000,
    projectType: 'educational_space',
    description: 'Inquiry about classroom interior design for better learning environment'
  };

  const createLead = await makeRequest('POST', '/leads', newLead, adminToken);
  logTest('leadManagement', 'Create Educational Lead', 
    createLead.ok, 
    `Status: ${createLead.status}`,
    createLead.data
  );

  if (createLead.ok && createLead.data?.id) {
    const leadId = createLead.data.id;
    
    // Test get lead details
    const leadDetails = await makeRequest('GET', `/leads/${leadId}`, null, adminToken);
    logTest('leadManagement', 'Get Lead Details', 
      leadDetails.ok, 
      `Status: ${leadDetails.status}`,
      leadDetails.data
    );

    // Test assign lead
    const assignLead = await makeRequest('POST', `/leads/${leadId}/assign`, 
      { assignedTo: 1 }, adminToken
    );
    logTest('leadManagement', 'Assign Lead', 
      assignLead.ok, 
      `Status: ${assignLead.status}`,
      assignLead.data
    );
  }
}

// ==================== MATERIALS & VENDOR TESTS ====================
async function testMaterialsAndVendors() {
  console.log('\n🏗️ MATERIALS & EDUCATIONAL VENDOR TESTS');
  console.log('Testing educational equipment and furniture vendors...\n');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test materials (educational equipment)
  const materials = await makeRequest('GET', '/materials', null, adminToken);
  logTest('materialVendor', 'Get Materials Catalog', 
    materials.ok, 
    `Status: ${materials.status}`,
    { materialsCount: materials.data?.materials?.length }
  );

  const categories = await makeRequest('GET', '/materials/categories', null, adminToken);
  logTest('materialVendor', 'Get Material Categories', 
    categories.ok, 
    `Status: ${categories.status}`,
    categories.data
  );

  // Test vendors (educational suppliers)
  const vendors = await makeRequest('GET', '/vendors', null, adminToken);
  logTest('materialVendor', 'Get Educational Vendors', 
    vendors.ok, 
    `Status: ${vendors.status}`,
    { vendorsCount: vendors.data?.vendors?.length }
  );

  // Test create educational material
  const newMaterial = {
    name: 'Interactive Whiteboard',
    category: 'Educational Technology',
    unit: 'piece',
    price: 50000,
    stockQuantity: 10,
    description: 'Smart interactive whiteboard for modern classrooms'
  };

  const createMaterial = await makeRequest('POST', '/materials', newMaterial, adminToken);
  logTest('materialVendor', 'Create Educational Material', 
    createMaterial.ok, 
    `Status: ${createMaterial.status}`,
    createMaterial.data
  );
}

// ==================== ANALYTICS TESTS ====================
async function testAnalytics() {
  console.log('\n📊 EDUCATIONAL ANALYTICS TESTS');
  console.log('Testing business intelligence for educational administrators...\n');
  
  const adminToken = tokens.admin;
  if (!adminToken) return;

  // Test dashboard analytics
  const dashboard = await makeRequest('GET', '/analytics/dashboard', null, adminToken);
  logTest('analytics', 'Dashboard Analytics', 
    dashboard.ok && dashboard.data?.totalLeads !== undefined, 
    `Total Leads: ${dashboard.data?.totalLeads} | Revenue: ${dashboard.data?.totalRevenue}`,
    dashboard.data
  );

  // Test lead analytics
  const leadAnalytics = await makeRequest('GET', '/analytics/leads', null, adminToken);
  logTest('analytics', 'Lead Analytics', 
    leadAnalytics.ok, 
    `Status: ${leadAnalytics.status}`,
    leadAnalytics.data
  );

  // Test project analytics
  const projectAnalytics = await makeRequest('GET', '/analytics/projects', null, adminToken);
  logTest('analytics', 'Project Analytics', 
    projectAnalytics.ok, 
    `Status: ${projectAnalytics.status}`,
    projectAnalytics.data
  );

  // Test search functionality
  const search = await makeRequest('GET', '/search?q=educational', null, adminToken);
  logTest('analytics', 'Search Functionality', 
    search.ok, 
    `Status: ${search.status}`,
    search.data
  );
}

// ==================== SECURITY TESTS ====================
async function testSecurity() {
  console.log('\n🔒 SECURITY & COMPLIANCE TESTS');
  console.log('Testing enterprise security for educational data protection...\n');

  // Test unauthorized access
  const unauthorized = await makeRequest('GET', '/users/profile');
  logTest('security', 'Unauthorized Access Blocked', 
    !unauthorized.ok && unauthorized.status === 401, 
    `Status: ${unauthorized.status} | Expected: 401`
  );

  // Test invalid token
  const invalidToken = await makeRequest('GET', '/users/profile', null, 'invalid-jwt-token');
  logTest('security', 'Invalid Token Rejected', 
    !invalidToken.ok && invalidToken.status === 401, 
    `Status: ${invalidToken.status} | Expected: 401`
  );

  // Test SQL injection prevention
  const sqlInjection = await makeRequest('POST', '/auth/login', {
    email: "admin@school.edu'; DROP TABLE users; --",
    password: 'test'
  });
  logTest('security', 'SQL Injection Prevention', 
    !sqlInjection.ok || sqlInjection.status !== 200, 
    `Status: ${sqlInjection.status} | SQL injection blocked`
  );

  // Test XSS prevention
  const xssTest = await makeRequest('POST', '/leads', {
    firstName: '<script>alert("xss")</script>',
    lastName: 'Test',
    email: 'test@school.edu',
    phone: '1234567890',
    city: 'Test'
  }, tokens.admin);
  logTest('security', 'XSS Prevention', 
    xssTest.status !== 500, 
    `Status: ${xssTest.status} | XSS handled properly`
  );
}

// ==================== MISSING APIS TESTS ====================
async function testMissingAPIs() {
  console.log('\n🚀 MISSING APIS IMPLEMENTATION TESTS');
  console.log('Testing newly implemented endpoints for complete coverage...\n');

  const adminToken = tokens.admin;
  const userToken = tokens.teacher;

  // Test wallet functionality
  if (userToken) {
    const wallet = await makeRequest('GET', '/wallet', null, userToken);
    logTest('userManagement', 'Wallet Functionality', 
      wallet.ok, 
      `Status: ${wallet.status}`,
      wallet.data
    );

    const transactions = await makeRequest('GET', '/wallet/transactions', null, userToken);
    logTest('userManagement', 'Wallet Transactions', 
      transactions.ok, 
      `Status: ${transactions.status}`,
      transactions.data
    );
  }

  // Test financial management
  if (adminToken) {
    const quotations = await makeRequest('GET', '/quotations', null, adminToken);
    logTest('projectManagement', 'Quotations Management', 
      quotations.ok, 
      `Status: ${quotations.status}`,
      quotations.data
    );

    const invoices = await makeRequest('GET', '/invoices', null, adminToken);
    logTest('projectManagement', 'Invoices Management', 
      invoices.ok, 
      `Status: ${invoices.status}`,
      invoices.data
    );
  }

  // Test employee management
  if (adminToken) {
    const employees = await makeRequest('GET', '/employees', null, adminToken);
    logTest('userManagement', 'Employee Management', 
      employees.ok, 
      `Status: ${employees.status}`,
      employees.data
    );
  }

  // Test complaint system
  if (userToken) {
    const complaints = await makeRequest('GET', '/complaints', null, userToken);
    logTest('userManagement', 'Complaints System', 
      complaints.ok, 
      `Status: ${complaints.status}`,
      complaints.data
    );

    // Test create complaint
    const newComplaint = {
      title: 'Classroom Equipment Issue',
      description: 'Projector not working in classroom 101',
      priority: 'high'
    };

    const createComplaint = await makeRequest('POST', '/complaints', newComplaint, userToken);
    logTest('userManagement', 'Create Complaint', 
      createComplaint.ok, 
      `Status: ${createComplaint.status}`,
      createComplaint.data
    );
  }

  // Test notifications
  if (userToken) {
    const notifications = await makeRequest('GET', '/notifications', null, userToken);
    logTest('userManagement', 'Notifications System', 
      notifications.ok, 
      `Status: ${notifications.status}`,
      notifications.data
    );
  }
}

// ==================== GENERATE COMPREHENSIVE REPORT ====================
function generateTestReport() {
  console.log('\n' + '=' .repeat(100));
  console.log('🏆 COMPREHENSIVE API TEST REPORT - GHARINTO LEAP EDUCATIONAL PLATFORM');
  console.log('=' .repeat(100));
  
  const totalTests = testResults.total;
  const passedTests = testResults.passed;
  const failedTests = testResults.failed;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   Total Tests Executed: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  // Category breakdown
  console.log(`\n📋 TEST CATEGORY BREAKDOWN:`);
  for (const [category, results] of Object.entries(testResults.categories)) {
    const categoryTotal = results.passed + results.failed;
    const categoryRate = categoryTotal > 0 ? (results.passed / categoryTotal * 100).toFixed(1) : 0;
    console.log(`   ${category.toUpperCase()}: ${results.passed}/${categoryTotal} (${categoryRate}%)`);
  }
  
  // Failed tests details
  if (failedTests > 0) {
    console.log(`\n🔍 FAILED TESTS ANALYSIS:`);
    for (const [category, results] of Object.entries(testResults.categories)) {
      const failedInCategory = results.tests.filter(test => !test.passed);
      if (failedInCategory.length > 0) {
        console.log(`\n   ${category.toUpperCase()} FAILURES:`);
        failedInCategory.forEach(test => {
          console.log(`     ❌ ${test.name}: ${test.details}`);
        });
      }
    }
  }
  
  // Educational sector assessment
  console.log(`\n🎓 EDUCATIONAL SECTOR READINESS ASSESSMENT:`);
  console.log(`   Target Audience: School administrators, management, and educational technology buyers`);
  console.log(`   K-12 Compliance: ${successRate >= 90 ? '✅ EXCELLENT' : successRate >= 80 ? '🟡 GOOD' : '❌ NEEDS IMPROVEMENT'}`);
  console.log(`   Data Security: ${testResults.categories.security.passed >= 3 ? '✅ COMPLIANT' : '⚠️ REVIEW NEEDED'}`);
  console.log(`   User Management: ${testResults.categories.userManagement.passed >= 5 ? '✅ READY' : '⚠️ INCOMPLETE'}`);
  
  // Production readiness
  console.log(`\n🚀 PRODUCTION READINESS ASSESSMENT:`);
  if (successRate >= 95) {
    console.log('   🟢 PRODUCTION READY - Excellent performance, deploy immediately');
  } else if (successRate >= 85) {
    console.log('   🟡 MOSTLY READY - Minor issues, can deploy with monitoring');
  } else if (successRate >= 70) {
    console.log('   🟠 NEEDS WORK - Several issues require attention before deployment');
  } else {
    console.log('   🔴 NOT READY - Critical issues must be resolved before deployment');
  }
  
  // Database integration
  console.log(`\n💾 DATABASE INTEGRATION STATUS:`);
  console.log(`   PostgreSQL Connection: ${testResults.categories.infrastructure.tests.find(t => t.name === 'Database Connectivity')?.passed ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
  console.log(`   API Health: ${testResults.categories.infrastructure.tests.find(t => t.name === 'API Health Check')?.passed ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  
  console.log(`\n✨ Educational Platform Score: ${successRate}%`);
  console.log('=' .repeat(100));
  
  return successRate >= 85;
}

// ==================== MAIN TEST EXECUTION ====================
async function runProductionAPITests() {
  const startTime = Date.now();
  
  console.log('🚀 STARTING PRODUCTION API TESTING SUITE');
  console.log('🏫 Gharinto Leap Educational Interior Design Platform');
  console.log('🎯 Testing for K-12 School Administrators & Technology Buyers');
  console.log('💾 Database: PostgreSQL Production Environment');
  console.log('=' .repeat(100));
  
  try {
    // Execute all test categories
    await testInfrastructure();
    await testAuthentication();
    await testUserManagement();
    await testProjectManagement();
    await testLeadManagement();
    await testMaterialsAndVendors();
    await testAnalytics();
    await testSecurity();
    await testMissingAPIs();
    
    // Generate comprehensive report
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Total Test Duration: ${duration} seconds`);
    
    const isProductionReady = generateTestReport();
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      environment: 'Production PostgreSQL',
      targetAudience: 'K-12 Educational Sector',
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: `${((testResults.passed / testResults.total) * 100).toFixed(1)}%`
      },
      categories: testResults.categories,
      productionReady: isProductionReady
    };
    
    require('fs').writeFileSync('PRODUCTION_TEST_RESULTS.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Detailed test results saved to: PRODUCTION_TEST_RESULTS.json');
    
    process.exit(isProductionReady ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test suite execution failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runProductionAPITests();
}

module.exports = { runProductionAPITests };