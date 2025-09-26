#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Verifies all implemented components are working correctly
 */

const fetch = require('node-fetch');
const fs = require('fs');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// Verification results
let verificationResults = {
  employeeManagement: { passed: 0, failed: 0, tests: [] },
  complaintManagement: { passed: 0, failed: 0, tests: [] },
  monitoring: { passed: 0, failed: 0, tests: [] },
  testing: { passed: 0, failed: 0, tests: [] },
  overall: { score: 0, status: 'UNKNOWN' }
};

// Utility functions
async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData ? JSON.parse(responseData) : null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

function logTest(category, testName, passed, details = '') {
  const result = { testName, passed, details };
  verificationResults[category].tests.push(result);
  
  if (passed) {
    verificationResults[category].passed++;
    console.log(`✅ ${testName}: PASSED ${details}`);
  } else {
    verificationResults[category].failed++;
    console.log(`❌ ${testName}: FAILED ${details}`);
  }
}

async function authenticateAdmin() {
  const response = await makeRequest('POST', '/auth/login', {
    email: 'admin@gharinto.com',
    password: 'admin123'
  });
  
  if (response.ok && response.data?.token) {
    return response.data.token;
  }
  return null;
}

// Employee Management Verification
async function verifyEmployeeManagement(token) {
  console.log('\n👨‍💼 VERIFYING EMPLOYEE MANAGEMENT IMPLEMENTATION');
  console.log('================================================');
  
  // Test get employees
  const employeesResponse = await makeRequest('GET', '/users/employees', null, token);
  logTest('employeeManagement', 'Get Employees List', employeesResponse.ok, 
    `Status: ${employeesResponse.status}`);
  
  // Test attendance marking
  const attendanceData = {
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00'
  };
  const attendanceResponse = await makeRequest('POST', '/users/employees/attendance', attendanceData, token);
  logTest('employeeManagement', 'Mark Attendance', attendanceResponse.ok, 
    `Status: ${attendanceResponse.status}`);
  
  // Test performance reviews
  const reviewsResponse = await makeRequest('GET', '/users/employees/performance-reviews', null, token);
  logTest('employeeManagement', 'Get Performance Reviews', reviewsResponse.ok, 
    `Status: ${reviewsResponse.status}`);
  
  // Test payroll
  const payrollResponse = await makeRequest('GET', '/users/employees/payroll', null, token);
  logTest('employeeManagement', 'Get Payroll History', payrollResponse.ok, 
    `Status: ${payrollResponse.status}`);
  
  // Test salary adjustment (create)
  const salaryData = {
    employeeId: 1,
    newSalary: 50000,
    adjustmentType: 'increment',
    reason: 'Annual increment',
    effectiveDate: new Date().toISOString().split('T')[0],
    isRecurring: false
  };
  const salaryResponse = await makeRequest('POST', '/users/employees/salary-adjustment', salaryData, token);
  logTest('employeeManagement', 'Salary Adjustment', salaryResponse.ok, 
    `Status: ${salaryResponse.status}`);
}

// Complaint Management Verification
async function verifyComplaintManagement(token) {
  console.log('\n📞 VERIFYING COMPLAINT MANAGEMENT IMPLEMENTATION');
  console.log('================================================');
  
  // Test SLA compliance check
  const slaResponse = await makeRequest('GET', '/complaints/sla-check', null, token);
  logTest('complaintManagement', 'SLA Compliance Check', slaResponse.ok, 
    `Status: ${slaResponse.status}`);
  
  // Test complaint analytics
  const analyticsResponse = await makeRequest('GET', '/complaints/analytics', null, token);
  logTest('complaintManagement', 'Complaint Analytics', analyticsResponse.ok, 
    `Status: ${analyticsResponse.status}`);
  
  // Test bulk operations
  const bulkData = {
    complaintIds: [1, 2],
    updates: { priority: 'high' }
  };
  const bulkResponse = await makeRequest('PUT', '/complaints/bulk-update', bulkData, token);
  logTest('complaintManagement', 'Bulk Complaint Update', bulkResponse.ok, 
    `Status: ${bulkResponse.status}`);
  
  // Test create complaint (as customer)
  const complaintData = {
    title: 'Test complaint for verification',
    description: 'This is a test complaint for production readiness verification',
    category: 'service',
    priority: 'medium'
  };
  const createComplaintResponse = await makeRequest('POST', '/complaints', complaintData, token);
  logTest('complaintManagement', 'Create Complaint', createComplaintResponse.ok, 
    `Status: ${createComplaintResponse.status}`);
}

// Monitoring System Verification
async function verifyMonitoring(token) {
  console.log('\n📊 VERIFYING MONITORING SYSTEM IMPLEMENTATION');
  console.log('================================================');
  
  // Test system metrics
  const metricsResponse = await makeRequest('GET', '/monitoring/metrics', null, token);
  logTest('monitoring', 'System Metrics', metricsResponse.ok, 
    `Status: ${metricsResponse.status}`);
  
  // Test business metrics
  const businessMetricsResponse = await makeRequest('GET', '/monitoring/business-metrics', null, token);
  logTest('monitoring', 'Business Metrics', businessMetricsResponse.ok, 
    `Status: ${businessMetricsResponse.status}`);
  
  // Test detailed health check
  const healthResponse = await makeRequest('GET', '/health/detailed');
  logTest('monitoring', 'Detailed Health Check', healthResponse.ok, 
    `Status: ${healthResponse.status}`);
  
  // Test alert rules
  const alertRulesResponse = await makeRequest('GET', '/monitoring/alert-rules', null, token);
  logTest('monitoring', 'Alert Rules', alertRulesResponse.ok, 
    `Status: ${alertRulesResponse.status}`);
  
  // Test create alert rule
  const alertRuleData = {
    name: 'High CPU Usage',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 5,
    severity: 'high',
    notificationChannels: ['email']
  };
  const createAlertResponse = await makeRequest('POST', '/monitoring/alert-rules', alertRuleData, token);
  logTest('monitoring', 'Create Alert Rule', createAlertResponse.ok, 
    `Status: ${createAlertResponse.status}`);
}

