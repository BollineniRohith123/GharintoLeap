const http = require('http');

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

async function testMenuEndpoint() {
  console.log('🧪 Testing Menu Endpoint\n');
  
  // Login as super admin
  console.log('1. Logging in as Super Admin...');
  const loginResponse = await makeRequest('POST', '/auth/login', {
    email: 'superadmin@gharinto.com',
    password: 'superadmin123'
  });
  
  if (loginResponse.status !== 200) {
    console.log('❌ Login failed:', loginResponse.data);
    return;
  }
  
  console.log('✅ Login successful');
  const token = loginResponse.data.token;
  
  // Test menu endpoint
  console.log('\n2. Fetching user menus...');
  const menuResponse = await makeRequest('GET', '/menus/user', null, token);
  
  if (menuResponse.status !== 200) {
    console.log('❌ Menu fetch failed:', menuResponse.data);
    return;
  }
  
  console.log('✅ Menu endpoint working!');
  console.log('\nMenus returned:', JSON.stringify(menuResponse.data, null, 2));
  
  const menus = menuResponse.data.menus || [];
  console.log(`\n📊 Total root menus: ${menus.length}`);
  
  menus.forEach(menu => {
    console.log(`\n  📁 ${menu.display_name} (${menu.path || 'no path'})`);
    if (menu.children && menu.children.length > 0) {
      menu.children.forEach(child => {
        console.log(`    └─ ${child.display_name} (${child.path || 'no path'})`);
      });
    }
  });
  
  console.log('\n✅ Menu endpoint test complete!\n');
}

testMenuEndpoint().catch(console.error);

