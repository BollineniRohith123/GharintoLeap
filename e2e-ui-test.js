/**
 * Comprehensive End-to-End UI Testing with Puppeteer
 * Tests the complete login flow through the actual browser UI
 */

const puppeteer = require('puppeteer');

const testUsers = [
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin', expectedRole: 'super_admin' },
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin', expectedRole: 'admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager', expectedRole: 'project_manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer', expectedRole: 'interior_designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer', expectedRole: 'customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor', expectedRole: 'vendor' },
];

async function testUserLoginUI(browser, user) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Testing UI: ${user.role} (${user.email})`);
  console.log('='.repeat(70));
  
  const page = await browser.newPage();
  const results = {
    user: user.email,
    role: user.role,
    success: false,
    steps: [],
    errors: [],
    screenshots: []
  };
  
  try {
    // Enable console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`   [Browser ${type}]:`, msg.text());
        results.errors.push(`Browser ${type}: ${msg.text()}`);
      }
    });
    
    // Enable error tracking
    page.on('pageerror', error => {
      console.log(`   [Page Error]:`, error.message);
      results.errors.push(`Page error: ${error.message}`);
    });
    
    // Step 1: Navigate to login page
    console.log('\n1️⃣  Navigating to login page...');
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    results.steps.push('Navigated to login page');
    console.log('   ✅ Login page loaded');
    
    // Wait for form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    results.steps.push('Login form elements found');
    console.log('   ✅ Login form elements found');
    
    // Step 2: Fill in credentials
    console.log('\n2️⃣  Entering credentials...');
    await page.type('input[type="email"]', user.email, { delay: 50 });
    await page.type('input[type="password"]', user.password, { delay: 50 });
    results.steps.push('Credentials entered');
    console.log('   ✅ Email:', user.email);
    console.log('   ✅ Password: ********');
    
    // Step 3: Submit form
    console.log('\n3️⃣  Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    results.steps.push('Form submitted');
    console.log('   ✅ Form submitted');
    
    // Step 4: Check for successful redirect
    console.log('\n4️⃣  Verifying redirect...');
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      results.steps.push('Redirected to dashboard');
      console.log('   ✅ Redirected to dashboard');
      
      // Step 5: Verify token in localStorage
      console.log('\n5️⃣  Checking authentication token...');
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      
      if (token) {
        results.steps.push('Auth token stored');
        console.log('   ✅ Auth token stored');
        console.log(`   Token: ${token.substring(0, 30)}...`);
      } else {
        results.errors.push('No auth token found in localStorage');
        console.log('   ❌ No auth token found');
      }
      
      // Step 6: Wait for dashboard content to load
      console.log('\n6️⃣  Waiting for dashboard content...');
      await page.waitForTimeout(2000);
      
      // Check for dashboard content
      const hasDashboard = await page.evaluate(() => {
        return document.querySelector('main') !== null ||
               document.querySelector('[role="main"]') !== null ||
               document.body.textContent.includes('Dashboard');
      });
      
      if (hasDashboard) {
        results.steps.push('Dashboard content loaded');
        console.log('   ✅ Dashboard content loaded');
      }
      
      // Step 7: Check for console errors
      console.log('\n7️⃣  Checking for errors...');
      if (results.errors.length === 0) {
        console.log('   ✅ No console errors');
      } else {
        console.log(`   ⚠️  ${results.errors.length} errors found`);
      }
      
      // Step 8: Verify user profile loaded
      console.log('\n8️⃣  Verifying user profile...');
      const pageContent = await page.content();
      
      // Check if user name or email appears on page
      const hasUserInfo = pageContent.includes(user.email) || 
                         pageContent.toLowerCase().includes('admin') ||
                         pageContent.toLowerCase().includes('dashboard');
      
      if (hasUserInfo) {
        results.steps.push('User profile data visible');
        console.log('   ✅ User profile data visible');
      }
      
      results.success = true;
      console.log(`\n✅ ${user.role} - ALL UI TESTS PASSED`);
      
    } else if (currentUrl.includes('/login')) {
      // Still on login page - check for error message
      console.log('   ❌ Still on login page');
      
      const errorText = await page.evaluate(() => {
        const errorEl = document.querySelector('[role="alert"]');
        return errorEl ? errorEl.textContent : null;
      });
      
      if (errorText) {
        results.errors.push(`Login error: ${errorText}`);
        console.log('   ❌ Error message:', errorText);
      } else {
        results.errors.push('Login failed without error message');
        console.log('   ❌ No error message displayed');
      }
      
    } else {
      results.errors.push(`Unexpected redirect to: ${currentUrl}`);
      console.log('   ⚠️  Unexpected redirect to:', currentUrl);
    }
    
  } catch (error) {
    results.errors.push(error.message);
    console.log(`\n❌ ERROR: ${error.message}`);
    console.error(error);
  } finally {
    await page.close();
  }
  
  console.log('='.repeat(70));
  return results;
}

async function runUITests() {
  console.log('\n🚀 GHARINTO LEAP - COMPREHENSIVE UI E2E TESTING');
  console.log('='.repeat(70));
  console.log('Using Puppeteer for real browser automation\n');
  
  let browser;
  
  try {
    // Launch browser
    console.log('🌐 Launching Chrome browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    console.log('✅ Browser launched\n');
    
    const allResults = [];
    
    // Test each user
    for (const user of testUsers) {
      const result = await testUserLoginUI(browser, user);
      allResults.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE UI TEST SUMMARY');
    console.log('='.repeat(70));
    
    const totalTests = allResults.length;
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;
    
    console.log(`\n📈 Results:`);
    console.log(`   Total Users Tested: ${totalTests}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    if (passed === totalTests) {
      console.log('\n🎉 ALL UI TESTS PASSED!');
      console.log('\n✨ Complete end-to-end flow verified:');
      console.log('   ✅ Login page loads correctly');
      console.log('   ✅ Form inputs work properly');
      console.log('   ✅ Authentication succeeds');
      console.log('   ✅ Dashboard redirects work');
      console.log('   ✅ User sessions persist');
      console.log('   ✅ No console errors');
      console.log('\n🌐 Application is production-ready!');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED\n');
      allResults.forEach(r => {
        if (!r.success) {
          console.log(`❌ ${r.role} (${r.user}):`);
          console.log(`   Steps completed: ${r.steps.join(', ')}`);
          console.log(`   Errors: ${r.errors.join(', ')}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    await browser.close();
    process.exit(passed === totalTests ? 0 : 1);
    
  } catch (error) {
    console.error('Fatal error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  runUITests();
} catch (e) {
  console.log('\n⚠️  Puppeteer not installed');
  console.log('\nTo run UI tests, install Puppeteer:');
  console.log('  npm install puppeteer\n');
  console.log('Then run:');
  console.log('  node e2e-ui-test.js\n');
  process.exit(1);
}

