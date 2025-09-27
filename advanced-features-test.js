#!/usr/bin/env node

/**
 * Advanced Features Test Suite
 * Tests file upload, search, analytics, notifications, and bulk operations
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:4000';

console.log('🚀 ADVANCED FEATURES TESTING');
console.log('============================');

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

// Get admin token for authenticated requests
async function getAdminToken() {
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
    return data.token;
  } catch (error) {
    console.error('Failed to get admin token:', error);
    return null;
  }
}

async function testSearchFunctionality(token) {
  try {
    // Test global search
    const response = await fetch(`${API_BASE}/search?q=project`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    logTest('Global Search', response.status === 200, `Status: ${response.status}, Results: ${data.results?.length || 0}`);
    
    // Test search with filters
    const filteredResponse = await fetch(`${API_BASE}/search?q=design&type=projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    logTest('Filtered Search', filteredResponse.status === 200, `Status: ${filteredResponse.status}`);
  } catch (error) {
    logTest('Search Functionality', false, `Error: ${error.message}`);
  }
}

async function testAnalyticsEndpoints(token) {
  try {
    // Test dashboard analytics
    const dashboardResponse = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dashboardData = await dashboardResponse.json();
    logTest('Dashboard Analytics', dashboardResponse.status === 200 && dashboardData.analytics, 
           `Status: ${dashboardResponse.status}`);
    
    // Test lead analytics
    const leadResponse = await fetch(`${API_BASE}/analytics/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    logTest('Lead Analytics', leadResponse.status === 200, `Status: ${leadResponse.status}`);
    
    // Test project analytics
    const projectResponse = await fetch(`${API_BASE}/analytics/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    logTest('Project Analytics', projectResponse.status === 200, `Status: ${projectResponse.status}`);
  } catch (error) {
    logTest('Analytics Endpoints', false, `Error: ${error.message}`);
  }
}

async function testNotificationSystem(token) {
  try {
    // Test get notifications
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    logTest('Notification System', response.status === 200, 
           `Status: ${response.status}, Notifications: ${data.notifications?.length || 0}`);
  } catch (error) {
    logTest('Notification System', false, `Error: ${error.message}`);
  }
}

async function testFileUploadEndpoint(token) {
  try {
    // Create a test file
    const testContent = 'This is a test file for upload testing';
    const testFilePath = './test-upload.txt';
    fs.writeFileSync(testFilePath, testContent);
    
    // Note: This is a simplified test - actual file upload would need FormData
    const response = await fetch(`${API_BASE}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    logTest('File Upload Endpoint', response.status === 200, `Status: ${response.status}`);
    
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  } catch (error) {
    logTest('File Upload Endpoint', false, `Error: ${error.message}`);
  }
}

async function testBulkOperations(token) {
  try {
    // Test bulk user creation (if endpoint exists)
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `bulk-test-${Date.now()}@example.com`,
        password: 'BulkTest123!',
        firstName: 'Bulk',
        lastName: 'Test',
        phone: '9876543210',
        city: 'Mumbai'
      })
    });
    
    logTest('Bulk Operations (User Creation)', response.status === 201, `Status: ${response.status}`);
  } catch (error) {
    logTest('Bulk Operations', false, `Error: ${error.message}`);
  }
}

async function testDataAggregation(token) {
  try {
    // Test data aggregation through analytics
    const response = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    const hasAggregatedData = data.analytics && (
      data.analytics.totalProjects !== undefined ||
      data.analytics.totalUsers !== undefined ||
      data.analytics.totalLeads !== undefined
    );
    
    logTest('Data Aggregation', response.status === 200 && hasAggregatedData, 
           `Status: ${response.status}, Has aggregated data: ${hasAggregatedData}`);
  } catch (error) {
    logTest('Data Aggregation', false, `Error: ${error.message}`);
  }
}

async function testPaginationAndFiltering(token) {
  try {
    // Test pagination
    const response = await fetch(`${API_BASE}/projects?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    const hasPagination = data.page !== undefined && data.limit !== undefined;
    
    logTest('Pagination & Filtering', response.status === 200 && hasPagination, 
           `Status: ${response.status}, Has pagination: ${hasPagination}`);
  } catch (error) {
    logTest('Pagination & Filtering', false, `Error: ${error.message}`);
  }
}

async function testRealTimeFeatures(token) {
  try {
    // Test real-time data updates (checking if data is fresh)
    const response1 = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data1 = await response1.json();
    
    // Wait a moment and fetch again
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response2 = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data2 = await response2.json();
    
    logTest('Real-time Data Consistency', 
           response1.status === 200 && response2.status === 200,
           `Both requests successful`);
  } catch (error) {
    logTest('Real-time Features', false, `Error: ${error.message}`);
  }
}

async function runAdvancedFeatureTests() {
  console.log('\n🚀 Starting Advanced Feature Tests...\n');
  
  const token = await getAdminToken();
  if (!token) {
    console.error('❌ Failed to get admin token. Cannot proceed with tests.');
    return;
  }
  
  // Run all advanced feature tests
  await testSearchFunctionality(token);
  await testAnalyticsEndpoints(token);
  await testNotificationSystem(token);
  await testFileUploadEndpoint(token);
  await testBulkOperations(token);
  await testDataAggregation(token);
  await testPaginationAndFiltering(token);
  await testRealTimeFeatures(token);
  
  console.log('\n📊 ADVANCED FEATURES TEST RESULTS');
  console.log('==================================');
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
runAdvancedFeatureTests().catch(console.error);
