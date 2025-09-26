#!/usr/bin/env node

/**
 * Performance and Load Testing Suite for Gharinto Leap Backend
 * Tests API performance, concurrent users, and system limits
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 10;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 60; // seconds

// Performance metrics tracking
let performanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  responseTimes: [],
  errorRates: {},
  throughput: 0
};

// Test scenarios
const testScenarios = [
  {
    name: 'Authentication Load Test',
    endpoint: '/auth/login',
    method: 'POST',
    data: { email: 'admin@gharinto.com', password: 'admin123' },
    weight: 0.1 // 10% of requests
  },
  {
    name: 'User Profile Access',
    endpoint: '/users/profile',
    method: 'GET',
    requiresAuth: true,
    weight: 0.2 // 20% of requests
  },
  {
    name: 'Leads Listing',
    endpoint: '/leads',
    method: 'GET',
    requiresAuth: true,
    weight: 0.15 // 15% of requests
  },
  {
    name: 'Projects Listing',
    endpoint: '/projects',
    method: 'GET',
    requiresAuth: true,
    weight: 0.15 // 15% of requests
  },
  {
    name: 'Materials Catalog',
    endpoint: '/materials',
    method: 'GET',
    requiresAuth: true,
    weight: 0.1 // 10% of requests
  },
  {
    name: 'Analytics Dashboard',
    endpoint: '/analytics/dashboard',
    method: 'GET',
    requiresAuth: true,
    weight: 0.1 // 10% of requests
  },
  {
    name: 'Wallet Information',
    endpoint: '/payments/wallet',
    method: 'GET',
    requiresAuth: true,
    weight: 0.1 // 10% of requests
  },
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    weight: 0.1 // 10% of requests
  }
];

// Utility functions
async function makeRequest(scenario, token = null) {
  const startTime = performance.now();
  
  const options = {
    method: scenario.method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(scenario.data && { body: JSON.stringify(scenario.data) })
  };

  try {
    const response = await fetch(`${API_BASE}${scenario.endpoint}`, options);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Update metrics
    performanceMetrics.totalRequests++;
    performanceMetrics.responseTimes.push(responseTime);
    
    if (responseTime < performanceMetrics.minResponseTime) {
      performanceMetrics.minResponseTime = responseTime;
    }
    if (responseTime > performanceMetrics.maxResponseTime) {
      performanceMetrics.maxResponseTime = responseTime;
    }
    
    if (response.ok) {
      performanceMetrics.successfulRequests++;
    } else {
      performanceMetrics.failedRequests++;
      const errorKey = `${response.status}`;
      performanceMetrics.errorRates[errorKey] = (performanceMetrics.errorRates[errorKey] || 0) + 1;
    }
    
    return {
      success: response.ok,
      status: response.status,
      responseTime,
      scenario: scenario.name
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    performanceMetrics.totalRequests++;
    performanceMetrics.failedRequests++;
    performanceMetrics.responseTimes.push(responseTime);
    
    const errorKey = 'network_error';
    performanceMetrics.errorRates[errorKey] = (performanceMetrics.errorRates[errorKey] || 0) + 1;
    
    return {
      success: false,
      error: error.message,
      responseTime,
      scenario: scenario.name
    };
  }
}

async function authenticateUser() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gharinto.com', password: 'admin123' })
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.token;
  }
  return null;
}

function selectRandomScenario() {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const scenario of testScenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      return scenario;
    }
  }
  
  return testScenarios[testScenarios.length - 1];
}

async function runUserSession(userId, duration) {
  console.log(`🚀 Starting user session ${userId}`);
  
  // Authenticate user
  const token = await authenticateUser();
  if (!token) {
    console.log(`❌ User ${userId} failed to authenticate`);
    return;
  }
  
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  let requestCount = 0;
  
  while (Date.now() < endTime) {
    const scenario = selectRandomScenario();
    const authToken = scenario.requiresAuth ? token : null;
    
    const result = await makeRequest(scenario, authToken);
    requestCount++;
    
    // Log slow requests
    if (result.responseTime > 2000) {
      console.log(`⚠️ Slow request: ${scenario.name} took ${result.responseTime.toFixed(2)}ms`);
    }
    
    // Small delay between requests to simulate real user behavior
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  }
  
  console.log(`✅ User ${userId} completed ${requestCount} requests`);
}

async function runConcurrentLoadTest() {
  console.log('\n🔥 CONCURRENT LOAD TEST');
  console.log(`👥 Simulating ${CONCURRENT_USERS} concurrent users`);
  console.log(`⏱️ Test duration: ${TEST_DURATION} seconds`);
  console.log('================================================\n');
  
  const startTime = Date.now();
  
  // Start concurrent user sessions
  const userPromises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(runUserSession(i, TEST_DURATION));
  }
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  const endTime = Date.now();
  const actualDuration = (endTime - startTime) / 1000;
  
  // Calculate final metrics
  performanceMetrics.averageResponseTime = 
    performanceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
    performanceMetrics.responseTimes.length;
  
  performanceMetrics.throughput = performanceMetrics.totalRequests / actualDuration;
  
  return actualDuration;
}

async function runStressTest() {
  console.log('\n💥 STRESS TEST');
  console.log('Testing system limits with rapid requests');
  console.log('================================================\n');
  
  const token = await authenticateUser();
  if (!token) {
    console.log('❌ Failed to authenticate for stress test');
    return;
  }
  
  const stressScenarios = [
    { endpoint: '/health', method: 'GET' },
    { endpoint: '/users/profile', method: 'GET', requiresAuth: true },
    { endpoint: '/leads', method: 'GET', requiresAuth: true }
  ];
  
  const rapidRequests = 100;
  const promises = [];
  
  console.log(`🚀 Sending ${rapidRequests} rapid requests...`);
  
  for (let i = 0; i < rapidRequests; i++) {
    const scenario = stressScenarios[i % stressScenarios.length];
    promises.push(makeRequest(scenario, scenario.requiresAuth ? token : null));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  console.log(`✅ Successful requests: ${successCount}/${rapidRequests}`);
  console.log(`❌ Failed requests: ${failureCount}/${rapidRequests}`);
  console.log(`📊 Success rate: ${((successCount / rapidRequests) * 100).toFixed(1)}%`);
}

async function runEndpointPerformanceTest() {
  console.log('\n⚡ ENDPOINT PERFORMANCE TEST');
  console.log('Testing individual endpoint performance');
  console.log('================================================\n');
  
  const token = await authenticateUser();
  if (!token) {
    console.log('❌ Failed to authenticate for performance test');
    return;
  }
  
  const endpointTests = [
    { name: 'Health Check', endpoint: '/health', method: 'GET' },
    { name: 'User Profile', endpoint: '/users/profile', method: 'GET', requiresAuth: true },
    { name: 'Leads List', endpoint: '/leads', method: 'GET', requiresAuth: true },
    { name: 'Projects List', endpoint: '/projects', method: 'GET', requiresAuth: true },
    { name: 'Materials Catalog', endpoint: '/materials', method: 'GET', requiresAuth: true },
    { name: 'Analytics Dashboard', endpoint: '/analytics/dashboard', method: 'GET', requiresAuth: true },
    { name: 'User Permissions', endpoint: '/rbac/user-permissions', method: 'GET', requiresAuth: true }
  ];
  
  for (const test of endpointTests) {
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await makeRequest(test, test.requiresAuth ? token : null);
      if (result.success) {
        times.push(result.responseTime);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`📊 ${test.name}:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   Success rate: ${((times.length / iterations) * 100).toFixed(1)}%\n`);
    } else {
      console.log(`❌ ${test.name}: All requests failed\n`);
    }
  }
}

function generatePerformanceReport(duration) {
  console.log('\n📊 PERFORMANCE REPORT');
  console.log('================================================');
  console.log(`⏱️ Test Duration: ${duration.toFixed(2)}s`);
  console.log(`📈 Total Requests: ${performanceMetrics.totalRequests}`);
  console.log(`✅ Successful Requests: ${performanceMetrics.successfulRequests}`);
  console.log(`❌ Failed Requests: ${performanceMetrics.failedRequests}`);
  console.log(`📊 Success Rate: ${((performanceMetrics.successfulRequests / performanceMetrics.totalRequests) * 100).toFixed(1)}%`);
  console.log(`🚀 Throughput: ${performanceMetrics.throughput.toFixed(2)} requests/second`);
  console.log(`⚡ Average Response Time: ${performanceMetrics.averageResponseTime.toFixed(2)}ms`);
  console.log(`🏃 Min Response Time: ${performanceMetrics.minResponseTime.toFixed(2)}ms`);
  console.log(`🐌 Max Response Time: ${performanceMetrics.maxResponseTime.toFixed(2)}ms`);
  
  // Calculate percentiles
  const sortedTimes = performanceMetrics.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  console.log(`📊 Response Time Percentiles:`);
  console.log(`   50th percentile: ${p50?.toFixed(2) || 'N/A'}ms`);
  console.log(`   95th percentile: ${p95?.toFixed(2) || 'N/A'}ms`);
  console.log(`   99th percentile: ${p99?.toFixed(2) || 'N/A'}ms`);
  
  if (Object.keys(performanceMetrics.errorRates).length > 0) {
    console.log(`\n❌ Error Breakdown:`);
    for (const [errorType, count] of Object.entries(performanceMetrics.errorRates)) {
      console.log(`   ${errorType}: ${count} (${((count / performanceMetrics.totalRequests) * 100).toFixed(1)}%)`);
    }
  }
  
  // Performance assessment
  console.log('\n🎯 PERFORMANCE ASSESSMENT:');
  const avgResponseTime = performanceMetrics.averageResponseTime;
  const successRate = (performanceMetrics.successfulRequests / performanceMetrics.totalRequests) * 100;
  
  if (avgResponseTime < 200 && successRate > 99) {
    console.log('   🟢 EXCELLENT - Production ready with excellent performance');
  } else if (avgResponseTime < 500 && successRate > 95) {
    console.log('   🟡 GOOD - Production ready with acceptable performance');
  } else if (avgResponseTime < 1000 && successRate > 90) {
    console.log('   🟠 FAIR - May need optimization for production');
  } else {
    console.log('   🔴 POOR - Requires performance optimization before production');
  }
  
  console.log('================================================\n');
}

// Main execution
async function runPerformanceTests() {
  console.log('🚀 STARTING PERFORMANCE TEST SUITE');
  console.log('🏢 Gharinto Leap Backend - Performance & Load Testing');
  console.log('📊 Testing system performance under various load conditions');
  console.log('================================================\n');
  
  try {
    // Reset metrics
    performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errorRates: {},
      throughput: 0
    };
    
    // Run individual endpoint performance tests
    await runEndpointPerformanceTest();
    
    // Reset metrics for load test
    performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errorRates: {},
      throughput: 0
    };
    
    // Run concurrent load test
    const duration = await runConcurrentLoadTest();
    
    // Run stress test
    await runStressTest();
    
    // Generate final report
    generatePerformanceReport(duration);
    
    console.log('✅ Performance testing completed successfully');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = {
  runPerformanceTests,
  runConcurrentLoadTest,
  runStressTest,
  generatePerformanceReport
};
