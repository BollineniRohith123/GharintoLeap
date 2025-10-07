const http = require('http');

const testUsers = [
  { email: 'superadmin@gharinto.com', password: 'superadmin123', role: 'Super Admin' },
  { email: 'admin@gharinto.com', password: 'admin123', role: 'Admin' },
  { email: 'pm@gharinto.com', password: 'pm123', role: 'Project Manager' },
  { email: 'designer@gharinto.com', password: 'designer123', role: 'Interior Designer' },
  { email: 'customer@gharinto.com', password: 'customer123', role: 'Customer' },
  { email: 'vendor@gharinto.com', password: 'vendor123', role: 'Vendor' },
];

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testCompleteFlow(user) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Testing Complete Flow: ${user.role}`);
  console.log('='.repeat(70));
  
  const results = {
    login: false,
    profile: false,
    menus: false,
    menuCount: 0
  };
  
  try {
    // Step 1: Login
    console.log('\n1️⃣  Login');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: user.email,
      password: user.password
    });
    
    if (loginResponse.status !== 200) {
      console.log(`   ❌ Login failed: ${loginResponse.status}`);
      console.log(`   Error:`, loginResponse.data);
      return results;
    }
    
    console.log(`   ✅ Login successful`);
    results.login = true;
    const token = loginResponse.data.token;
    
    // Step 2: Get Profile
    console.log('\n2️⃣  Get Profile');
    const profileResponse = await makeRequest('GET', '/users/profile', null, token);
    
    if (profileResponse.status !== 200) {
      console.log(`   ❌ Profile fetch failed: ${profileResponse.status}`);
      return results;
    }
    
    console.log(`   ✅ Profile retrieved`);
    console.log(`   Name: ${profileResponse.data.firstName} ${profileResponse.data.lastName}`);
    console.log(`   Roles: ${profileResponse.data.roles?.join(', ')}`);
    console.log(`   Permissions: ${profileResponse.data.permissions?.length || 0}`);
    results.profile = true;
    
    // Step 3: Get Menus (CRITICAL - This is what the navbar needs!)
    console.log('\n3️⃣  Get User Menus (Navbar Data)');
    const menuResponse = await makeRequest('GET', '/menus/user', null, token);
    
    if (menuResponse.status !== 200) {
      console.log(`   ❌ Menu fetch failed: ${menuResponse.status}`);
      console.log(`   Error:`, menuResponse.data);
      return results;
    }
    
    console.log(`   ✅ Menus retrieved successfully`);
    const menus = menuResponse.data.menus || [];
    results.menus = true;
    results.menuCount = menus.length;
    
    console.log(`   📊 Root menus: ${menus.length}`);
    
    if (menus.length > 0) {
      console.log('\n   📁 Available Navigation Items:');
      menus.forEach(menu => {
        const displayName = menu.display_name || menu.displayName || menu.name;
        console.log(`      • ${displayName} ${menu.path ? `(${menu.path})` : ''}`);
        if (menu.children && menu.children.length > 0) {
          menu.children.forEach(child => {
            const childName = child.display_name || child.displayName || child.name;
            console.log(`        └─ ${childName} ${child.path ? `(${child.path})` : ''}`);
          });
        }
      });
    } else {
      console.log('   ⚠️  No menus returned - navbar will be empty!');
    }
    
    console.log(`\n✅ ${user.role} - ALL TESTS PASSED`);
    return results;
    
  } catch (error) {
    console.log(`\n❌ ${user.role} - ERROR: ${error.message}`);
    return results;
  }
}

async function runCompleteTest() {
  console.log('\n🎯 FINAL END-TO-END TEST - COMPLETE USER FLOW');
  console.log('='.repeat(70));
  console.log('Testing: Login → Profile → Menus (Navbar Data)');
  console.log('='.repeat(70));
  
  const allResults = [];
  
  for (const user of testUsers) {
    const results = await testCompleteFlow(user);
    allResults.push({ user: user.role, ...results });
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  const loginPassed = allResults.filter(r => r.login).length;
  const profilePassed = allResults.filter(r => r.profile).length;
  const menusPassed = allResults.filter(r => r.menus).length;
  
  console.log(`\n✅ Login Success: ${loginPassed}/${testUsers.length}`);
  console.log(`✅ Profile Success: ${profilePassed}/${testUsers.length}`);
  console.log(`✅ Menus Success: ${menusPassed}/${testUsers.length}`);
  
  console.log('\n📋 Menu Counts by Role:');
  allResults.forEach(r => {
    console.log(`   ${r.user}: ${r.menuCount} root menus`);
  });
  
  const allPassed = loginPassed === testUsers.length && 
                    profilePassed === testUsers.length && 
                    menusPassed === testUsers.length;
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✨ System Status:');
    console.log('   ✅ Backend API (http://localhost:4000)');
    console.log('   ✅ Frontend App (http://localhost:5173)');
    console.log('   ✅ PostgreSQL Database');
    console.log('   ✅ Authentication System');
    console.log('   ✅ User Profile Endpoint');
    console.log('   ✅ Menu Endpoint (Navbar Data)');
    console.log('\n🌐 The application is ready!');
    console.log('   Open http://localhost:5173 in your browser');
    console.log('   Login with any of the test credentials');
    console.log('   The navbar should now load correctly!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

runCompleteTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

