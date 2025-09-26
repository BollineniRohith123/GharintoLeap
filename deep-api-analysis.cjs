const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// All test users with different roles
const TEST_USERS = [
  { email: 'admin@gharinto.com', password: 'password123', role: 'admin' },
  { email: 'superadmin@gharinto.com', password: 'password123', role: 'super_admin' },
  { email: 'pm@gharinto.com', password: 'password123', role: 'project_manager' },
  { email: 'designer@gharinto.com', password: 'password123', role: 'interior_designer' },
  { email: 'customer@gharinto.com', password: 'password123', role: 'customer' },
  { email: 'vendor@gharinto.com', password: 'password123', role: 'vendor' }
];

let tokens = {};
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

// Utility function to make requests with detailed error handling
async function makeRequest(config) {
  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data?.error || error.message
    };
  }
}

// Log test results
function logTest(testName, status, details = '') {
  totalTests++;
  if (status === 'PASSED') {
    passedTests++;
    console.log(`✅ ${testName}: PASSED ${details ? '- ' + details : ''}`);
  } else {
    failedTests.push({ test: testName, details: details });
    console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
  }
}

// Deep Authentication Testing
async function deepAuthenticationTest() {
  console.log('\n🔐 DEEP AUTHENTICATION TESTING');
  
  for (const user of TEST_USERS) {
    // Valid login test
    const loginResult = await makeRequest({
      method: 'POST',
      url: `${BASE_URL}/auth/login`,
      data: { email: user.email, password: user.password }
    });
    
    if (loginResult.success && loginResult.data.token) {
      tokens[user.role] = loginResult.data.token;
      logTest(`${user.role} Login`, 'PASSED', `Token received`);
      
      // Test token validation
      const profileResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/users/profile`,
        headers: { Authorization: `Bearer ${tokens[user.role]}` }
      });
      
      if (profileResult.success) {
        logTest(`${user.role} Token Validation`, 'PASSED', `Profile loaded`);
      } else {
        logTest(`${user.role} Token Validation`, 'FAILED', `Status: ${profileResult.status}`);
      }
    } else {
      logTest(`${user.role} Login`, 'FAILED', `Status: ${loginResult.status}`);
    }
    
    // Invalid password test
    const invalidResult = await makeRequest({
      method: 'POST',
      url: `${BASE_URL}/auth/login`,
      data: { email: user.email, password: 'wrongpassword' }
    });
    
    if (!invalidResult.success && invalidResult.status === 401) {
      logTest(`${user.role} Invalid Password`, 'PASSED', 'Correctly rejected');
    } else {
      logTest(`${user.role} Invalid Password`, 'FAILED', `Status: ${invalidResult.status}`);
    }
  }
}

// Deep Infrastructure Testing
async function deepInfrastructureTest() {
  console.log('\n🏗️  DEEP INFRASTRUCTURE TESTING');
  
  // API Health Check
  const healthResult = await makeRequest({ method: 'GET', url: `${BASE_URL}/health` });
  if (healthResult.success && healthResult.data.status === 'healthy') {
    logTest('API Health Check', 'PASSED', `Version: ${healthResult.data.version}`);
  } else {
    logTest('API Health Check', 'FAILED', `Status: ${healthResult.status}`);
  }
  
  // Database Health Check
  const dbResult = await makeRequest({ method: 'GET', url: `${BASE_URL}/health/db` });
  if (dbResult.success && dbResult.data.database.status === 'connected') {
    logTest('Database Health', 'PASSED', `DB: ${dbResult.data.database.name}`);
  } else {
    logTest('Database Health', 'FAILED', `Status: ${dbResult.status}`);
  }
  
  // 404 Error Handling
  const notFoundResult = await makeRequest({ method: 'GET', url: `${BASE_URL}/nonexistent` });
  if (!notFoundResult.success && notFoundResult.status === 404) {
    logTest('404 Error Handling', 'PASSED', 'Returns proper 404');
  } else {
    logTest('404 Error Handling', 'FAILED', `Status: ${notFoundResult.status}`);
  }
}

// Deep RBAC Testing
async function deepRBACTest() {
  console.log('\n🔐 DEEP RBAC SYSTEM TESTING');
  
  for (const user of TEST_USERS) {
    if (!tokens[user.role]) continue;
    
    // Test permissions
    const permResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/rbac/user-permissions`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (permResult.success && permResult.data.permissions) {
      logTest(`${user.role} Permissions`, 'PASSED', `${permResult.data.permissions.length} perms`);
    } else {
      logTest(`${user.role} Permissions`, 'FAILED', `Status: ${permResult.status}`);
    }
    
    // Test menus
    const menuResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/menus/user`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (menuResult.success && menuResult.data.menus) {
      logTest(`${user.role} Menus`, 'PASSED', `${menuResult.data.menus.length} menus`);
    } else {
      logTest(`${user.role} Menus`, 'FAILED', `Status: ${menuResult.status}`);
    }
  }
}

// Deep Lead Management Testing
async function deepLeadTest() {
  console.log('\n📈 DEEP LEAD MANAGEMENT TESTING');
  
  for (const user of TEST_USERS) {
    if (!tokens[user.role]) continue;
    
    // Basic leads list
    const leadsResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/leads`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (leadsResult.success && leadsResult.data.leads) {
      logTest(`${user.role} Leads List`, 'PASSED', `${leadsResult.data.leads.length} leads`);
      
      // Test pagination
      const pageResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/leads?page=1&limit=5`,
        headers: { Authorization: `Bearer ${tokens[user.role]}` }
      });
      
      if (pageResult.success) {
        logTest(`${user.role} Leads Pagination`, 'PASSED', `${pageResult.data.leads.length} results`);
      } else {
        logTest(`${user.role} Leads Pagination`, 'FAILED', `Status: ${pageResult.status}`);
      }
      
      // Test filtering
      const filterResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/leads?status=new`,
        headers: { Authorization: `Bearer ${tokens[user.role]}` }
      });
      
      if (filterResult.success) {
        logTest(`${user.role} Leads Filter`, 'PASSED', `${filterResult.data.leads.length} filtered`);
      } else {
        logTest(`${user.role} Leads Filter`, 'FAILED', `Status: ${filterResult.status}`);
      }
    } else {
      logTest(`${user.role} Leads List`, 'FAILED', `Status: ${leadsResult.status}`);
    }
  }
}

