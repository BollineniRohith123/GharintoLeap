#!/usr/bin/env node

/**
 * Backend-Frontend Integration Verification
 * Comprehensive test of the integration between backend and frontend
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BACKEND_URL = 'http://localhost:4000';

console.log('🔗 BACKEND-FRONTEND INTEGRATION VERIFICATION');
console.log('=============================================');

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

async function testFrontendServing() {
  try {
    const { stdout } = await execAsync('curl -s http://localhost:5173 | head -5');
    const isServing = stdout.includes('<!DOCTYPE html>');
    logTest('Frontend Serving', isServing, 'HTML content detected');
    return isServing;
  } catch (error) {
    logTest('Frontend Serving', false, `Error: ${error.message}`);
    return false;
  }
}

async function testBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    const isHealthy = response.ok && data.status === 'ok';
    logTest('Backend Health', isHealthy, `Status: ${data.status}`);
    return isHealthy;
  } catch (error) {
    logTest('Backend Health', false, `Error: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnectivity() {
  try {
    const response = await fetch(`${BACKEND_URL}/health/db`);
    const data = await response.json();
    const isConnected = response.ok && data.status === 'ok';
    logTest('Database Connectivity', isConnected, `DB Status: ${data.status}`);
    return isConnected;
  } catch (error) {
    logTest('Database Connectivity', false, `Error: ${error.message}`);
    return false;
  }
}

async function testAuthenticationEndpoints() {
  try {
    // Test login
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    const loginWorking = loginResponse.ok && loginData.token;
    
    if (loginWorking) {
      // Test profile endpoint with token
      const profileResponse = await fetch(`${BACKEND_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const profileWorking = profileResponse.ok;
      logTest('Authentication Endpoints', profileWorking, 'Login and profile access working');
      return loginData.token;
    } else {
      logTest('Authentication Endpoints', false, 'Login failed');
      return null;
    }
  } catch (error) {
    logTest('Authentication Endpoints', false, `Error: ${error.message}`);
    return null;
  }
}

async function testCRUDOperations(token) {
  if (!token) {
    logTest('CRUD Operations', false, 'No authentication token');
    return;
  }
  
  try {
    // Test READ operations
    const usersResponse = await fetch(`${BACKEND_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projectsResponse = await fetch(`${BACKEND_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const leadsResponse = await fetch(`${BACKEND_URL}/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const readOperations = usersResponse.ok && projectsResponse.ok && leadsResponse.ok;
    
    // Test CREATE operation (create a test user)
    const createResponse = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `integration-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Integration',
        lastName: 'Test',
        phone: '9876543210',
        city: 'Mumbai'
      })
    });
    
    const createWorking = createResponse.status === 201;
    
    const crudWorking = readOperations && createWorking;
    logTest('CRUD Operations', crudWorking, 
           `Read: ${readOperations}, Create: ${createWorking}`);
  } catch (error) {
    logTest('CRUD Operations', false, `Error: ${error.message}`);
  }
}

async function testAnalyticsEndpoints(token) {
  if (!token) {
    logTest('Analytics Endpoints', false, 'No authentication token');
    return;
  }
  
  try {
    const dashboardResponse = await fetch(`${BACKEND_URL}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const leadsAnalyticsResponse = await fetch(`${BACKEND_URL}/analytics/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const analyticsWorking = dashboardResponse.ok && leadsAnalyticsResponse.ok;
    logTest('Analytics Endpoints', analyticsWorking, 
           `Dashboard: ${dashboardResponse.status}, Leads: ${leadsAnalyticsResponse.status}`);
  } catch (error) {
    logTest('Analytics Endpoints', false, `Error: ${error.message}`);
  }
}

async function testSearchFunctionality(token) {
  if (!token) {
    logTest('Search Functionality', false, 'No authentication token');
    return;
  }
  
  try {
    const searchResponse = await fetch(`${BACKEND_URL}/search?q=project`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchWorking = searchResponse.ok;
    logTest('Search Functionality', searchWorking, `Status: ${searchResponse.status}`);
  } catch (error) {
    logTest('Search Functionality', false, `Error: ${error.message}`);
  }
}

async function testRBACSystem(token) {
  if (!token) {
    logTest('RBAC System', false, 'No authentication token');
    return;
  }
  
  try {
    const permissionsResponse = await fetch(`${BACKEND_URL}/rbac/user-permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const menusResponse = await fetch(`${BACKEND_URL}/menus/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const rbacWorking = permissionsResponse.ok && menusResponse.ok;
    logTest('RBAC System', rbacWorking, 
           `Permissions: ${permissionsResponse.status}, Menus: ${menusResponse.status}`);
  } catch (error) {
    logTest('RBAC System', false, `Error: ${error.message}`);
  }
}

async function testPerformanceMetrics() {
  try {
    const startTime = Date.now();
    const response = await fetch(`${BACKEND_URL}/health`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    const performanceGood = response.ok && responseTime < 1000;
    
    logTest('Performance Metrics', performanceGood, 
           `Response time: ${responseTime}ms`);
  } catch (error) {
    logTest('Performance Metrics', false, `Error: ${error.message}`);
  }
}

async function runIntegrationVerification() {
  console.log('\n🚀 Starting Integration Verification...\n');
  
  // Test basic services
  const frontendOk = await testFrontendServing();
  const backendOk = await testBackendHealth();
  const dbOk = await testDatabaseConnectivity();
  
  if (!backendOk || !dbOk) {
    console.log('\n❌ Basic services failed. Cannot proceed with integration tests.');
    return;
  }
  
  // Test authentication and get token
  const token = await testAuthenticationEndpoints();
  
  // Test core functionality
  await testCRUDOperations(token);
  await testAnalyticsEndpoints(token);
  await testSearchFunctionality(token);
  await testRBACSystem(token);
  await testPerformanceMetrics();
  
  console.log('\n📊 INTEGRATION VERIFICATION RESULTS');
  console.log('===================================');
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
  const successRate = (testResults.passed / testResults.total) * 100;
  
  if (successRate >= 90) {
    console.log('🎉 EXCELLENT - Frontend and Backend are perfectly integrated!');
  } else if (successRate >= 80) {
    console.log('🟢 GOOD - Integration working well with minor issues');
  } else if (successRate >= 70) {
    console.log('🟡 FAIR - Integration working but needs attention');
  } else {
    console.log('🔴 POOR - Significant integration issues detected');
  }
  
  console.log('\n🌐 SERVICE STATUS');
  console.log('=================');
  console.log(`Frontend: ${frontendOk ? '✅ Running' : '❌ Down'} (http://localhost:5173)`);
  console.log(`Backend: ${backendOk ? '✅ Running' : '❌ Down'} (http://localhost:4000)`);
  console.log(`Database: ${dbOk ? '✅ Connected' : '❌ Disconnected'} (PostgreSQL)`);
  
  return testResults;
}

// Run the verification
runIntegrationVerification().catch(console.error);
