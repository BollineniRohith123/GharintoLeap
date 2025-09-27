#!/usr/bin/env node

/**
 * Comprehensive Authentication & Authorization Test Suite
 * Tests all authentication flows and RBAC functionality
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';

console.log('🔐 COMPREHENSIVE AUTHENTICATION & AUTHORIZATION TESTING');
console.log('======================================================');

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

async function testUserRegistration() {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        city: 'Mumbai'
      })
    });
    
    const data = await response.json();
    logTest('User Registration', response.status === 201 && data.token, `Status: ${response.status}`);
    return data.token;
  } catch (error) {
    logTest('User Registration', false, `Error: ${error.message}`);
    return null;
  }
}

async function testUserLogin() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    logTest('User Login', response.status === 200 && data.token, `Status: ${response.status}`);
    return data.token;
  } catch (error) {
    logTest('User Login', false, `Error: ${error.message}`);
    return null;
  }
}

async function testInvalidLogin() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    logTest('Invalid Login Rejection', response.status === 401, `Status: ${response.status}`);
  } catch (error) {
    logTest('Invalid Login Rejection', false, `Error: ${error.message}`);
  }
}

async function testJWTTokenValidation(token) {
  try {
    const response = await fetch(`${API_BASE}/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    logTest('JWT Token Validation', response.status === 200 && data.user, `Status: ${response.status}`);
    return data.user;
  } catch (error) {
    logTest('JWT Token Validation', false, `Error: ${error.message}`);
    return null;
  }
}

async function testInvalidTokenRejection() {
  try {
    const response = await fetch(`${API_BASE}/users/profile`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    
    logTest('Invalid Token Rejection', response.status === 403, `Status: ${response.status}`);
  } catch (error) {
    logTest('Invalid Token Rejection', false, `Error: ${error.message}`);
  }
}

async function testRoleBasedAccess(token) {
  try {
    const response = await fetch(`${API_BASE}/rbac/user-permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    logTest('RBAC Permissions Check', response.status === 200 && data.permissions, `Status: ${response.status}, Permissions: ${data.permissions?.length || 0}`);
    return data.permissions;
  } catch (error) {
    logTest('RBAC Permissions Check', false, `Error: ${error.message}`);
    return null;
  }
}

async function testPasswordSecurity() {
  try {
    // Test weak password rejection
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `weak${Date.now()}@example.com`,
        password: '123',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        city: 'Mumbai'
      })
    });
    
    // Should fail with weak password (though this depends on validation implementation)
    logTest('Password Security Check', response.status !== 201, `Status: ${response.status}`);
  } catch (error) {
    logTest('Password Security Check', false, `Error: ${error.message}`);
  }
}

async function testSQLInjectionProtection() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin'; DROP TABLE users; --",
        password: 'anything'
      })
    });
    
    logTest('SQL Injection Protection', response.status === 401, `Status: ${response.status}`);
  } catch (error) {
    logTest('SQL Injection Protection', false, `Error: ${error.message}`);
  }
}

async function testForgotPassword() {
  try {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com'
      })
    });
    
    logTest('Forgot Password', response.status === 200, `Status: ${response.status}`);
  } catch (error) {
    logTest('Forgot Password', false, `Error: ${error.message}`);
  }
}

async function runAuthenticationTests() {
  console.log('\n🔐 Starting Authentication Tests...\n');
  
  // Test user registration
  const registrationToken = await testUserRegistration();
  
  // Test user login
  const loginToken = await testUserLogin();
  
  // Test invalid login
  await testInvalidLogin();
  
  // Test JWT token validation
  if (loginToken) {
    const user = await testJWTTokenValidation(loginToken);
    
    // Test RBAC
    if (user) {
      await testRoleBasedAccess(loginToken);
    }
  }
  
  // Test invalid token rejection
  await testInvalidTokenRejection();
  
  // Test password security
  await testPasswordSecurity();
  
  // Test SQL injection protection
  await testSQLInjectionProtection();
  
  // Test forgot password
  await testForgotPassword();
  
  console.log('\n📊 AUTHENTICATION TEST RESULTS');
  console.log('===============================');
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
  
  return testResults;
}

// Run the tests
runAuthenticationTests().catch(console.error);