// Deep Project Management Testing
async function deepProjectTest() {
  console.log('\n🏗️  DEEP PROJECT MANAGEMENT TESTING');
  
  for (const user of TEST_USERS) {
    if (!tokens[user.role]) continue;
    
    const projectsResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/projects`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (projectsResult.success && projectsResult.data.projects) {
      logTest(`${user.role} Projects List`, 'PASSED', `${projectsResult.data.projects.length} projects`);
      
      // Test pagination
      const pageResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/projects?page=1&limit=10`,
        headers: { Authorization: `Bearer ${tokens[user.role]}` }
      });
      
      if (pageResult.success) {
        logTest(`${user.role} Projects Pagination`, 'PASSED', `${pageResult.data.projects.length} results`);
      } else {
        logTest(`${user.role} Projects Pagination`, 'FAILED', `Status: ${pageResult.status}`);
      }
    } else {
      logTest(`${user.role} Projects List`, 'FAILED', `Status: ${projectsResult.status}`);
    }
  }
}

// Deep Materials & Vendor Testing
async function deepMaterialsTest() {
  console.log('\n🏪 DEEP MATERIALS & VENDOR TESTING');
  
  if (!tokens.admin) return;
  
  // Materials catalog
  const materialsResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/materials`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (materialsResult.success && materialsResult.data.materials) {
    logTest('Materials Catalog', 'PASSED', `${materialsResult.data.materials.length} materials`);
    
    // Test search
    const searchResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/materials?search=paint`,
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    
    if (searchResult.success) {
      logTest('Materials Search', 'PASSED', `${searchResult.data.materials.length} results`);
    } else {
      logTest('Materials Search', 'FAILED', `Status: ${searchResult.status}`);
    }
  } else {
    logTest('Materials Catalog', 'FAILED', `Status: ${materialsResult.status}`);
  }
  
  // Material categories
  const categoriesResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/materials/categories`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (categoriesResult.success && categoriesResult.data.categories) {
    logTest('Material Categories', 'PASSED', `${categoriesResult.data.categories.length} categories`);
  } else {
    logTest('Material Categories', 'FAILED', `Status: ${categoriesResult.status}`);
  }
  
  // Vendors
  const vendorsResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/vendors`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (vendorsResult.success && vendorsResult.data.vendors) {
    logTest('Vendors List', 'PASSED', `${vendorsResult.data.vendors.length} vendors`);
  } else {
    logTest('Vendors List', 'FAILED', `Status: ${vendorsResult.status}`);
  }
}

// Deep Financial Testing
async function deepFinancialTest() {
  console.log('\n💰 DEEP FINANCIAL TESTING');
  
  for (const user of TEST_USERS) {
    if (!tokens[user.role]) continue;
    
    // Wallet balance
    const walletResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/wallets/balance`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (walletResult.success && walletResult.data.wallet) {
      logTest(`${user.role} Wallet`, 'PASSED', `Balance: ₹${walletResult.data.wallet.balance || 0}`);
    } else {
      logTest(`${user.role} Wallet`, 'FAILED', `Status: ${walletResult.status}`);
    }
    
    // Transactions
    const transResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/transactions`,
      headers: { Authorization: `Bearer ${tokens[user.role]}` }
    });
    
    if (transResult.success && transResult.data.transactions) {
      logTest(`${user.role} Transactions`, 'PASSED', `${transResult.data.transactions.length} transactions`);
    } else {
      logTest(`${user.role} Transactions`, 'FAILED', `Status: ${transResult.status}`);
    }
  }
}

