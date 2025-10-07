/**
 * Browser Console Test Script
 * Run this in the browser console at http://localhost:5173
 * 
 * This script will test the login flow for all user roles
 */

const testUsers = [
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

async function testLoginFlow(user) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${user.role} (${user.email})`);
  console.log('='.repeat(60));
  
  try {
    // Navigate to login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find form elements
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (!emailInput || !passwordInput || !submitButton) {
      console.error('❌ Login form elements not found');
      console.log('Email input:', emailInput);
      console.log('Password input:', passwordInput);
      console.log('Submit button:', submitButton);
      return false;
    }
    
    console.log('✅ Login form found');
    
    // Clear existing values
    emailInput.value = '';
    passwordInput.value = '';
    
    // Fill in credentials
    emailInput.value = user.email;
    passwordInput.value = user.password;
    
    // Trigger React events
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    
    emailInput.dispatchEvent(inputEvent);
    emailInput.dispatchEvent(changeEvent);
    passwordInput.dispatchEvent(inputEvent);
    passwordInput.dispatchEvent(changeEvent);
    
    console.log('✅ Credentials entered');
    
    // Submit form
    submitButton.click();
    console.log('✅ Login button clicked');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if redirected to dashboard
    if (window.location.pathname.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard');
      
      // Check for user info in localStorage
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('✅ Auth token stored');
        console.log(`   Token: ${token.substring(0, 30)}...`);
      }
      
      // Wait for dashboard to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for dashboard content
      const dashboardContent = document.querySelector('[class*="dashboard"]') || 
                              document.querySelector('main') ||
                              document.querySelector('[role="main"]');
      
      if (dashboardContent) {
        console.log('✅ Dashboard content loaded');
      }
      
      console.log(`\n✅ ${user.role} - LOGIN SUCCESSFUL\n`);
      return true;
      
    } else if (window.location.pathname.includes('/login')) {
      // Still on login page - check for errors
      const errorElement = document.querySelector('[role="alert"]') ||
                          document.querySelector('.error') ||
                          document.querySelector('[class*="error"]');
      
      if (errorElement) {
        console.error(`❌ Login error: ${errorElement.textContent}`);
      } else {
        console.error('❌ Still on login page, no error message found');
      }
      return false;
      
    } else {
      console.log(`⚠️  Redirected to: ${window.location.pathname}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function logout() {
  console.log('\n🔓 Logging out...');
  
  // Clear localStorage
  localStorage.removeItem('auth_token');
  
  // Navigate to login
  window.location.href = '/login';
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Logged out\n');
}

async function runAllTests() {
  console.log('\n🚀 BROWSER-BASED LOGIN TESTING');
  console.log('='.repeat(60));
  console.log(`Testing ${testUsers.length} user roles\n`);
  
  const results = [];
  
  for (const user of testUsers) {
    const result = await testLoginFlow(user);
    results.push({ user: user.email, role: user.role, success: result });
    
    if (result) {
      // Logout before next test
      await logout();
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.role} (${r.user})`);
    });
  }
  
  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✨ All user roles can login successfully through the UI');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Instructions
console.log(`
╔════════════════════════════════════════════════════════════╗
║  GHARINTO LEAP - BROWSER LOGIN TEST SCRIPT                 ║
╚════════════════════════════════════════════════════════════╝

To run the tests, execute:

  runAllTests()

To test a single user:

  testLoginFlow(testUsers[0])  // Super Admin
  testLoginFlow(testUsers[1])  // Admin
  testLoginFlow(testUsers[2])  // Project Manager
  testLoginFlow(testUsers[3])  // Interior Designer
  testLoginFlow(testUsers[4])  // Customer
  testLoginFlow(testUsers[5])  // Vendor

Available test users:
${testUsers.map((u, i) => `  ${i}. ${u.role}: ${u.email}`).join('\n')}

`);

