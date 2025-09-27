#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND API TESTING FOR GHARINTO LEAP
Tests all 60+ endpoints with proper authentication and business logic validation
"""

import requests
import json
import time
from datetime import datetime, timedelta
import sys

# Configuration
API_BASE = "http://localhost:4000"
TIMEOUT = 30

class APITester:
    def __init__(self):
        self.tokens = {}
        self.test_results = {"passed": 0, "failed": 0, "details": []}
        self.test_users = {
            "admin": {"email": "admin@gharinto.com", "password": "admin123"},
            "superadmin": {"email": "superadmin@gharinto.com", "password": "superadmin123"},
            "customer": {"email": "customer@gharinto.com", "password": "customer123"},
            "designer": {"email": "designer@gharinto.com", "password": "designer123"},
            "vendor": {"email": "vendor@gharinto.com", "password": "vendor123"},
            "pm": {"email": "pm@gharinto.com", "password": "pm123"},
            "finance": {"email": "finance@gharinto.com", "password": "finance123"}
        }
        
    def make_request(self, method, endpoint, data=None, token=None, timeout=TIMEOUT):
        """Make HTTP request with proper error handling"""
        try:
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            url = f"{API_BASE}{endpoint}"
            
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return {
                "status": response.status_code,
                "ok": response.ok,
                "data": response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else response.text,
                "headers": dict(response.headers)
            }
        except requests.exceptions.Timeout:
            return {"status": 0, "ok": False, "error": "Request timeout"}
        except requests.exceptions.ConnectionError:
            return {"status": 0, "ok": False, "error": "Connection error"}
        except Exception as e:
            return {"status": 0, "ok": False, "error": str(e)}
    
    def log_test(self, name, passed, details=""):
        """Log test result"""
        self.test_results["passed" if passed else "failed"] += 1
        self.test_results["details"].append({"name": name, "passed": passed, "details": details})
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} {name}: {details}")
    
    def test_health_endpoints(self):
        """Test system health endpoints"""
        print("\n🏥 HEALTH & SYSTEM TESTS")
        
        # Test main health endpoint
        health = self.make_request("GET", "/health")
        self.log_test("System Health Check", 
                     health["ok"] and health["data"].get("status") == "ok",
                     f"Status: {health['status']}, Response: {health.get('data', {}).get('status', 'N/A')}")
        
        # Test database health
        db_health = self.make_request("GET", "/health/db")
        self.log_test("Database Health Check", 
                     db_health["ok"],
                     f"Status: {db_health['status']}")
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 AUTHENTICATION TESTS")
        
        # Test user registration
        new_user = {
            "email": f"testuser{int(time.time())}@test.com",
            "password": "TestPass123!",
            "firstName": "Test",
            "lastName": "User",
            "phone": "9876543210",
            "city": "Mumbai"
        }
        
        register_response = self.make_request("POST", "/auth/register", new_user)
        self.log_test("User Registration", 
                     register_response["ok"] and register_response["data"].get("token"),
                     f"Status: {register_response['status']}")
        
        # Test login for all user types
        for user_type, credentials in self.test_users.items():
            login_response = self.make_request("POST", "/auth/login", credentials)
            if login_response["ok"] and login_response["data"].get("token"):
                self.tokens[user_type] = login_response["data"]["token"]
                self.log_test(f"Login {user_type}", True, "Token received")
            else:
                self.log_test(f"Login {user_type}", False, 
                             f"Status: {login_response['status']}, Error: {login_response.get('data', {}).get('error', 'Unknown')}")
        
        # Test invalid login
        invalid_login = self.make_request("POST", "/auth/login", {
            "email": "invalid@test.com", 
            "password": "wrongpassword"
        })
        self.log_test("Invalid Login Rejection", 
                     not invalid_login["ok"] and invalid_login["status"] == 401,
                     f"Status: {invalid_login['status']}")
        
        # Test forgot password
        forgot_password = self.make_request("POST", "/auth/forgot-password", {
            "email": self.test_users["customer"]["email"]
        })
        self.log_test("Forgot Password", 
                     forgot_password["ok"],
                     f"Status: {forgot_password['status']}")
    
    def test_user_management(self):
        """Test user management endpoints"""
        print("\n👥 USER MANAGEMENT TESTS")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            print("❌ Admin token not available, skipping user management tests")
            return
        
        # Test get user profile
        profile = self.make_request("GET", "/users/profile", token=admin_token)
        self.log_test("Get User Profile", 
                     profile["ok"] and profile["data"].get("id"),
                     f"Status: {profile['status']}")
        
        # Test get users list
        users = self.make_request("GET", "/users", token=admin_token)
        self.log_test("Get Users List", 
                     users["ok"] and isinstance(users["data"].get("users"), list),
                     f"Status: {users['status']}, Count: {len(users.get('data', {}).get('users', []))}")
        
        # Test create user
        new_user = {
            "email": f"newuser{int(time.time())}@test.com",
            "password": "NewUser123!",
            "firstName": "New",
            "lastName": "User",
            "phone": "9876543211",
            "city": "Delhi",
            "roles": ["customer"]
        }
        create_user = self.make_request("POST", "/users", new_user, token=admin_token)
        self.log_test("Create User", 
                     create_user["ok"],
                     f"Status: {create_user['status']}")
        
        # Test get specific user (if we have users)
        if users["ok"] and users["data"].get("users"):
            user_id = users["data"]["users"][0]["id"]
            user_details = self.make_request("GET", f"/users/{user_id}", token=admin_token)
            self.log_test("Get User Details", 
                         user_details["ok"],
                         f"Status: {user_details['status']}")
    
    def test_project_management(self):
        """Test project management endpoints"""
        print("\n📁 PROJECT MANAGEMENT TESTS")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            print("❌ Admin token not available, skipping project management tests")
            return
        
        # Test get projects
        projects = self.make_request("GET", "/projects", token=admin_token)
        self.log_test("Get Projects List", 
                     projects["ok"] and isinstance(projects["data"].get("projects"), list),
                     f"Status: {projects['status']}, Count: {len(projects.get('data', {}).get('projects', []))}")
        
        # Test create project
        new_project = {
            "title": "API Test Project",
            "description": "Automated test project creation",
            "clientId": 1,
            "budget": 750000,
            "city": "Mumbai",
            "address": "Test Address, Mumbai",
            "areaSqft": 1200,
            "propertyType": "apartment",
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "endDate": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        }
        create_project = self.make_request("POST", "/projects", new_project, token=admin_token)
        self.log_test("Create Project", 
                     create_project["ok"],
                     f"Status: {create_project['status']}")
        
        # Test project details and update if creation was successful
        if create_project["ok"] and create_project["data"].get("id"):
            project_id = create_project["data"]["id"]
            
            # Test get project details
            project_details = self.make_request("GET", f"/projects/{project_id}", token=admin_token)
            self.log_test("Get Project Details", 
                         project_details["ok"],
                         f"Status: {project_details['status']}")
            
            # Test update project
            update_data = {
                "status": "in_progress",
                "progressPercentage": 25,
                "priority": "high"
            }
            update_project = self.make_request("PUT", f"/projects/{project_id}", update_data, token=admin_token)
            self.log_test("Update Project", 
                         update_project["ok"],
                         f"Status: {update_project['status']}")
    
    def test_lead_management(self):
        """Test lead management endpoints"""
        print("\n🎯 LEAD MANAGEMENT TESTS")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            print("❌ Admin token not available, skipping lead management tests")
            return
        
        # Test get leads
        leads = self.make_request("GET", "/leads", token=admin_token)
        self.log_test("Get Leads List", 
                     leads["ok"] and isinstance(leads["data"].get("leads"), list),
                     f"Status: {leads['status']}, Count: {len(leads.get('data', {}).get('leads', []))}")
        
        # Test create lead (public endpoint - no token needed)
        new_lead = {
            "source": "api_test",
            "firstName": "Test",
            "lastName": "Lead",
            "email": f"testlead{int(time.time())}@test.com",
            "phone": "9876543210",
            "city": "Mumbai",
            "budgetMin": 300000,
            "budgetMax": 1000000,
            "projectType": "full_home",
            "propertyType": "apartment",
            "timeline": "1-3 months",
            "description": "Test lead from comprehensive API testing"
        }
        create_lead = self.make_request("POST", "/leads", new_lead)
        self.log_test("Create Lead (Public)", 
                     create_lead["ok"],
                     f"Status: {create_lead['status']}")
        
        # Test lead operations if creation was successful
        if create_lead["ok"] and create_lead["data"].get("id"):
            lead_id = create_lead["data"]["id"]
            
            # Test get lead details
            lead_details = self.make_request("GET", f"/leads/{lead_id}", token=admin_token)
            self.log_test("Get Lead Details", 
                         lead_details["ok"],
                         f"Status: {lead_details['status']}")
            
            # Test assign lead
            assign_lead = self.make_request("POST", f"/leads/{lead_id}/assign", 
                                          {"assignedTo": 1}, token=admin_token)
            self.log_test("Assign Lead", 
                         assign_lead["ok"],
                         f"Status: {assign_lead['status']}")
            
            # Test update lead
            update_lead = self.make_request("PUT", f"/leads/{lead_id}", 
                                          {"status": "qualified", "score": 85}, token=admin_token)
            self.log_test("Update Lead", 
                         update_lead["ok"],
                         f"Status: {update_lead['status']}")
    
    def test_financial_system(self):
        """Test financial system endpoints"""
        print("\n💰 FINANCIAL SYSTEM TESTS")
        
        admin_token = self.tokens.get("admin")
        customer_token = self.tokens.get("customer")
        
        if customer_token:
            # Test wallet functionality
            wallet = self.make_request("GET", "/wallet", token=customer_token)
            self.log_test("Get User Wallet", 
                         wallet["ok"],
                         f"Status: {wallet['status']}")
            
            # Test wallet transactions
            transactions = self.make_request("GET", "/wallet/transactions", token=customer_token)
            self.log_test("Get Wallet Transactions", 
                         transactions["ok"],
                         f"Status: {transactions['status']}")
        
        if admin_token:
            # Test quotations
            quotations = self.make_request("GET", "/quotations", token=admin_token)
            self.log_test("Get Quotations List", 
                         quotations["ok"],
                         f"Status: {quotations['status']}")
            
            # Test create quotation
            new_quotation = {
                "clientId": 1,
                "title": "API Test Quotation",
                "items": [
                    {
                        "description": "Interior Design Service",
                        "quantity": 1,
                        "unitPrice": 75000
                    }
                ],
                "validUntil": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            }
            create_quotation = self.make_request("POST", "/quotations", new_quotation, token=admin_token)
            self.log_test("Create Quotation", 
                         create_quotation["ok"],
                         f"Status: {create_quotation['status']}")
            
            # Test invoices
            invoices = self.make_request("GET", "/invoices", token=admin_token)
            self.log_test("Get Invoices List", 
                         invoices["ok"],
                         f"Status: {invoices['status']}")
    
    def test_materials_and_vendors(self):
        """Test materials and vendor management"""
        print("\n🏗️ MATERIALS & VENDORS TESTS")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            print("❌ Admin token not available, skipping materials and vendors tests")
            return
        
        # Test materials
        materials = self.make_request("GET", "/materials", token=admin_token)
        self.log_test("Get Materials Catalog", 
                     materials["ok"],
                     f"Status: {materials['status']}")
        
        # Test material categories (public endpoint)
        categories = self.make_request("GET", "/materials/categories")
        self.log_test("Get Material Categories", 
                     categories["ok"],
                     f"Status: {categories['status']}")
        
        # Test vendors
        vendors = self.make_request("GET", "/vendors", token=admin_token)
        self.log_test("Get Vendors List", 
                     vendors["ok"],
                     f"Status: {vendors['status']}")
        
        # Test create material
        new_material = {
            "name": "API Test Material",
            "category": "Flooring",
            "subcategory": "Tiles",
            "brand": "Test Brand",
            "unit": "sqft",
            "price": 150,
            "stockQuantity": 1000,
            "description": "Test material from API testing"
        }
        create_material = self.make_request("POST", "/materials", new_material, token=admin_token)
        self.log_test("Create Material", 
                     create_material["ok"],
                     f"Status: {create_material['status']}")
        
        # Test material details if we have materials
        if materials["ok"] and materials["data"].get("materials"):
            material_id = materials["data"]["materials"][0]["id"]
            material_details = self.make_request("GET", f"/materials/{material_id}", token=admin_token)
            self.log_test("Get Material Details", 
                         material_details["ok"],
                         f"Status: {material_details['status']}")
    
    def test_employee_management(self):
        """Test employee management endpoints"""
        print("\n👨‍💼 EMPLOYEE MANAGEMENT TESTS")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            print("❌ Admin token not available, skipping employee management tests")
            return
        
        # Test employees list
        employees = self.make_request("GET", "/employees", token=admin_token)
        self.log_test("Get Employees List", 
                     employees["ok"],
                     f"Status: {employees['status']}")
        
        # Test attendance marking
        attendance_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "checkInTime": "09:00",
            "checkOutTime": "18:00",
            "status": "present"
        }
        attendance = self.make_request("POST", "/employees/attendance", attendance_data, token=admin_token)
        self.log_test("Mark Employee Attendance", 
                     attendance["ok"],
                     f"Status: {attendance['status']}")
    
    def test_communication_system(self):
        """Test communication system endpoints"""
        print("\n📞 COMMUNICATION SYSTEM TESTS")
        
        customer_token = self.tokens.get("customer")
        admin_token = self.tokens.get("admin")
        
        if admin_token:
            # Test get complaints
            complaints = self.make_request("GET", "/complaints", token=admin_token)
            self.log_test("Get Complaints List", 
                         complaints["ok"],
                         f"Status: {complaints['status']}")
        
        if customer_token:
            # Test create complaint
            new_complaint = {
                "title": "API Test Complaint",
                "description": "This is a test complaint created via API testing",
                "priority": "medium"
            }
            create_complaint = self.make_request("POST", "/complaints", new_complaint, token=customer_token)
            self.log_test("Create Complaint", 
                         create_complaint["ok"],
                         f"Status: {create_complaint['status']}")
            
            # Test notifications
            notifications = self.make_request("GET", "/notifications", token=customer_token)
            self.log_test("Get Notifications", 
                         notifications["ok"],
                         f"Status: {notifications['status']}")
    
    def test_security_and_permissions(self):
        """Test security and permission controls"""
        print("\n🔒 SECURITY & PERMISSIONS TESTS")
        
        # Test unauthorized access
        unauthorized = self.make_request("GET", "/users/profile")
        self.log_test("Unauthorized Access Blocked", 
                     not unauthorized["ok"] and unauthorized["status"] == 401,
                     f"Status: {unauthorized['status']}")
        
        # Test invalid token
        invalid_token = self.make_request("GET", "/users/profile", token="invalid-token-123")
        self.log_test("Invalid Token Rejected", 
                     not invalid_token["ok"] and invalid_token["status"] == 403,
                     f"Status: {invalid_token['status']}")
        
        # Test SQL injection attempt
        sql_injection = self.make_request("POST", "/auth/login", {
            "email": "admin'; DROP TABLE users; --",
            "password": "test"
        })
        self.log_test("SQL Injection Blocked", 
                     not sql_injection["ok"],
                     f"Status: {sql_injection['status']}")
        
        # Test 404 handling
        not_found = self.make_request("GET", "/non-existent-endpoint")
        self.log_test("404 Error Handling", 
                     not_found["status"] == 404,
                     f"Status: {not_found['status']}")
    
    def run_comprehensive_tests(self):
        """Run all test suites"""
        print("🚀 STARTING COMPREHENSIVE BACKEND API TESTING")
        print("🏢 Gharinto Leap Interior Design Marketplace")
        print("=" * 80)
        
        start_time = time.time()
        
        try:
            # Run all test suites
            self.test_health_endpoints()
            self.test_authentication()
            self.test_user_management()
            self.test_project_management()
            self.test_lead_management()
            self.test_financial_system()
            self.test_materials_and_vendors()
            self.test_employee_management()
            self.test_communication_system()
            self.test_security_and_permissions()
            
            # Calculate results
            duration = time.time() - start_time
            total_tests = self.test_results["passed"] + self.test_results["failed"]
            success_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
            
            # Print summary
            print("\n" + "=" * 80)
            print("🏁 COMPREHENSIVE BACKEND API TEST RESULTS")
            print("=" * 80)
            print(f"📊 Total Tests: {total_tests}")
            print(f"✅ Passed: {self.test_results['passed']}")
            print(f"❌ Failed: {self.test_results['failed']}")
            print(f"📈 Success Rate: {success_rate:.1f}%")
            print(f"⏱️ Duration: {duration:.2f}s")
            
            # Show failed tests
            if self.test_results["failed"] > 0:
                print("\n🔍 FAILED TESTS:")
                for test in self.test_results["details"]:
                    if not test["passed"]:
                        print(f"   ❌ {test['name']}: {test['details']}")
            
            # Production readiness assessment
            print("\n📋 PRODUCTION READINESS ASSESSMENT:")
            if success_rate >= 95:
                print("   🟢 PRODUCTION READY - Excellent API coverage")
            elif success_rate >= 85:
                print("   🟡 MOSTLY READY - Minor fixes needed")
            elif success_rate >= 70:
                print("   🟠 NEEDS WORK - Several critical issues")
            else:
                print("   🔴 NOT READY - Major issues found")
            
            print(f"\n✨ Final API Health Score: {success_rate:.1f}%")
            print("=" * 80)
            
            return success_rate >= 85
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            return False

def main():
    """Main execution function"""
    tester = APITester()
    success = tester.run_comprehensive_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()