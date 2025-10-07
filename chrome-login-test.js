// Comprehensive Chrome-based login testing script
const testUsers = [
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

async function testLogin(user) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${user.role} (${user.email})`);
  console.log('='.repeat(60));
  
  try {
    // Navigate to login page
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fill in credentials
    const emailInput = document.querySelector('input[type="email"], input[name="email"]');
    const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
    const loginButton = document.querySelector('button[type="submit"], button:contains("Login")');
    
    if (!emailInput || !passwordInput) {
      console.error('❌ Login form not found');
      return false;
    }
    
    emailInput.value = user.email;
    passwordInput.value = user.password;
    
    // Trigger input events
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('✅ Credentials entered');
    
    // Click login button
    if (loginButton) {
      loginButton.click();
      console.log('✅ Login button clicked');
    }
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for errors
    const errorElement = document.querySelector('[role="alert"], .error, .error-message');
    if (errorElement) {
      console.error(`❌ Login error: ${errorElement.textContent}`);
      return false;
    }
    
    // Check if redirected to dashboard
    if (window.location.pathname.includes('dashboard') || window.location.pathname === '/') {
      console.log('✅ Successfully logged in and redirected');
      return true;
    }
    
    console.log('⚠️  Login status unclear');
    return false;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Run tests
(async () => {
  console.log('🧪 Starting Chrome-based login tests...\n');
  
  for (const user of testUsers) {
    const result = await testLogin(user);
    if (!result) {
      console.log(`\n⚠️  ${user.role} login needs attention`);
    }
    
    // Logout before next test
    const logoutButton = document.querySelector('button:contains("Logout"), a:contains("Logout")');
    if (logoutButton) {
      logoutButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n✅ All tests completed');
})();