// Deep Analytics Testing
async function deepAnalyticsTest() {
  console.log('\n📊 DEEP ANALYTICS TESTING');
  
  if (!tokens.admin) return;
  
  // Main dashboard
  const dashResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/analytics/dashboard`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (dashResult.success && dashResult.data.totalLeads !== undefined) {
    logTest('Analytics Dashboard', 'PASSED', 
      `Leads: ${dashResult.data.totalLeads}, Revenue: ₹${dashResult.data.totalRevenue}`);
  } else {
    logTest('Analytics Dashboard', 'FAILED', `Status: ${dashResult.status}`);
  }
  
  // Revenue analytics
  const revenueResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/analytics/revenue`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (revenueResult.success && revenueResult.data.revenueData) {
    logTest('Revenue Analytics', 'PASSED', `${revenueResult.data.revenueData.length} data points`);
  } else {
    logTest('Revenue Analytics', 'FAILED', `Status: ${revenueResult.status}`);
  }
  
  // Leads funnel
  const funnelResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/analytics/leads-funnel`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (funnelResult.success && funnelResult.data.funnelData) {
    logTest('Leads Funnel', 'PASSED', `${funnelResult.data.funnelData.length} funnel stages`);
  } else {
    logTest('Leads Funnel', 'FAILED', `Status: ${funnelResult.status}`);
  }
}

// Deep Search Testing
async function deepSearchTest() {
  console.log('\n🔍 DEEP SEARCH TESTING');
  
  if (!tokens.admin) return;
  
  // Global search
  const globalResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/search?q=project`,
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });
  
  if (globalResult.success) {
    const data = globalResult.data;
    logTest('Global Search', 'PASSED', 
      `Leads: ${data.leads?.length || 0}, Projects: ${data.projects?.length || 0}`);
  } else {
    logTest('Global Search', 'FAILED', `Status: ${globalResult.status}`);
  }
  
  // Type-specific searches
  const searchTypes = ['leads', 'projects', 'materials'];
  for (const type of searchTypes) {
    const typeResult = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/search?q=test&type=${type}`,
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    
    if (typeResult.success) {
      logTest(`Search ${type}`, 'PASSED', `${typeResult.data[type]?.length || 0} results`);
    } else {
      logTest(`Search ${type}`, 'FAILED', `Status: ${typeResult.status}`);
    }
  }
}

// Deep Security Testing
async function deepSecurityTest() {
  console.log('\n🔒 DEEP SECURITY TESTING');
  
  // Unauthorized access
  const unauthResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/users/profile`
  });
  
  if (!unauthResult.success && unauthResult.status === 401) {
    logTest('Unauthorized Block', 'PASSED', 'Blocks requests without token');
  } else {
    logTest('Unauthorized Block', 'FAILED', `Status: ${unauthResult.status}`);
  }
  
  // Invalid token
  const invalidResult = await makeRequest({
    method: 'GET',
    url: `${BASE_URL}/users/profile`,
    headers: { Authorization: 'Bearer invalid-token' }
  });
  
  if (!invalidResult.success && invalidResult.status === 401) {
    logTest('Invalid Token Block', 'PASSED', 'Rejects invalid tokens');
  } else {
    logTest('Invalid Token Block', 'FAILED', `Status: ${invalidResult.status}`);
  }
}

// Main execution function
async function runDeepAnalysis() {
  console.log('🔍 STARTING COMPREHENSIVE DEEP API ANALYSIS');
  console.log('🏢 Gharinto Leap - Every Endpoint Verification');
  console.log('================================================\n');
  
  try {
    await deepInfrastructureTest();
    await deepAuthenticationTest();
    await deepRBACTest();
    await deepLeadTest();
    await deepProjectTest();
    await deepMaterialsTest();
    await deepFinancialTest();
    await deepAnalyticsTest();
    await deepSearchTest();
    await deepSecurityTest();
    
    // Final Results
    console.log('\n================================================');
    console.log('🏁 DEEP API ANALYSIS COMPLETE');
    console.log('================================================');
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS DETAILS:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.details}`);
      });
    }
    
    console.log('\n🎯 API ENDPOINT COVERAGE:');
    console.log('   ✅ Authentication & Authorization');
    console.log('   ✅ User Management & RBAC');
    console.log('   ✅ Lead Management System');
    console.log('   ✅ Project Management System');
    console.log('   ✅ Materials & Vendor Management');
    console.log('   ✅ Financial Management');
    console.log('   ✅ Analytics & Reporting');
    console.log('   ✅ Search & Utility Functions');
    console.log('   ✅ Security & Edge Cases');
    
    if (passedTests === totalTests) {
      console.log('\n🎉 FINAL ASSESSMENT:');
      console.log('   🟢 ALL APIS WORKING PERFECTLY!');
      console.log('   ✨ 100% Success Rate - Production Ready!');
      console.log('   🚀 Every endpoint verified and operational!');
    } else {
      console.log('\n⚠️  FINAL ASSESSMENT:');
      console.log(`   🟡 ${passedTests}/${totalTests} APIs working properly`);
      console.log('   📝 Some endpoints need attention');
    }
    
    console.log('\n🔥 DEEP ANALYSIS COMPLETE!');
    console.log('================================================');
    
  } catch (error) {
    console.error('❌ Deep analysis failed:', error.message);
  }
}

// Run the deep analysis
runDeepAnalysis().catch(console.error);