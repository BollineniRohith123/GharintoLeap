#!/usr/bin/env node

/**
 * Frontend-API Integration Test
 * Tests the integration between frontend and backend APIs
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🔗 FRONTEND-API INTEGRATION TEST');
console.log('=================================');

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: PASSED ${details}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: FAILED ${details}`);
  }
  testResults.details.push({ name, passed, details });
}

async function testFrontendAccessibility() {
  try {
    const response = await fetch(FRONTEND_URL);
    const html = await response.text();
    
    const isAccessible = response.ok && html.includes('<!DOCTYPE html>');
    logTest('Frontend Accessibility', isAccessible, `Status: ${response.status}`);
    return isAccessible;
  } catch (error) {
    logTest('Frontend Accessibility', false, `Error: ${error.message}`);
    return false;
  }
}

async function testBackendConnectivity() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    const isHealthy = response.ok && data.status === 'ok';
    logTest('Backend Connectivity', isHealthy, `Status: ${response.status}`);
    return isHealthy;
  } catch (error) {
    logTest('Backend Connectivity', false, `Error: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    
    const corsHeaders = response.headers.get('access-control-allow-origin');
    const corsWorking = response.ok && (corsHeaders === '*' || corsHeaders === FRONTEND_URL);
    
    logTest('CORS Configuration', corsWorking, `CORS Header: ${corsHeaders || 'none'}`);
    return corsWorking;
  } catch (error) {
    logTest('CORS Configuration', false, `Error: ${error.message}`);
    return false;
  }
}

async function testAuthenticationFlow() {
  try {
    // Test login endpoint
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      logTest('Authentication Flow', false, `Login failed: ${loginResponse.status}`);
      return null;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      logTest('Authentication Flow', false, 'No token received');
      return null;
    }
    
    // Test authenticated endpoint
    const profileResponse = await fetch(`${BACKEND_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': FRONTEND_URL
      }
    });
    
    const profileWorking = profileResponse.ok;
    logTest('Authentication Flow', profileWorking, `Profile access: ${profileResponse.status}`);
    
    return profileWorking ? token : null;
  } catch (error) {
    logTest('Authentication Flow', false, `Error: ${error.message}`);
    return null;
  }
}

async function testKeyAPIEndpoints(token) {
  if (!token) {
    logTest('Key API Endpoints', false, 'No authentication token available');
    return;
  }
  
  const endpoints = [
    { name: 'Users', url: '/users' },
    { name: 'Projects', url: '/projects' },
    { name: 'Leads', url: '/leads' },
    { name: 'Materials', url: '/materials' },
    { name: 'Analytics', url: '/analytics/dashboard' }
  ];
  
  let passedEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      });
      
      if (response.ok) {
        passedEndpoints++;
        console.log(`  ✅ ${endpoint.name}: Working`);
      } else {
        console.log(`  ❌ ${endpoint.name}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`  ❌ ${endpoint.name}: Error`);
    }
  }
  
  const allWorking = passedEndpoints === endpoints.length;
  logTest('Key API Endpoints', allWorking, `${passedEndpoints}/${endpoints.length} working`);
}

async function testDataFlow() {
  try {
    // Test if we can fetch and parse data
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    const token = data.token;
    
    if (token) {
      const projectsResponse = await fetch(`${BACKEND_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      });
      
      const projectsData = await projectsResponse.json();
      const hasData = projectsData.projects && Array.isArray(projectsData.projects);
      
      logTest('Data Flow', hasData, `Projects data: ${hasData ? 'valid' : 'invalid'}`);
    } else {
      logTest('Data Flow', false, 'No authentication token');
    }
  } catch (error) {
    logTest('Data Flow', false, `Error: ${error.message}`);
  }
}

async function testErrorHandling() {
  try {
    // Test 404 endpoint
    const response = await fetch(`${BACKEND_URL}/nonexistent-endpoint`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    
    const handles404 = response.status === 404;
    
    // Test unauthorized access
    const unauthorizedResponse = await fetch(`${BACKEND_URL}/users`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    
    const handlesUnauth = unauthorizedResponse.status === 403;
    
    const errorHandling = handles404 && handlesUnauth;
    logTest('Error Handling', errorHandling, `404: ${handles404}, 403: ${handlesUnauth}`);
  } catch (error) {
    logTest('Error Handling', false, `Error: ${error.message}`);
  }
}

async function runIntegrationTests() {
  console.log('\n🚀 Starting Frontend-API Integration Tests...\n');
  
  // Test basic connectivity
  const frontendOk = await testFrontendAccessibility();
  const backendOk = await testBackendConnectivity();
  
  if (!frontendOk || !backendOk) {
    console.log('\n❌ Basic connectivity failed. Cannot proceed with integration tests.');
    return;
  }
  
  // Test CORS
  await testCORSConfiguration();
  
  // Test authentication flow
  const token = await testAuthenticationFlow();
  
  // Test key endpoints
  await testKeyAPIEndpoints(token);
  
  // Test data flow
  await testDataFlow();
  
  // Test error handling
  await testErrorHandling();
  
  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('============================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.details}`);
    });
  }
  
  console.log('\n🎯 INTEGRATION STATUS');
  console.log('=====================');
  if (testResults.passed >= testResults.total * 0.8) {
    console.log('🎉 EXCELLENT - Frontend and Backend are well integrated!');
  } else if (testResults.passed >= testResults.total * 0.6) {
    console.log('🟢 GOOD - Integration working with minor issues');
  } else {
    console.log('🔴 POOR - Significant integration issues detected');
  }
  
  return testResults;
}

// Run the tests
runIntegrationTests().catch(console.error);
