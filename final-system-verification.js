#!/usr/bin/env node

/**
 * Final System Verification
 * Comprehensive test to verify the entire Gharinto Leap system
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🎯 GHARINTO LEAP SYSTEM VERIFICATION');
console.log('=====================================');
console.log('🏢 Comprehensive Production Readiness Check');
console.log('=====================================\n');

async function testDatabaseConnection() {
  try {
    console.log('🗄️  Testing Database Connection...');
    const response = await fetch(`${BACKEND_URL}/health/db`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Database: Connected and healthy');
      return true;
    } else {
      console.log('❌ Database: Connection failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Database: Error -', error.message);
    return false;
  }
}

async function testBackendAPIs() {
  try {
    console.log('\n🔧 Testing Backend APIs...');
    
    // Test authentication
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Authentication: Failed');
      return false;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Authentication: Working');
    
    // Test key endpoints
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
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          console.log(`✅ ${endpoint.name}: Working`);
          passedEndpoints++;
        } else {
          console.log(`❌ ${endpoint.name}: Failed (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Error`);
      }
    }
    
    return passedEndpoints === endpoints.length;
    
  } catch (error) {
    console.log('❌ Backend APIs: Error -', error.message);
    return false;
  }
}

async function testFrontendServing() {
  try {
    console.log('\n🎨 Testing Frontend Serving...');
    const response = await fetch(FRONTEND_URL);
    const html = await response.text();
    
    if (response.ok && html.includes('Gharinto')) {
      console.log('✅ Frontend: Serving correctly');
      return true;
    } else {
      console.log('❌ Frontend: Not serving properly');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend: Error -', error.message);
    return false;
  }
}

async function testSystemPerformance() {
  try {
    console.log('\n⚡ Testing System Performance...');
    
    const startTime = Date.now();
    const response = await fetch(`${BACKEND_URL}/health`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    if (response.ok && responseTime < 1000) {
      console.log(`✅ Performance: Response time ${responseTime}ms (Good)`);
      return true;
    } else if (response.ok && responseTime < 3000) {
      console.log(`⚠️  Performance: Response time ${responseTime}ms (Acceptable)`);
      return true;
    } else {
      console.log(`❌ Performance: Response time ${responseTime}ms (Poor)`);
      return false;
    }
  } catch (error) {
    console.log('❌ Performance: Error -', error.message);
    return false;
  }
}

async function testDataIntegrity() {
  try {
    console.log('\n📊 Testing Data Integrity...');
    
    // Login and get token
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gharinto.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Check if we have test data
    const projectsResponse = await fetch(`${BACKEND_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projectsData = await projectsResponse.json();
    
    if (projectsData.projects && projectsData.projects.length > 0) {
      console.log(`✅ Data Integrity: ${projectsData.projects.length} projects found`);
      return true;
    } else {
      console.log('❌ Data Integrity: No test data found');
      return false;
    }
  } catch (error) {
    console.log('❌ Data Integrity: Error -', error.message);
    return false;
  }
}

async function runSystemVerification() {
  console.log('🚀 Starting comprehensive system verification...\n');
  
  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Backend APIs', test: testBackendAPIs },
    { name: 'Frontend Serving', test: testFrontendServing },
    { name: 'System Performance', test: testSystemPerformance },
    { name: 'Data Integrity', test: testDataIntegrity }
  ];
  
  const results = {};
  
  for (const { name, test } of tests) {
    results[name] = await test();
  }
  
  console.log('\n📋 SYSTEM VERIFICATION RESULTS');
  console.log('===============================');
  
  let passedTests = 0;
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${testName}: ${passed ? 'PASS' : 'FAIL'}`);
    if (passed) passedTests++;
  }
  
  const successRate = (passedTests / tests.length) * 100;
  
  console.log('\n🎯 OVERALL SYSTEM STATUS');
  console.log('========================');
  console.log(`📊 Tests Passed: ${passedTests}/${tests.length}`);
  console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 100) {
    console.log('🎉 SYSTEM STATUS: EXCELLENT - Production Ready!');
  } else if (successRate >= 80) {
    console.log('🟢 SYSTEM STATUS: GOOD - Ready for use');
  } else if (successRate >= 60) {
    console.log('🟡 SYSTEM STATUS: FAIR - Some issues need attention');
  } else {
    console.log('🔴 SYSTEM STATUS: POOR - Significant issues detected');
  }
  
  console.log('\n🌐 ACCESS INFORMATION');
  console.log('=====================');
  console.log(`🎨 Frontend: ${FRONTEND_URL}`);
  console.log(`🔧 Backend API: ${BACKEND_URL}`);
  console.log(`📚 API Documentation: ${BACKEND_URL}/health`);
  
  console.log('\n👥 TEST ACCOUNTS');
  console.log('================');
  console.log('👑 Super Admin: superadmin@gharinto.com / superadmin123');
  console.log('🔧 Admin: admin@gharinto.com / admin123');
  console.log('📊 Project Manager: pm@gharinto.com / pm123');
  console.log('🎨 Designer: designer@gharinto.com / designer123');
  console.log('👤 Customer: customer@gharinto.com / customer123');
  console.log('🏪 Vendor: vendor@gharinto.com / vendor123');
  console.log('💰 Finance: finance@gharinto.com / finance123');
  
  return successRate >= 80;
}

// Run the verification
runSystemVerification().catch(console.error);
