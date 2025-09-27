#!/usr/bin/env node

/**
 * Page-by-Page Frontend Analysis
 * Analyzes every page component for completeness and functionality
 */

import fs from 'fs';
import path from 'path';

console.log('📄 PAGE-BY-PAGE FRONTEND ANALYSIS');
console.log('==================================');
console.log('🏢 Gharinto Leap Interior Design Marketplace');
console.log('==================================\n');

let pageResults = {
  public: { passed: 0, failed: 0, total: 0, details: [] },
  auth: { passed: 0, failed: 0, total: 0, details: [] },
  dashboard: { passed: 0, failed: 0, total: 0, details: [] },
  feature: { passed: 0, failed: 0, total: 0, details: [] },
  admin: { passed: 0, failed: 0, total: 0, details: [] }
};

function logPageTest(category, name, passed, details = '') {
  pageResults[category].total++;
  if (passed) {
    pageResults[category].passed++;
    console.log(`✅ ${name}: PASSED ${details}`);
  } else {
    pageResults[category].failed++;
    console.log(`❌ ${name}: FAILED ${details}`);
  }
  pageResults[category].details.push({ name, passed, details });
}

function analyzePageComponent(filePath, pageName, category) {
  try {
    if (!fs.existsSync(filePath)) {
      logPageTest(category, pageName, false, 'File not found');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic structure checks
    const hasReactImport = content.includes('import React') || content.includes('import {') || content.includes('from \'react\'');
    const hasExport = content.includes('export default') || content.includes('export {');
    const hasJSX = content.includes('return (') && (content.includes('<') || content.includes('jsx'));
    
    if (!hasReactImport && !hasExport) {
      logPageTest(category, pageName, false, 'Missing React imports or exports');
      return;
    }
    
    if (!hasJSX) {
      logPageTest(category, pageName, false, 'No JSX content found');
      return;
    }
    
    // Check for common patterns
    const hasState = content.includes('useState') || content.includes('useEffect');
    const hasAPI = content.includes('fetch') || content.includes('api') || content.includes('query');
    const hasForm = content.includes('form') || content.includes('Form') || content.includes('input');
    const hasNavigation = content.includes('navigate') || content.includes('Link') || content.includes('router');
    
    let details = [];
    if (hasState) details.push('State management');
    if (hasAPI) details.push('API integration');
    if (hasForm) details.push('Form handling');
    if (hasNavigation) details.push('Navigation');
    
    logPageTest(category, pageName, true, details.join(', ') || 'Basic component');
    
  } catch (error) {
    logPageTest(category, pageName, false, `Error: ${error.message}`);
  }
}

function analyzePublicPages() {
  console.log('\n🌐 ANALYZING PUBLIC PAGES');
  console.log('==========================');
  
  const publicPages = [
    { file: './frontend/pages/public/HomePage.tsx', name: 'Home Page' }
  ];
  
  publicPages.forEach(page => {
    analyzePageComponent(page.file, page.name, 'public');
  });
}

function analyzeAuthPages() {
  console.log('\n🔐 ANALYZING AUTHENTICATION PAGES');
  console.log('==================================');
  
  const authPages = [
    { file: './frontend/pages/auth/LoginPage.tsx', name: 'Login Page' },
    { file: './frontend/pages/auth/RegisterPage.tsx', name: 'Register Page' },
    { file: './frontend/pages/auth/ResetPasswordPage.tsx', name: 'Reset Password Page' },
    { file: './frontend/components/auth/ForgotPasswordForm.tsx', name: 'Forgot Password Form' },
    { file: './frontend/components/auth/ProtectedRoute.tsx', name: 'Protected Route Component' }
  ];
  
  authPages.forEach(page => {
    analyzePageComponent(page.file, page.name, 'auth');
  });
}

function analyzeDashboardPages() {
  console.log('\n📊 ANALYZING DASHBOARD PAGES');
  console.log('=============================');
  
  const dashboardPages = [
    { file: './frontend/components/dashboard/RoleDashboard.tsx', name: 'Role Dashboard' },
    { file: './frontend/components/layout/DashboardLayout.tsx', name: 'Dashboard Layout' }
  ];
  
  dashboardPages.forEach(page => {
    analyzePageComponent(page.file, page.name, 'dashboard');
  });
}

function analyzeFeaturePages() {
  console.log('\n🚀 ANALYZING FEATURE PAGES');
  console.log('===========================');
  
  const featurePages = [
    { file: './frontend/pages/users/UsersPage.tsx', name: 'Users Page' },
    { file: './frontend/pages/leads/LeadsPage.tsx', name: 'Leads Page' },
    { file: './frontend/pages/projects/ProjectsPage.tsx', name: 'Projects Page' },
    { file: './frontend/pages/projects/ProjectDetailsPage.tsx', name: 'Project Details Page' },
    { file: './frontend/pages/analytics/AnalyticsPage.tsx', name: 'Analytics Page' },
    { file: './frontend/pages/materials/MaterialsPage.tsx', name: 'Materials Page' },
    { file: './frontend/pages/finance/FinancePage.tsx', name: 'Finance Page' },
    { file: './frontend/pages/settings/SettingsPage.tsx', name: 'Settings Page' },
    { file: './frontend/pages/testimonials/TestimonialsPage.tsx', name: 'Testimonials Page' },
    { file: './frontend/pages/vendors/VendorsPage.tsx', name: 'Vendors Page' },
    { file: './frontend/pages/support/ComplaintsPage.tsx', name: 'Complaints Page' }
  ];
  
  featurePages.forEach(page => {
    analyzePageComponent(page.file, page.name, 'feature');
  });
}

function analyzeAdminPages() {
  console.log('\n👑 ANALYZING ADMIN PAGES');
  console.log('=========================');
  
  const adminPages = [
    { file: './frontend/pages/admin/EmployeesPage.tsx', name: 'Employees Page' },
    { file: './frontend/pages/admin/SystemHealthPage.tsx', name: 'System Health Page' }
  ];
  
  adminPages.forEach(page => {
    analyzePageComponent(page.file, page.name, 'admin');
  });
}

function analyzeComponentCategories() {
  console.log('\n🧩 ANALYZING COMPONENT CATEGORIES');
  console.log('==================================');
  
  const componentDirs = [
    './frontend/components/ui',
    './frontend/components/forms',
    './frontend/components/navigation',
    './frontend/components/layout'
  ];
  
  componentDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
      console.log(`📁 ${dir}: ${files.length} components`);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const componentName = file.replace(/\.(tsx|ts)$/, '');
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const hasExport = content.includes('export');
          const hasJSX = content.includes('<') || content.includes('jsx');
          
          if (hasExport && (hasJSX || file.endsWith('.ts'))) {
            console.log(`   ✅ ${componentName}: Valid component`);
          } else {
            console.log(`   ⚠️  ${componentName}: Potential issues`);
          }
        } catch (error) {
          console.log(`   ❌ ${componentName}: Error reading file`);
        }
      });
    } else {
      console.log(`📁 ${dir}: Directory not found`);
    }
  });
}

