#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND API TESTING - GHARINTO INTERIORS MARKETPLACE
Testing Phase: Security & API Validation
Backend: TypeScript/Encore Mock Server (Port 4000)
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Tuple

# Configuration
API_BASE = 'http://localhost:4000'
FRONTEND_ORIGIN = 'http://localhost:5173'

# Test Users matching database records (from review request)
TEST_USERS = [
    {'email': 'admin@test.com', 'password': 'password123', 'role': 'Admin'},
    {'email': 'pm@test.com', 'password': 'password123', 'role': 'Project Manager'},
    {'email': 'designer@test.com', 'password': 'password123', 'role': 'Interior Designer'},
    {'email': 'customer@test.com', 'password': 'password123', 'role': 'Customer'},
    {'email': 'vendor@test.com', 'password': 'password123', 'role': 'Vendor'}
]

class Colors:
    INFO = '\033[36m'      # Cyan
    SUCCESS = '\033[32m'   # Green
    ERROR = '\033[31m'     # Red
    WARNING = '\033[33m'   # Yellow
    CRITICAL = '\033[91m'  # Bright Red
    RESET = '\033[0m'

def log(message: str, level: str = 'info') -> None:
    """Enhanced logging with colors and timestamps"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    color = getattr(Colors, level.upper(), Colors.INFO)
    print(f"{color}[{timestamp}] {message}{Colors.RESET}")

def api_request(endpoint: str, method: str = 'GET', headers: Dict = None, data: Dict = None) -> Tuple[bool, Dict, int]:
    """Make API request with proper error handling"""
    url = f"{API_BASE}{endpoint}"
    
    default_headers = {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN
    }
    
    if headers:
        default_headers.update(headers)
    
    try:
        if method == 'POST':
            response = requests.post(url, headers=default_headers, json=data, timeout=10)
        else:
            response = requests.get(url, headers=default_headers, timeout=10)
        
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = {'error': 'Invalid JSON response', 'text': response.text}
        
        return response.ok, response_data, response.status_code
        
    except requests.exceptions.RequestException as e:
        return False, {'error': str(e)}, 0

class SecurityTester:
    """Dedicated class for security vulnerability testing"""
    
    def __init__(self):
        self.vulnerabilities = []
        self.valid_token = None
    
    def test_jwt_validation(self) -> Dict[str, Any]:
        """Test JWT token validation - CRITICAL SECURITY TEST"""
        log("🔒 TESTING JWT TOKEN VALIDATION (CRITICAL SECURITY)", 'critical')
        
        results = {
            'invalid_token_test': False,
            'malformed_token_test': False,
            'no_token_test': False,
            'expired_token_test': False,
            'vulnerabilities_found': []
        }
        
        # First get a valid token
        success, data, status = api_request('/auth/login', 'POST', data={
            'email': 'admin@test.com',
            'password': 'password123'
        })
        
        if success and 'token' in data:
            self.valid_token = data['token']
            log(f"✅ Valid token obtained: {self.valid_token[:20]}...", 'success')
        else:
            log("❌ Failed to obtain valid token for security testing", 'error')
            return results
        
        # Test 1: Invalid token should be rejected
        log("   Testing invalid token rejection...", 'info')
        success, data, status = api_request('/users/profile', headers={
            'Authorization': 'Bearer invalid-token-12345'
        })
        
        if success:
            log("   🚨 CRITICAL VULNERABILITY: Invalid token accepted!", 'critical')
            self.vulnerabilities.append("Invalid JWT tokens are accepted - Security breach!")
            results['vulnerabilities_found'].append("Invalid token acceptance")
        else:
            log("   ✅ Invalid token properly rejected", 'success')
            results['invalid_token_test'] = True
        
        # Test 2: Malformed token should be rejected
        log("   Testing malformed token rejection...", 'info')
        success, data, status = api_request('/users/profile', headers={
            'Authorization': 'Bearer malformed.token.here'
        })
        
        if success:
            log("   🚨 CRITICAL VULNERABILITY: Malformed token accepted!", 'critical')
            self.vulnerabilities.append("Malformed JWT tokens are accepted")
            results['vulnerabilities_found'].append("Malformed token acceptance")
        else:
            log("   ✅ Malformed token properly rejected", 'success')
            results['malformed_token_test'] = True
        
        # Test 3: No token should be rejected
        log("   Testing no token rejection...", 'info')
        success, data, status = api_request('/users/profile')
        
        if success:
            log("   🚨 SECURITY ISSUE: No token required for protected endpoint!", 'critical')
            self.vulnerabilities.append("Protected endpoints accessible without authentication")
            results['vulnerabilities_found'].append("No authentication required")
        else:
            log("   ✅ No token properly rejected", 'success')
            results['no_token_test'] = True
        
        # Test 4: Empty Bearer token
        log("   Testing empty Bearer token...", 'info')
        success, data, status = api_request('/users/profile', headers={
            'Authorization': 'Bearer '
        })
        
        if success:
            log("   🚨 VULNERABILITY: Empty Bearer token accepted!", 'critical')
            self.vulnerabilities.append("Empty Bearer tokens are accepted")
            results['vulnerabilities_found'].append("Empty Bearer token acceptance")
        else:
            log("   ✅ Empty Bearer token properly rejected", 'success')
        
        return results
    
    def test_cors_configuration(self) -> Dict[str, Any]:
        """Test CORS configuration"""
        log("🌐 TESTING CORS CONFIGURATION", 'warning')
        
        results = {'cors_properly_configured': False}
        
        # Test with different origins
        test_origins = [
            'http://malicious-site.com',
            'https://evil.com',
            'http://localhost:3000'  # Different port
        ]
        
        for origin in test_origins:
            success, data, status = api_request('/auth/login', 'POST', 
                headers={'Origin': origin},
                data={'email': 'admin@test.com', 'password': 'password123'}
            )
            
            if success:
                log(f"   ⚠️  CORS allows origin: {origin}", 'warning')
            else:
                log(f"   ✅ CORS blocks origin: {origin}", 'success')
        
        return results

class APITester:
    """Main API testing class"""
    
    def __init__(self):
        self.test_results = {}
        self.security_tester = SecurityTester()
        self.primary_token = None
    
    def test_authentication_endpoints(self) -> Dict[str, Any]:
        """Test authentication for all user types"""
        log("🔐 TESTING AUTHENTICATION ENDPOINTS", 'warning')
        
        results = {'users_tested': 0, 'successful_logins': 0, 'failed_logins': 0, 'user_results': {}}
        
        for user in TEST_USERS:
            log(f"   Testing {user['role']} ({user['email']})", 'info')
            
            success, data, status = api_request('/auth/login', 'POST', data={
                'email': user['email'],
                'password': user['password']
            })
            
            results['users_tested'] += 1
            user_result = {
                'success': success,
                'status_code': status,
                'has_token': 'token' in data if success else False,
                'has_user_data': 'user' in data if success else False
            }
            
            if success:
                results['successful_logins'] += 1
                log(f"   ✅ Login successful for {user['role']}", 'success')
                
                if 'token' in data:
                    log(f"   Token: {data['token'][:20]}...", 'info')
                    if not self.primary_token:
                        self.primary_token = data['token']
                
                if 'user' in data:
                    user_data = data['user']
                    log(f"   User ID: {user_data.get('id', 'N/A')}", 'info')
                    log(f"   Roles: {', '.join(user_data.get('roles', []))}", 'info')
                    log(f"   Permissions: {len(user_data.get('permissions', []))} permissions", 'info')
                    
                    user_result.update({
                        'user_id': user_data.get('id'),
                        'roles': user_data.get('roles', []),
                        'permissions_count': len(user_data.get('permissions', []))
                    })
            else:
                results['failed_logins'] += 1
                log(f"   ❌ Login failed for {user['role']} - Status: {status}", 'error')
                log(f"   Error: {data.get('error', 'Unknown error')}", 'error')
            
            results['user_results'][user['email']] = user_result
            print()
        
        return results
    
    def test_protected_endpoints(self) -> Dict[str, Any]:
        """Test all protected endpoints"""
        log("🛡️  TESTING PROTECTED ENDPOINTS", 'warning')
        
        if not self.primary_token:
            log("❌ No valid token available for protected endpoint testing", 'error')
            return {'error': 'No valid token'}
        
        endpoints = [
            ('/users/profile', 'User Profile'),
            ('/rbac/user-permissions', 'User Permissions'),
            ('/menus/user', 'User Menus'),
            ('/leads', 'Leads Management'),
            ('/analytics/dashboard', 'Analytics Dashboard')
        ]
        
        results = {'endpoints_tested': 0, 'successful_requests': 0, 'failed_requests': 0, 'endpoint_results': {}}
        
        for endpoint, name in endpoints:
            log(f"   Testing {name} ({endpoint})", 'info')
            
            success, data, status = api_request(endpoint, headers={
                'Authorization': f'Bearer {self.primary_token}'
            })
            
            results['endpoints_tested'] += 1
            endpoint_result = {
                'success': success,
                'status_code': status,
                'response_size': len(str(data)) if data else 0
            }
            
            if success:
                results['successful_requests'] += 1
                log(f"   ✅ {name} - SUCCESS", 'success')
                
                # Validate response structure based on endpoint
                if endpoint == '/users/profile':
                    required_fields = ['id', 'email', 'firstName', 'lastName', 'roles']
                    missing_fields = [field for field in required_fields if field not in data]
                    if missing_fields:
                        log(f"   ⚠️  Missing fields: {', '.join(missing_fields)}", 'warning')
                    else:
                        log(f"   ✅ All required profile fields present", 'success')
                
                elif endpoint == '/leads':
                    if 'leads' in data and 'total' in data:
                        log(f"   📊 Leads: {len(data['leads'])} of {data['total']} total", 'info')
                    else:
                        log(f"   ⚠️  Invalid leads response structure", 'warning')
                
                elif endpoint == '/analytics/dashboard':
                    analytics_fields = ['totalLeads', 'totalProjects', 'totalRevenue', 'activeProjects']
                    present_fields = [field for field in analytics_fields if field in data]
                    log(f"   📈 Analytics fields: {len(present_fields)}/{len(analytics_fields)}", 'info')
                
            else:
                results['failed_requests'] += 1
                log(f"   ❌ {name} - FAILED (Status: {status})", 'error')
                log(f"   Error: {data.get('error', 'Unknown error')}", 'error')
            
            results['endpoint_results'][endpoint] = endpoint_result
            print()
        
        return results
    
    def test_missing_endpoints(self) -> Dict[str, Any]:
        """Test for missing endpoints mentioned in issues"""
        log("🔍 TESTING MISSING ENDPOINTS", 'warning')
        
        missing_endpoints = [
            ('/health/db', 'Database Health Check'),
            ('/health', 'General Health Check')
        ]
        
        results = {'missing_endpoints': [], 'available_endpoints': []}
        
        for endpoint, name in missing_endpoints:
            log(f"   Testing {name} ({endpoint})", 'info')
            
            success, data, status = api_request(endpoint)
            
            if success:
                log(f"   ✅ {name} - AVAILABLE", 'success')
                results['available_endpoints'].append(endpoint)
                
                if endpoint == '/health':
                    if 'status' in data:
                        log(f"   Status: {data['status']}", 'info')
                    if 'timestamp' in data:
                        log(f"   Timestamp: {data['timestamp']}", 'info')
                        
            else:
                log(f"   ❌ {name} - MISSING (Status: {status})", 'error')
                results['missing_endpoints'].append(endpoint)
            
            print()
        
        return results
    
    def test_error_handling(self) -> Dict[str, Any]:
        """Test error handling and edge cases"""
        log("⚠️  TESTING ERROR HANDLING", 'warning')
        
        results = {'error_tests': []}
        
        # Test 1: Invalid login credentials
        log("   Testing invalid login credentials", 'info')
        success, data, status = api_request('/auth/login', 'POST', data={
            'email': 'invalid@example.com',
            'password': 'wrongpassword'
        })
        
        results['error_tests'].append({
            'test': 'invalid_credentials',
            'success': not success,  # Should fail
            'status_code': status,
            'proper_error_message': 'error' in data if data else False
        })
        
        if not success:
            log(f"   ✅ Invalid credentials properly rejected (Status: {status})", 'success')
        else:
            log(f"   ❌ Invalid credentials accepted - Security issue!", 'error')
        
        # Test 2: Malformed JSON
        log("   Testing malformed JSON handling", 'info')
        try:
            response = requests.post(f"{API_BASE}/auth/login", 
                headers={'Content-Type': 'application/json', 'Origin': FRONTEND_ORIGIN},
                data='{"invalid": json}',  # Malformed JSON
                timeout=10
            )
            
            if response.status_code == 400:
                log("   ✅ Malformed JSON properly handled", 'success')
            else:
                log(f"   ⚠️  Unexpected response to malformed JSON: {response.status_code}", 'warning')
                
        except Exception as e:
            log(f"   ⚠️  Exception handling malformed JSON: {str(e)}", 'warning')
        
        # Test 3: Non-existent endpoint
        log("   Testing non-existent endpoint", 'info')
        success, data, status = api_request('/nonexistent/endpoint')
        
        if status == 404:
            log("   ✅ Non-existent endpoint returns 404", 'success')
        else:
            log(f"   ⚠️  Unexpected response for non-existent endpoint: {status}", 'warning')
        
        return results
    
    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all tests and compile results"""
        log("🧪 STARTING COMPREHENSIVE BACKEND API TESTING", 'info')
        log("=" * 60, 'info')
        
        # Test 1: Security Testing (CRITICAL)
        self.test_results['security'] = self.security_tester.test_jwt_validation()
        self.test_results['cors'] = self.security_tester.test_cors_configuration()
        
        # Test 2: Authentication Testing
        self.test_results['authentication'] = self.test_authentication_endpoints()
        
        # Test 3: Protected Endpoints Testing
        self.test_results['protected_endpoints'] = self.test_protected_endpoints()
        
        # Test 4: Missing Endpoints Testing
        self.test_results['missing_endpoints'] = self.test_missing_endpoints()
        
        # Test 5: Error Handling Testing
        self.test_results['error_handling'] = self.test_error_handling()
        
        return self.test_results
    
    def generate_summary_report(self) -> None:
        """Generate comprehensive summary report"""
        log("📊 COMPREHENSIVE TEST SUMMARY REPORT", 'critical')
        log("=" * 60, 'info')
        
        # Critical Security Issues
        security_vulnerabilities = self.security_tester.vulnerabilities
        if security_vulnerabilities:
            log("🚨 CRITICAL SECURITY VULNERABILITIES FOUND:", 'critical')
            for i, vuln in enumerate(security_vulnerabilities, 1):
                log(f"   {i}. {vuln}", 'critical')
            print()
        else:
            log("✅ No critical security vulnerabilities found", 'success')
            print()
        
        # Authentication Summary
        auth_results = self.test_results.get('authentication', {})
        log(f"🔐 AUTHENTICATION TESTING:", 'warning')
        log(f"   Users Tested: {auth_results.get('users_tested', 0)}", 'info')
        log(f"   Successful Logins: {auth_results.get('successful_logins', 0)}", 'success')
        log(f"   Failed Logins: {auth_results.get('failed_logins', 0)}", 'error')
        print()
        
        # Protected Endpoints Summary
        protected_results = self.test_results.get('protected_endpoints', {})
        if 'error' not in protected_results:
            log(f"🛡️  PROTECTED ENDPOINTS TESTING:", 'warning')
            log(f"   Endpoints Tested: {protected_results.get('endpoints_tested', 0)}", 'info')
            log(f"   Successful Requests: {protected_results.get('successful_requests', 0)}", 'success')
            log(f"   Failed Requests: {protected_results.get('failed_requests', 0)}", 'error')
            print()
        
        # Missing Endpoints Summary
        missing_results = self.test_results.get('missing_endpoints', {})
        missing_endpoints = missing_results.get('missing_endpoints', [])
        if missing_endpoints:
            log(f"❌ MISSING ENDPOINTS:", 'error')
            for endpoint in missing_endpoints:
                log(f"   - {endpoint}", 'error')
            print()
        
        # Overall Assessment
        log("🎯 OVERALL ASSESSMENT:", 'warning')
        
        if security_vulnerabilities:
            log("   🚨 CRITICAL: Security vulnerabilities must be fixed before production", 'critical')
        
        if missing_endpoints:
            log(f"   ⚠️  {len(missing_endpoints)} missing endpoints identified", 'warning')
        
        success_rate = 0
        if protected_results and 'error' not in protected_results:
            total_tests = protected_results.get('endpoints_tested', 0)
            successful_tests = protected_results.get('successful_requests', 0)
            if total_tests > 0:
                success_rate = (successful_tests / total_tests) * 100
                log(f"   📈 API Success Rate: {success_rate:.1f}%", 'info')
        
        # Recommendations
        log("💡 RECOMMENDATIONS:", 'warning')
        log("   1. URGENT: Fix JWT token validation security vulnerability", 'critical')
        log("   2. Add missing /health/db endpoint for database monitoring", 'warning')
        log("   3. Implement proper JWT token validation with expiration", 'warning')
        log("   4. Add rate limiting for authentication endpoints", 'info')
        log("   5. Enhance error handling and logging", 'info')
        
        print()
        log("🏁 TESTING COMPLETED", 'success')

def main():
    """Main testing function"""
    try:
        tester = APITester()
        results = tester.run_comprehensive_tests()
        tester.generate_summary_report()
        
        # Return exit code based on critical issues
        if tester.security_tester.vulnerabilities:
            log("❌ TESTING FAILED: Critical security vulnerabilities found", 'critical')
            sys.exit(1)
        else:
            log("✅ TESTING COMPLETED: No critical security issues", 'success')
            sys.exit(0)
            
    except KeyboardInterrupt:
        log("⚠️  Testing interrupted by user", 'warning')
        sys.exit(1)
    except Exception as e:
        log(f"❌ Testing failed with error: {str(e)}", 'error')
        sys.exit(1)

if __name__ == "__main__":
    main()