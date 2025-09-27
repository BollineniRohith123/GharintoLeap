#!/usr/bin/env node

/**
 * Comprehensive Backend Analysis & Testing
 * Tests every endpoint, file structure, and business logic
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'http://localhost:4000';

console.log('🔧 COMPREHENSIVE BACKEND ANALYSIS & TESTING');
console.log('=============================================');
console.log('🏢 Gharinto Leap Interior Design Marketplace');
console.log('=============================================\n');

let backendResults = {
  structure: { passed: 0, failed: 0, total: 0, details: [] },
  endpoints: { passed: 0, failed: 0, total: 0, details: [] },
  authentication: { passed: 0, failed: 0, total: 0, details: [] },
  business: { passed: 0, failed: 0, total: 0, details: [] },
  database: { passed: 0, failed: 0, total: 0, details: [] }
};

function logBackendTest(category, name, passed, details = '') {
  backendResults[category].total++;
  if (passed) {
    backendResults[category].passed++;
    console.log(`✅ ${name}: PASSED ${details}`);
  } else {
    backendResults[category].failed++;
    console.log(`❌ ${name}: FAILED ${details}`);
  }
  backendResults[category].details.push({ name, passed, details });
}

// Get authentication token for protected endpoints
async function getAuthToken() {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

function analyzeBackendStructure() {
  console.log('\n📁 ANALYZING BACKEND STRUCTURE');
  console.log('===============================');
  
  const backendPath = './backend';
  
  // Check main backend files
  const mainFiles = [
    'package.json',
    'server.js',
    '.env'
  ];
  
  for (const file of mainFiles) {
    const filePath = path.join(backendPath, file);
    const exists = fs.existsSync(filePath);
    logBackendTest('structure', `Main File: ${file}`, exists, exists ? 'Found' : 'Missing');
  }
  
  // Check essential directories
  const essentialDirs = [
    'db',
    'middleware',
    'routes'
  ];
  
  for (const dir of essentialDirs) {
    const dirPath = path.join(backendPath, dir);
    const exists = fs.existsSync(dirPath);
    logBackendTest('structure', `Directory: ${dir}`, exists, exists ? 'Found' : 'Missing');
  }
  
  // Analyze server.js structure
  try {
    const serverPath = path.join(backendPath, 'server.js');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const hasExpress = serverContent.includes('express');
      logBackendTest('structure', 'Express Framework', hasExpress, 'Express setup detected');
      
      const hasDatabase = serverContent.includes('pool') || serverContent.includes('database');
      logBackendTest('structure', 'Database Connection', hasDatabase, 'Database setup detected');
      
      const hasAuth = serverContent.includes('jwt') || serverContent.includes('auth');
      logBackendTest('structure', 'Authentication Setup', hasAuth, 'JWT auth detected');
      
      const hasCORS = serverContent.includes('cors');
      logBackendTest('structure', 'CORS Configuration', hasCORS, 'CORS middleware detected');
      
      // Count endpoints
      const endpointMatches = serverContent.match(/app\.(get|post|put|delete|patch)/g);
      const endpointCount = endpointMatches ? endpointMatches.length : 0;
      logBackendTest('structure', 'API Endpoints', endpointCount > 0, `${endpointCount} endpoints defined`);
    }
  } catch (error) {
    logBackendTest('structure', 'Server Analysis', false, error.message);
  }
}

async function testHealthEndpoints() {
  console.log('\n🏥 TESTING HEALTH ENDPOINTS');
  console.log('============================');
  
  const healthEndpoints = [
    { name: 'Basic Health', url: '/health' },
    { name: 'Database Health', url: '/health/db' }
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`);
      const data = await response.json();
      
      const isHealthy = response.ok && data.status === 'ok';
      logBackendTest('endpoints', endpoint.name, isHealthy, 
                    `Status: ${response.status}, Health: ${data.status}`);
    } catch (error) {
      logBackendTest('endpoints', endpoint.name, false, error.message);
    }
  }
}

async function testAuthenticationEndpoints() {
  console.log('\n🔐 TESTING AUTHENTICATION ENDPOINTS');
  console.log('====================================');
  
  // Test login
  try {
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
    logBackendTest('authentication', 'User Login', loginWorking, 
                  `Status: ${loginResponse.status}, Token: ${!!loginData.token}`);
    
    if (loginWorking) {
      // Test token validation
      const profileResponse = await fetch(`${BACKEND_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const profileWorking = profileResponse.ok;
      logBackendTest('authentication', 'Token Validation', profileWorking, 
                    `Profile access: ${profileResponse.status}`);
      
      return loginData.token;
    }
  } catch (error) {
    logBackendTest('authentication', 'Authentication Flow', false, error.message);
  }
  
  // Test invalid login
  try {
    const invalidResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    logBackendTest('authentication', 'Invalid Login Rejection', invalidResponse.status === 401, 
                  `Status: ${invalidResponse.status}`);
  } catch (error) {
    logBackendTest('authentication', 'Invalid Login Rejection', false, error.message);
  }
  
  // Test unauthorized access
  try {
    const unauthorizedResponse = await fetch(`${BACKEND_URL}/users`);
    logBackendTest('authentication', 'Unauthorized Access Protection', 
                  unauthorizedResponse.status === 403, 
                  `Status: ${unauthorizedResponse.status}`);
  } catch (error) {
    logBackendTest('authentication', 'Unauthorized Access Protection', false, error.message);
  }
  
  return null;
}

async function testCRUDEndpoints(token) {
  console.log('\n📊 TESTING CRUD ENDPOINTS');
  console.log('==========================');
  
  if (!token) {
    logBackendTest('endpoints', 'CRUD Testing', false, 'No authentication token');
    return;
  }
  
  const crudEndpoints = [
    { name: 'Users List', method: 'GET', url: '/users' },
    { name: 'Projects List', method: 'GET', url: '/projects' },
    { name: 'Leads List', method: 'GET', url: '/leads' },
    { name: 'Materials List', method: 'GET', url: '/materials' },
    { name: 'Vendors List', method: 'GET', url: '/vendors' },
    { name: 'Analytics Dashboard', method: 'GET', url: '/analytics/dashboard' },
    { name: 'User Permissions', method: 'GET', url: '/rbac/user-permissions' },
    { name: 'User Menus', method: 'GET', url: '/menus/user' },
    { name: 'Notifications', method: 'GET', url: '/notifications' },
    { name: 'Search', method: 'GET', url: '/search?q=test' },
    { name: 'Wallet', method: 'GET', url: '/payments/wallet' },
    { name: 'Files', method: 'GET', url: '/files' }
  ];
  
  for (const endpoint of crudEndpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const isWorking = response.ok;
      logBackendTest('endpoints', endpoint.name, isWorking, 
                    `${endpoint.method} ${response.status}`);
    } catch (error) {
      logBackendTest('endpoints', endpoint.name, false, error.message);
    }
  }
}

async function testBusinessLogic(token) {
  console.log('\n💼 TESTING BUSINESS LOGIC');
  console.log('==========================');
  
  if (!token) {
    logBackendTest('business', 'Business Logic Testing', false, 'No authentication token');
    return;
  }
  
  // Test user creation
  try {
    const createUserResponse = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        city: 'Mumbai'
      })
    });
    
    const userCreated = createUserResponse.status === 201;
    logBackendTest('business', 'User Creation', userCreated, 
                  `Status: ${createUserResponse.status}`);
  } catch (error) {
    logBackendTest('business', 'User Creation', false, error.message);
  }
  
  // Test data validation
  try {
    const invalidUserResponse = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123'
      })
    });
    
    const validationWorking = invalidUserResponse.status === 400;
    logBackendTest('business', 'Data Validation', validationWorking, 
                  `Invalid data rejected: ${invalidUserResponse.status}`);
  } catch (error) {
    logBackendTest('business', 'Data Validation', false, error.message);
  }
  
  // Test analytics data aggregation
  try {
    const analyticsResponse = await fetch(`${BACKEND_URL}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      const hasAggregatedData = analyticsData.analytics && 
        (analyticsData.analytics.totalUsers !== undefined ||
         analyticsData.analytics.totalProjects !== undefined);
      
      logBackendTest('business', 'Analytics Aggregation', hasAggregatedData, 
                    'Data aggregation working');
    } else {
      logBackendTest('business', 'Analytics Aggregation', false, 
                    `Status: ${analyticsResponse.status}`);
    }
  } catch (error) {
    logBackendTest('business', 'Analytics Aggregation', false, error.message);
  }
}

async function testDatabaseOperations() {
  console.log('\n🗄️ TESTING DATABASE OPERATIONS');
  console.log('===============================');
  
  // Test database health
  try {
    const dbHealthResponse = await fetch(`${BACKEND_URL}/health/db`);
    const dbHealthData = await dbHealthResponse.json();
    
    const dbHealthy = dbHealthResponse.ok && dbHealthData.status === 'ok';
    logBackendTest('database', 'Database Connectivity', dbHealthy, 
                  `Status: ${dbHealthData.status}`);
  } catch (error) {
    logBackendTest('database', 'Database Connectivity', false, error.message);
  }
  
  // Test data consistency through API
  try {
    const token = await getAuthToken();
    if (token) {
      const usersResponse = await fetch(`${BACKEND_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const hasUsers = usersData.users && Array.isArray(usersData.users);
        logBackendTest('database', 'Data Consistency', hasUsers, 
                      `Users data: ${hasUsers ? 'valid' : 'invalid'}`);
      } else {
        logBackendTest('database', 'Data Consistency', false, 
                      `Status: ${usersResponse.status}`);
      }
    }
  } catch (error) {
    logBackendTest('database', 'Data Consistency', false, error.message);
  }
}

function generateBackendReport() {
  console.log('\n📊 COMPREHENSIVE BACKEND ANALYSIS REPORT');
  console.log('=========================================');
  
  const categories = Object.keys(backendResults);
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  categories.forEach(category => {
    const result = backendResults[category];
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
    
    const successRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
    console.log(`${category.toUpperCase().padEnd(15)} | ${result.passed}/${result.total} | ${successRate}%`);
  });
  
  const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
  
  console.log('\n🎯 OVERALL BACKEND RESULTS');
  console.log('===========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  
  console.log('\n🏆 BACKEND STATUS');
  console.log('=================');
  if (overallSuccessRate >= 95) {
    console.log('🎉 EXCELLENT - Backend is production ready!');
  } else if (overallSuccessRate >= 85) {
    console.log('🟢 GOOD - Backend is mostly ready');
  } else if (overallSuccessRate >= 75) {
    console.log('🟡 FAIR - Backend needs some attention');
  } else {
    console.log('🔴 POOR - Backend has significant issues');
  }
  
  // List failed tests
  if (totalFailed > 0) {
    console.log('\n❌ FAILED TESTS:');
    categories.forEach(category => {
      const failedTests = backendResults[category].details.filter(t => !t.passed);
      if (failedTests.length > 0) {
        console.log(`\n${category.toUpperCase()}:`);
        failedTests.forEach(test => {
          console.log(`   - ${test.name}: ${test.details}`);
        });
      }
    });
  }
  
  return { overallSuccessRate, totalTests, totalPassed, totalFailed };
}

async function runComprehensiveBackendAnalysis() {
  console.log('🚀 Starting Comprehensive Backend Analysis...\n');
  
  // Analyze structure
  analyzeBackendStructure();
  
  // Test health endpoints
  await testHealthEndpoints();
  
  // Test authentication
  const token = await testAuthenticationEndpoints();
  
  // Test CRUD endpoints
  await testCRUDEndpoints(token);
  
  // Test business logic
  await testBusinessLogic(token);
  
  // Test database operations
  await testDatabaseOperations();
  
  return generateBackendReport();
}

// Run the analysis
runComprehensiveBackendAnalysis().catch(console.error);
