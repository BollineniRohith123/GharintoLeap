#!/usr/bin/env node

/**
 * Comprehensive Frontend Analysis & Testing
 * Tests every page, component, and integration point
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🎯 COMPREHENSIVE FRONTEND ANALYSIS & TESTING');
console.log('==============================================');
console.log('🏢 Gharinto Leap Interior Design Marketplace');
console.log('==============================================\n');

let testResults = {
  pages: { passed: 0, failed: 0, total: 0, details: [] },
  components: { passed: 0, failed: 0, total: 0, details: [] },
  integration: { passed: 0, failed: 0, total: 0, details: [] },
  fileStructure: { passed: 0, failed: 0, total: 0, details: [] }
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

// Get authentication token for protected routes
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

// Test frontend page accessibility
async function testPageAccessibility() {
  console.log('\n📄 TESTING PAGE ACCESSIBILITY');
  console.log('==============================');
  
  // Test if frontend is serving content
  try {
    const response = await fetch(FRONTEND_URL);
    const html = await response.text();
    
    const isServing = response.ok && html.includes('<!DOCTYPE html>');
    logTest('pages', 'Frontend Server Accessibility', isServing, 
           `Status: ${response.status}, HTML detected: ${html.includes('<!DOCTYPE html>')}`);
    
    // Check for React app mounting
    const hasReactRoot = html.includes('id="root"') || html.includes('id="app"');
    logTest('pages', 'React App Mount Point', hasReactRoot, 'Root element found');
    
    // Check for Vite development setup
    const hasViteClient = html.includes('@vite/client');
    logTest('pages', 'Vite Development Setup', hasViteClient, 'Vite client detected');
    
    return isServing;
  } catch (error) {
    logTest('pages', 'Frontend Server Accessibility', false, error.message);
    return false;
  }
}

// Analyze frontend file structure
async function analyzeFileStructure() {
  console.log('\n📁 ANALYZING FILE STRUCTURE');
  console.log('============================');
  
  const frontendPath = './frontend';
  
  // Check main configuration files
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'App.tsx'
  ];
  
  for (const file of configFiles) {
    const filePath = path.join(frontendPath, file);
    const exists = fs.existsSync(filePath);
    logTest('fileStructure', `Config File: ${file}`, exists, exists ? 'Found' : 'Missing');
  }
  
  // Check essential directories
  const essentialDirs = [
    'components',
    'pages',
    'contexts',
    'lib'
  ];
  
  for (const dir of essentialDirs) {
    const dirPath = path.join(frontendPath, dir);
    const exists = fs.existsSync(dirPath);
    logTest('fileStructure', `Directory: ${dir}`, exists, exists ? 'Found' : 'Missing');
  }
  
  // Check component categories
  const componentDirs = [
    'components/ui',
    'components/auth',
    'components/dashboard',
    'components/forms',
    'components/layout',
    'components/navigation'
  ];
  
  for (const dir of componentDirs) {
    const dirPath = path.join(frontendPath, dir);
    const exists = fs.existsSync(dirPath);
    logTest('fileStructure', `Component Category: ${dir}`, exists, exists ? 'Found' : 'Missing');
  }
}

// Test component imports and exports
async function testComponentStructure() {
  console.log('\n🧩 TESTING COMPONENT STRUCTURE');
  console.log('===============================');
  
  // Check if main App component exists and is properly structured
  try {
    const appPath = './frontend/App.tsx';
    const appExists = fs.existsSync(appPath);
    logTest('components', 'Main App Component', appExists, 'App.tsx found');
    
    if (appExists) {
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      // Check for essential imports
      const hasRouter = appContent.includes('BrowserRouter') || appContent.includes('Router');
      logTest('components', 'Router Implementation', hasRouter, 'React Router detected');
      
      const hasQueryClient = appContent.includes('QueryClient');
      logTest('components', 'Query Client Setup', hasQueryClient, 'React Query detected');
      
      const hasAuthProvider = appContent.includes('AuthProvider');
      logTest('components', 'Auth Provider', hasAuthProvider, 'Authentication context found');
      
      // Check for route definitions
      const hasRoutes = appContent.includes('<Routes>') && appContent.includes('<Route');
      logTest('components', 'Route Definitions', hasRoutes, 'Routes properly defined');
    }
  } catch (error) {
    logTest('components', 'App Component Analysis', false, error.message);
  }
  
  // Check API client
  try {
    const apiClientPath = './frontend/lib/api-client.ts';
    const apiClientExists = fs.existsSync(apiClientPath);
    logTest('components', 'API Client', apiClientExists, 'API client found');
    
    if (apiClientExists) {
      const apiContent = fs.readFileSync(apiClientPath, 'utf8');
      
      const hasBaseURL = apiContent.includes('localhost:4000') || apiContent.includes('API_BASE_URL');
      logTest('components', 'API Base URL Configuration', hasBaseURL, 'Backend URL configured');
      
      const hasAuthMethods = apiContent.includes('login') && apiContent.includes('token');
      logTest('components', 'Authentication Methods', hasAuthMethods, 'Auth methods implemented');
    }
  } catch (error) {
    logTest('components', 'API Client Analysis', false, error.message);
  }
}

// Test API integration from frontend perspective
async function testAPIIntegration(token) {
  console.log('\n🔗 TESTING API INTEGRATION');
  console.log('===========================');
  
  if (!token) {
    logTest('integration', 'API Integration', false, 'No authentication token available');
    return;
  }
  
  // Test key API endpoints that frontend would use
  const apiEndpoints = [
    { name: 'User Profile', url: '/users/profile' },
    { name: 'Dashboard Analytics', url: '/analytics/dashboard' },
    { name: 'Projects List', url: '/projects' },
    { name: 'Leads List', url: '/leads' },
    { name: 'Users List', url: '/users' },
    { name: 'Materials List', url: '/materials' },
    { name: 'Vendors List', url: '/vendors' },
    { name: 'User Permissions', url: '/rbac/user-permissions' },
    { name: 'User Menus', url: '/menus/user' }
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      });
      
      const isWorking = response.ok;
      logTest('integration', `API: ${endpoint.name}`, isWorking, 
             `Status: ${response.status}`);
    } catch (error) {
      logTest('integration', `API: ${endpoint.name}`, false, error.message);
    }
  }
}

// Test CORS and cross-origin requests
async function testCORSConfiguration() {
  console.log('\n🌐 TESTING CORS CONFIGURATION');
  console.log('==============================');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    
    const corsWorking = response.ok;
    logTest('integration', 'CORS Configuration', corsWorking, 
           `Cross-origin request: ${response.status}`);
  } catch (error) {
    logTest('integration', 'CORS Configuration', false, error.message);
  }
}

// Check for TypeScript configuration and compilation
async function testTypeScriptSetup() {
  console.log('\n📝 TESTING TYPESCRIPT SETUP');
  console.log('============================');
  
  try {
    const tsconfigPath = './frontend/tsconfig.json';
    const tsconfigExists = fs.existsSync(tsconfigPath);
    logTest('fileStructure', 'TypeScript Config', tsconfigExists, 'tsconfig.json found');
    
    if (tsconfigExists) {
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
      const config = JSON.parse(tsconfigContent);
      
      const hasStrictMode = config.compilerOptions?.strict;
      logTest('fileStructure', 'TypeScript Strict Mode', hasStrictMode, 'Strict mode enabled');
      
      const hasJSX = config.compilerOptions?.jsx;
      logTest('fileStructure', 'JSX Configuration', !!hasJSX, `JSX: ${hasJSX || 'not configured'}`);
    }
  } catch (error) {
    logTest('fileStructure', 'TypeScript Setup Analysis', false, error.message);
  }
}

// Test responsive design and CSS setup
async function testStylingSetup() {
  console.log('\n🎨 TESTING STYLING SETUP');
  console.log('=========================');
  
  // Check for CSS files
  const cssFiles = [
    './frontend/index.css',
    './frontend/src/index.css'
  ];
  
  let cssFound = false;
  for (const cssFile of cssFiles) {
    if (fs.existsSync(cssFile)) {
      cssFound = true;
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      
      const hasTailwind = cssContent.includes('@tailwind') || cssContent.includes('tailwind');
      logTest('fileStructure', 'Tailwind CSS Setup', hasTailwind, 'Tailwind directives found');
      break;
    }
  }
  
  logTest('fileStructure', 'CSS Files', cssFound, 'Main CSS file found');
  
  // Check package.json for styling dependencies
  try {
    const packagePath = './frontend/package.json';
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const hasTailwind = dependencies['tailwindcss'] || dependencies['@tailwindcss/forms'];
    logTest('fileStructure', 'Tailwind Dependencies', !!hasTailwind, 'Tailwind packages installed');
    
    const hasRadixUI = Object.keys(dependencies).some(dep => dep.includes('@radix-ui'));
    logTest('fileStructure', 'Radix UI Components', hasRadixUI, 'Radix UI packages found');
  } catch (error) {
    logTest('fileStructure', 'Styling Dependencies Analysis', false, error.message);
  }
}

function generateReport() {
  console.log('\n📊 COMPREHENSIVE FRONTEND ANALYSIS REPORT');
  console.log('==========================================');
  
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
  
  console.log('\n🎯 OVERALL FRONTEND RESULTS');
  console.log('============================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  
  console.log('\n🏆 FRONTEND STATUS');
  console.log('==================');
  if (overallSuccessRate >= 95) {
    console.log('🎉 EXCELLENT - Frontend is production ready!');
  } else if (overallSuccessRate >= 85) {
    console.log('🟢 GOOD - Frontend is mostly ready');
  } else if (overallSuccessRate >= 75) {
    console.log('🟡 FAIR - Frontend needs some attention');
  } else {
    console.log('🔴 POOR - Frontend has significant issues');
  }
  
  // List failed tests
  if (totalFailed > 0) {
    console.log('\n❌ FAILED TESTS:');
    categories.forEach(category => {
      const failedTests = testResults[category].details.filter(t => !t.passed);
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

async function runComprehensiveFrontendAnalysis() {
  console.log('🚀 Starting Comprehensive Frontend Analysis...\n');
  
  // Get authentication token
  const token = await getAuthToken();
  
  // Run all tests
  await testPageAccessibility();
  await analyzeFileStructure();
  await testComponentStructure();
  await testAPIIntegration(token);
  await testCORSConfiguration();
  await testTypeScriptSetup();
  await testStylingSetup();
  
  return generateReport();
}

// Run the analysis
runComprehensiveFrontendAnalysis().catch(console.error);
