import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';

async function testHealthCheck() {
  try {
    console.log('🔍 Testing API Health Check...');
    const response = await fetch(`${API_BASE}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health Check: PASSED');
      console.log('📊 Response:', data);
      return true;
    } else {
      console.log(`❌ Health Check: FAILED - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Health Check: ERROR - ${error.message}`);
    console.log('⚠️  Server might not be running on port 4000');
    return false;
  }
}

async function runBasicTests() {
  console.log('🚀 Running Basic API Tests...');
  const healthOk = await testHealthCheck();
  
  if (!healthOk) {
    console.log('\n📋 Test Results: Server not accessible');
    console.log('💡 Recommendation: Start the backend server on port 4000');
    return;
  }
  
  console.log('\n📋 Basic connectivity test completed successfully!');
}

runBasicTests();