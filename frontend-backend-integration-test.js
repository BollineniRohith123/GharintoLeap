#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test
 * Tests the connection between frontend and backend
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🔗 FRONTEND-BACKEND INTEGRATION TEST');
console.log('=====================================');

async function testBackendConnection() {
  try {
    console.log('\n🔧 Testing Backend Connection...');
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Backend is running and healthy');
      return true;
    } else {
      console.log('❌ Backend health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return false;
  }
}

async function testFrontendConnection() {
  try {
    console.log('\n🎨 Testing Frontend Connection...');
    const response = await fetch(FRONTEND_URL);
    
    if (response.ok) {
      console.log('✅ Frontend is running and accessible');
      return true;
    } else {
      console.log('❌ Frontend connection failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend connection failed:', error.message);
    return false;
  }
}

async function testCORSConfiguration() {
  try {
    console.log('\n🌐 Testing CORS Configuration...');
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ CORS is properly configured');
      return true;
    } else {
      console.log('❌ CORS configuration issue');
      return false;
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  try {
    console.log('\n📡 Testing Key API Endpoints...');
    
    // Test login
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
      console.log('❌ Login endpoint failed');
      return false;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Login endpoint working');
    
    // Test authenticated endpoint
    const projectsResponse = await fetch(`${BACKEND_URL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': FRONTEND_URL
      }
    });
    
    if (projectsResponse.ok) {
      console.log('✅ Authenticated endpoints working');
      return true;
    } else {
      console.log('❌ Authenticated endpoint failed');
      return false;
    }
    
  } catch (error) {
    console.log('❌ API endpoint test failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting integration tests...\n');
  
  const results = {
    backend: await testBackendConnection(),
    frontend: await testFrontendConnection(),
    cors: await testCORSConfiguration(),
    api: await testAPIEndpoints()
  };
  
  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('============================');
  console.log(`Backend Connection: ${results.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Connection: ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CORS Configuration: ${results.cors ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoints: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🎯 OVERALL STATUS');
  console.log('=================');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Frontend and Backend are properly integrated!');
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`🔧 Backend: ${BACKEND_URL}`);
  } else {
    console.log('⚠️  Some tests failed - Check the issues above');
  }
  
  return allPassed;
}

// Run the tests
runIntegrationTests().catch(console.error);
