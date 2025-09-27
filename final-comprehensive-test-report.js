#!/usr/bin/env node

/**
 * Final Comprehensive Test Report
 * Complete system validation with detailed reporting
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BACKEND_URL = 'http://localhost:4000';

console.log('📊 FINAL COMPREHENSIVE TEST REPORT');
console.log('===================================');
console.log('🏢 Gharinto Leap Interior Design Marketplace');
console.log('===================================\n');

let testResults = {
  infrastructure: { passed: 0, failed: 0, total: 0, details: [] },
  authentication: { passed: 0, failed: 0, total: 0, details: [] },
  api: { passed: 0, failed: 0, total: 0, details: [] },
  performance: { passed: 0, failed: 0, total: 0, details: [] },
  security: { passed: 0, failed: 0, total: 0, details: [] },
  integration: { passed: 0, failed: 0, total: 0, details: [] }
};

function logTest(category, name, passed, details = '') {
  testResults[category].total++;
  if (passed) {
    testResults[category].passed++;
    console.log(`✅ ${name}: PASSED ${details}`);
  } else {
    testResults[category].failed++;
    console.log(`❌ ${name}: FAILED ${details}`);
  }
  testResults[category].details.push({ name, passed, details });
}

async function testInfrastructure() {
  console.log('\n🏗️ INFRASTRUCTURE TESTING');
  console.log('==========================');
  
  // Test frontend serving
  try {
    const { stdout } = await execAsync('curl -s http://localhost:5173 | head -1');
    const frontendOk = stdout.includes('<!DOCTYPE html>');
    logTest('infrastructure', 'Frontend Server', frontendOk, 'Port 5173');
  } catch (error) {
    logTest('infrastructure', 'Frontend Server', false, error.message);
  }
  
  // Test backend health
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    logTest('infrastructure', 'Backend Server', response.ok && data.status === 'ok', 'Port 4000');
  } catch (error) {
    logTest('infrastructure', 'Backend Server', false, error.message);
  }
  
  // Test database connectivity
  try {
    const response = await fetch(`${BACKEND_URL}/health/db`);
    const data = await response.json();
    logTest('infrastructure', 'Database Connection', response.ok && data.status === 'ok', 'PostgreSQL');
  } catch (error) {
    logTest('infrastructure', 'Database Connection', false, error.message);
  }
}

async function testAuthentication() {
  console.log('\n🔐 AUTHENTICATION TESTING');
  console.log('==========================');
  
  // Test valid login
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gharinto.com', password: 'admin123' })
    });
    const data = await response.json();
    logTest('authentication', 'Valid Login', response.ok && data.token, 'Admin account');
    return data.token;
  } catch (error) {
    logTest('authentication', 'Valid Login', false, error.message);
    return null;
  }
}

async function testAPIEndpoints(token) {
  console.log('\n📡 API ENDPOINTS TESTING');
  console.log('=========================');
  
  if (!token) {
    logTest('api', 'API Testing', false, 'No authentication token');
    return;
  }
  
  const endpoints = [
    { name: 'User Profile', url: '/users/profile' },
    { name: 'Users List', url: '/users' },
    { name: 'Projects List', url: '/projects' },
    { name: 'Leads List', url: '/leads' },
    { name: 'Materials List', url: '/materials' },
    { name: 'Vendors List', url: '/vendors' },
    { name: 'Analytics Dashboard', url: '/analytics/dashboard' },
    { name: 'Search', url: '/search?q=test' },
    { name: 'RBAC Permissions', url: '/rbac/user-permissions' },
    { name: 'User Menus', url: '/menus/user' },
    { name: 'Wallet', url: '/payments/wallet' },
    { name: 'Files', url: '/files' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      logTest('api', endpoint.name, response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest('api', endpoint.name, false, error.message);
    }
  }
}

async function testPerformance() {
  console.log('\n⚡ PERFORMANCE TESTING');
  console.log('======================');
  
  // Test response times
  const tests = [
    { name: 'Health Check', url: '/health' },
    { name: 'Database Health', url: '/health/db' }
  ];
  
  for (const test of tests) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${BACKEND_URL}${test.url}`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const performanceGood = response.ok && responseTime < 1000;
      logTest('performance', test.name, performanceGood, `${responseTime}ms`);
    } catch (error) {
      logTest('performance', test.name, false, error.message);
    }
  }
}

async function testSecurity() {
  console.log('\n🛡️ SECURITY TESTING');
  console.log('====================');
  
  // Test SQL injection protection
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin'; DROP TABLE users; --",
        password: 'anything'
      })
    });
    logTest('security', 'SQL Injection Protection', response.status === 401, 'Malicious query rejected');
  } catch (error) {
    logTest('security', 'SQL Injection Protection', false, error.message);
  }
  
  // Test unauthorized access
  try {
    const response = await fetch(`${BACKEND_URL}/users`);
    logTest('security', 'Unauthorized Access Protection', response.status === 403, 'Access denied without token');
  } catch (error) {
    logTest('security', 'Unauthorized Access Protection', false, error.message);
  }
}

async function testIntegration() {
  console.log('\n🔗 INTEGRATION TESTING');
  console.log('=======================');
  
  // Test CORS
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'Origin': 'http://localhost:5173' }
    });
    logTest('integration', 'CORS Configuration', response.ok, 'Cross-origin requests allowed');
  } catch (error) {
    logTest('integration', 'CORS Configuration', false, error.message);
  }
  
  // Test data consistency
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gharinto.com', password: 'admin123' })
    });
    const data = await response.json();
    
    if (data.token) {
      const projectsResponse = await fetch(`${BACKEND_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const projectsData = await projectsResponse.json();
      
      logTest('integration', 'Data Consistency', 
             projectsResponse.ok && projectsData.projects,
             `${projectsData.projects?.length || 0} projects found`);
    } else {
      logTest('integration', 'Data Consistency', false, 'No authentication token');
    }
  } catch (error) {
    logTest('integration', 'Data Consistency', false, error.message);
  }
}

function generateReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=============================');
  
  const categories = Object.keys(testResults);
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  categories.forEach(category => {
    const result = testResults[category];
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
    
    const successRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
    console.log(`${category.toUpperCase().padEnd(15)} | ${result.passed}/${result.total} | ${successRate}%`);
  });
  
  const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
  
  console.log('\n🎯 OVERALL RESULTS');
  console.log('==================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  
  console.log('\n🏆 SYSTEM STATUS');
  console.log('================');
  if (overallSuccessRate >= 95) {
    console.log('🎉 EXCELLENT - Production Ready!');
  } else if (overallSuccessRate >= 85) {
    console.log('🟢 GOOD - Ready for deployment');
  } else if (overallSuccessRate >= 75) {
    console.log('🟡 FAIR - Minor issues need attention');
  } else {
    console.log('🔴 POOR - Significant issues detected');
  }
  
  console.log('\n🌐 ACCESS INFORMATION');
  console.log('=====================');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend:  http://localhost:4000');
  console.log('Database: PostgreSQL (gharinto_dev)');
  
  console.log('\n👥 TEST ACCOUNTS');
  console.log('================');
  console.log('Admin:     admin@gharinto.com / admin123');
  console.log('Customer:  customer@gharinto.com / customer123');
  console.log('Designer:  designer@gharinto.com / designer123');
  console.log('Vendor:    vendor@gharinto.com / vendor123');
  
  return { overallSuccessRate, totalTests, totalPassed, totalFailed };
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive System Testing...\n');
  
  await testInfrastructure();
  const token = await testAuthentication();
  await testAPIEndpoints(token);
  await testPerformance();
  await testSecurity();
  await testIntegration();
  
  return generateReport();
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);