// Testing Framework Verification
async function verifyTestingFramework() {
  console.log('\n🧪 VERIFYING TESTING FRAMEWORK IMPLEMENTATION');
  console.log('================================================');
  
  // Check if test files exist
  const testFiles = [
    'tests/comprehensive-test-suite.js',
    'tests/performance-test-suite.js',
    'test-runner.js'
  ];
  
  for (const file of testFiles) {
    const exists = fs.existsSync(file);
    logTest('testing', `Test File: ${file}`, exists, exists ? 'File exists' : 'File missing');
  }
  
  // Check package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['test', 'test:functional', 'test:performance'];
  
  for (const script of requiredScripts) {
    const exists = packageJson.scripts && packageJson.scripts[script];
    logTest('testing', `NPM Script: ${script}`, !!exists, exists ? 'Script configured' : 'Script missing');
  }
  
  // Check database migration
  const migrationExists = fs.existsSync('backend/db/migrations/011_create_monitoring_tables.up.sql');
  logTest('testing', 'Monitoring Migration', migrationExists, 
    migrationExists ? 'Migration file exists' : 'Migration file missing');
}

// Database Schema Verification
async function verifyDatabaseSchema() {
  console.log('\n🗄️ VERIFYING DATABASE SCHEMA');
  console.log('================================================');
  
  // This would require database connection - simplified for now
  const requiredTables = [
    'system_metrics',
    'alert_rules',
    'alerts',
    'performance_reviews',
    'salary_adjustments',
    'payroll_batches',
    'payroll_records',
    'satisfaction_surveys'
  ];
  
  // For now, just verify migration file exists and contains table definitions
  const migrationFile = 'backend/db/migrations/011_create_monitoring_tables.up.sql';
  if (fs.existsSync(migrationFile)) {
    const migrationContent = fs.readFileSync(migrationFile, 'utf8');
    
    for (const table of requiredTables) {
      const tableExists = migrationContent.includes(`CREATE TABLE ${table}`);
      logTest('testing', `Database Table: ${table}`, tableExists, 
        tableExists ? 'Table definition found' : 'Table definition missing');
    }
  } else {
    logTest('testing', 'Migration File', false, 'Migration file not found');
  }
}

// Generate verification report
function generateVerificationReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🏁 PRODUCTION READINESS VERIFICATION COMPLETE');
  console.log('='.repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [category, results] of Object.entries(verificationResults)) {
    if (category === 'overall') continue;
    
    totalPassed += results.passed;
    totalFailed += results.failed;
    
    console.log(`\n📊 ${category.toUpperCase()}:`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  }
  
  const totalTests = totalPassed + totalFailed;
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   📋 Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📈 Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  
  // Determine production readiness status
  let status = 'NOT READY';
  if (overallSuccessRate >= 95) {
    status = 'PRODUCTION READY';
  } else if (overallSuccessRate >= 85) {
    status = 'MOSTLY READY';
  } else if (overallSuccessRate >= 70) {
    status = 'NEEDS WORK';
  }
  
  verificationResults.overall.score = overallSuccessRate;
  verificationResults.overall.status = status;
  
  console.log(`\n🎯 PRODUCTION READINESS STATUS:`);
  if (status === 'PRODUCTION READY') {
    console.log('   🟢 PRODUCTION READY - All systems operational');
  } else if (status === 'MOSTLY READY') {
    console.log('   🟡 MOSTLY READY - Minor issues need fixing');
  } else if (status === 'NEEDS WORK') {
    console.log('   🟠 NEEDS WORK - Several issues need resolution');
  } else {
    console.log('   🔴 NOT READY - Major issues need resolution');
  }
  
  console.log(`\n✨ Production Score: ${overallSuccessRate.toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');
  
  // Save verification report
  const reportData = {
    timestamp: new Date().toISOString(),
    overallScore: overallSuccessRate,
    status: status,
    totalTests: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    categories: verificationResults
  };
  
  fs.writeFileSync('verification-results.json', JSON.stringify(reportData, null, 2));
  console.log('📄 Verification report saved to verification-results.json');
  
  return status === 'PRODUCTION READY';
}

// Main verification function
async function runProductionVerification() {
  console.log('🚀 STARTING PRODUCTION READINESS VERIFICATION');
  console.log('🏢 Gharinto Leap Backend - Implementation Verification');
  console.log('📊 Verifying all newly implemented components');
  console.log('='.repeat(80));
  
  try {
    // Authenticate
    console.log('\n🔐 Authenticating...');
    const token = await authenticateAdmin();
    if (!token) {
      console.log('❌ Authentication failed - cannot proceed with API tests');
      return false;
    }
    console.log('✅ Authentication successful');
    
    // Run verifications
    await verifyEmployeeManagement(token);
    await verifyComplaintManagement(token);
    await verifyMonitoring(token);
    await verifyTestingFramework();
    await verifyDatabaseSchema();
    
    // Generate report
    const isReady = generateVerificationReport();
    
    return isReady;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  runProductionVerification().then(isReady => {
    process.exit(isReady ? 0 : 1);
  });
}

module.exports = {
  runProductionVerification,
  verificationResults
};