function checkForMissingPages() {
  console.log('\n🔍 CHECKING FOR MISSING PAGES');
  console.log('==============================');
  
  // Pages referenced in App.tsx but might be missing
  const expectedPages = [
    './frontend/pages/public/HomePage.tsx',
    './frontend/pages/auth/LoginPage.tsx',
    './frontend/pages/auth/RegisterPage.tsx',
    './frontend/pages/users/UsersPage.tsx',
    './frontend/pages/leads/LeadsPage.tsx',
    './frontend/pages/projects/ProjectsPage.tsx',
    './frontend/pages/analytics/AnalyticsPage.tsx'
  ];
  
  expectedPages.forEach(pagePath => {
    const exists = fs.existsSync(pagePath);
    const pageName = path.basename(pagePath, '.tsx');
    console.log(`${exists ? '✅' : '❌'} ${pageName}: ${exists ? 'Found' : 'Missing'}`);
  });
}

function generatePageReport() {
  console.log('\n📊 PAGE ANALYSIS REPORT');
  console.log('========================');
  
  const categories = Object.keys(pageResults);
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  categories.forEach(category => {
    const result = pageResults[category];
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
    
    const successRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
    console.log(`${category.toUpperCase().padEnd(12)} | ${result.passed}/${result.total} | ${successRate}%`);
  });
  
  const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
  
  console.log('\n🎯 OVERALL PAGE RESULTS');
  console.log('========================');
  console.log(`Total Pages: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  
  if (totalFailed > 0) {
    console.log('\n❌ FAILED PAGES:');
    categories.forEach(category => {
      const failedPages = pageResults[category].details.filter(p => !p.passed);
      if (failedPages.length > 0) {
        console.log(`\n${category.toUpperCase()}:`);
        failedPages.forEach(page => {
          console.log(`   - ${page.name}: ${page.details}`);
        });
      }
    });
  }
  
  return { overallSuccessRate, totalTests, totalPassed, totalFailed };
}

async function runPageByPageAnalysis() {
  console.log('🚀 Starting Page-by-Page Analysis...\n');
  
  analyzePublicPages();
  analyzeAuthPages();
  analyzeDashboardPages();
  analyzeFeaturePages();
  analyzeAdminPages();
  analyzeComponentCategories();
  checkForMissingPages();
  
  return generatePageReport();
}

// Run the analysis
runPageByPageAnalysis().catch(console.error);
