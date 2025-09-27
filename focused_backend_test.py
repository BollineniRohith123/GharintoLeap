#!/usr/bin/env python3
"""
FOCUSED BACKEND API TESTING FOR PREVIOUSLY FAILING ENDPOINTS
Tests the 6 critical endpoints that were previously failing
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
API_BASE = "http://localhost:4000"
TIMEOUT = 30

class FocusedAPITester:
    def __init__(self):
        self.tokens = {}
        self.test_results = {"passed": 0, "failed": 0, "details": []}
        self.test_users = {
            "admin": {"email": "admin@gharinto.com", "password": "admin123"},
            "customer": {"email": "customer@gharinto.com", "password": "customer123"},
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
    
    def authenticate(self):
        """Authenticate users and get tokens"""
        print("🔐 AUTHENTICATING TEST USERS")
        for user_type, credentials in self.test_users.items():
            login_response = self.make_request("POST", "/auth/login", credentials)
            if login_response["ok"] and login_response["data"].get("token"):
                self.tokens[user_type] = login_response["data"]["token"]
                print(f"✅ {user_type} authenticated successfully")
            else:
                print(f"❌ {user_type} authentication failed: {login_response.get('data', {}).get('error', 'Unknown')}")
    
    def test_critical_failing_endpoints(self):
        """Test the 6 critical endpoints that were previously failing"""
        print("\n🔍 TESTING PREVIOUSLY FAILING CRITICAL ENDPOINTS")
        
        admin_token = self.tokens.get("admin")
        customer_token = self.tokens.get("customer")
        
        if not admin_token:
            print("❌ Admin token not available, skipping critical tests")
            return
        
        # 1. Test Update Project (PUT /projects/:id)
        print("\n1️⃣ Testing Update Project Endpoint")
        
        # First create a project to update
        new_project = {
            "title": "Critical Test Project",
            "description": "Project for testing update functionality",
            "clientId": 1,
            "budget": 500000,
            "city": "Mumbai",
            "address": "Test Address, Mumbai",
            "areaSqft": 1000,
            "propertyType": "apartment",
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "endDate": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        }
        
        create_response = self.make_request("POST", "/projects", new_project, token=admin_token)
        if create_response["ok"] and create_response["data"].get("id"):
            project_id = create_response["data"]["id"]
            print(f"✅ Project created successfully (ID: {project_id})")
            
            # Now test update
            update_data = {
                "title": "Updated Critical Test Project",
                "status": "in_progress",
                "progressPercentage": 25,
                "priority": "high",
                "budget": 600000
            }
            
            update_response = self.make_request("PUT", f"/projects/{project_id}", update_data, token=admin_token)
            self.log_test("Update Project (PUT /projects/:id)", 
                         update_response["ok"],
                         f"Status: {update_response['status']}, Response: {json.dumps(update_response.get('data', {}), indent=2) if update_response.get('data') else 'No data'}")
        else:
            self.log_test("Update Project (PUT /projects/:id)", False, 
                         f"Failed to create test project: Status {create_response['status']}")
        
        # 2. Test Update Lead (PUT /leads/:id)
        print("\n2️⃣ Testing Update Lead Endpoint")
        
        # First create a lead to update
        new_lead = {
            "source": "critical_test",
            "firstName": "Critical",
            "lastName": "Test",
            "email": f"criticaltest{int(time.time())}@test.com",
            "phone": "9876543210",
            "city": "Mumbai",
            "budgetMin": 300000,
            "budgetMax": 800000,
            "projectType": "full_home",
            "propertyType": "apartment",
            "timeline": "1-3 months",
            "description": "Critical test lead for update functionality"
        }
        
        create_lead_response = self.make_request("POST", "/leads", new_lead)
        if create_lead_response["ok"] and create_lead_response["data"].get("id"):
            lead_id = create_lead_response["data"]["id"]
            print(f"✅ Lead created successfully (ID: {lead_id})")
            
            # Now test update
            update_lead_data = {
                "status": "qualified",
                "score": 85,
                "budgetMax": 1000000,
                "timeline": "immediate"
            }
            
            update_lead_response = self.make_request("PUT", f"/leads/{lead_id}", update_lead_data, token=admin_token)
            self.log_test("Update Lead (PUT /leads/:id)", 
                         update_lead_response["ok"],
                         f"Status: {update_lead_response['status']}, Response: {json.dumps(update_lead_response.get('data', {}), indent=2) if update_lead_response.get('data') else 'No data'}")
        else:
            self.log_test("Update Lead (PUT /leads/:id)", False, 
                         f"Failed to create test lead: Status {create_lead_response['status']}")
        
        # 3. Test Get User Wallet (GET /wallet)
        print("\n3️⃣ Testing Get User Wallet Endpoint")
        if customer_token:
            wallet_response = self.make_request("GET", "/wallet", token=customer_token)
            self.log_test("Get User Wallet (GET /wallet)", 
                         wallet_response["ok"],
                         f"Status: {wallet_response['status']}, Response: {json.dumps(wallet_response.get('data', {}), indent=2) if wallet_response.get('data') else 'No data'}")
        else:
            self.log_test("Get User Wallet (GET /wallet)", False, "Customer token not available")
        
        # 4. Test Create Quotation (POST /quotations)
        print("\n4️⃣ Testing Create Quotation Endpoint")
        quotation_data = {
            "clientId": 1,
            "title": "Critical Test Quotation",
            "items": [
                {
                    "description": "Interior Design Service - Critical Test",
                    "quantity": 1,
                    "unitPrice": 75000
                },
                {
                    "description": "Material Supply",
                    "quantity": 1,
                    "unitPrice": 25000
                }
            ],
            "validUntil": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        
        quotation_response = self.make_request("POST", "/quotations", quotation_data, token=admin_token)
        self.log_test("Create Quotation (POST /quotations)", 
                     quotation_response["ok"],
                     f"Status: {quotation_response['status']}, Response: {json.dumps(quotation_response.get('data', {}), indent=2) if quotation_response.get('data') else 'No data'}")
        
        # 5. Test Get Employees List (GET /employees)
        print("\n5️⃣ Testing Get Employees List Endpoint")
        employees_response = self.make_request("GET", "/employees", token=admin_token)
        self.log_test("Get Employees List (GET /employees)", 
                     employees_response["ok"],
                     f"Status: {employees_response['status']}, Count: {len(employees_response.get('data', {}).get('employees', []))}, Response: {json.dumps(employees_response.get('data', {}), indent=2) if employees_response.get('data') else 'No data'}")
        
        # 6. Test Mark Employee Attendance (POST /employees/attendance)
        print("\n6️⃣ Testing Mark Employee Attendance Endpoint")
        attendance_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "checkInTime": "09:00:00",  # Using proper timestamp format
            "checkOutTime": "18:00:00",
            "status": "present"
        }
        
        attendance_response = self.make_request("POST", "/employees/attendance", attendance_data, token=admin_token)
        self.log_test("Mark Employee Attendance (POST /employees/attendance)", 
                     attendance_response["ok"],
                     f"Status: {attendance_response['status']}, Response: {json.dumps(attendance_response.get('data', {}), indent=2) if attendance_response.get('data') else 'No data'}")
    
    def run_focused_tests(self):
        """Run focused tests on critical endpoints"""
        print("🎯 STARTING FOCUSED TESTING ON CRITICAL ENDPOINTS")
        print("🏢 Gharinto Leap Interior Design Marketplace")
        print("=" * 80)
        
        start_time = time.time()
        
        try:
            # Authenticate first
            self.authenticate()
            
            # Run critical endpoint tests
            self.test_critical_failing_endpoints()
            
            # Calculate results
            duration = time.time() - start_time
            total_tests = self.test_results["passed"] + self.test_results["failed"]
            success_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
            
            # Print summary
            print("\n" + "=" * 80)
            print("🏁 FOCUSED CRITICAL ENDPOINT TEST RESULTS")
            print("=" * 80)
            print(f"📊 Total Critical Tests: {total_tests}")
            print(f"✅ Passed: {self.test_results['passed']}")
            print(f"❌ Failed: {self.test_results['failed']}")
            print(f"📈 Success Rate: {success_rate:.1f}%")
            print(f"⏱️ Duration: {duration:.2f}s")
            
            # Show failed tests
            if self.test_results["failed"] > 0:
                print("\n🔍 FAILED CRITICAL TESTS:")
                for test in self.test_results["details"]:
                    if not test["passed"]:
                        print(f"   ❌ {test['name']}: {test['details']}")
            
            # Show passed tests
            if self.test_results["passed"] > 0:
                print("\n✅ PASSED CRITICAL TESTS:")
                for test in self.test_results["details"]:
                    if test["passed"]:
                        print(f"   ✅ {test['name']}")
            
            print(f"\n✨ Critical Endpoints Health Score: {success_rate:.1f}%")
            print("=" * 80)
            
            return success_rate >= 85
            
        except Exception as e:
            print(f"❌ Focused test suite failed with error: {str(e)}")
            return False

def main():
    """Main execution function"""
    tester = FocusedAPITester()
    success = tester.run_focused_tests()
    return success

if __name__ == "__main__":
    main()