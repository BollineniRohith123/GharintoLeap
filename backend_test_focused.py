#!/usr/bin/env python3
"""
FOCUSED BACKEND API TESTING FOR SPECIFIC FAILING ENDPOINTS
Tests the failing endpoints with proper data formats
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE = "http://localhost:4000"

def make_request(method, endpoint, data=None, token=None):
    """Make HTTP request with proper error handling"""
    try:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        url = f"{API_BASE}{endpoint}"
        
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return {
            "status": response.status_code,
            "ok": response.ok,
            "data": response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else response.text,
            "headers": dict(response.headers)
        }
    except Exception as e:
        return {"status": 0, "ok": False, "error": str(e)}

def get_admin_token():
    """Get admin token for testing"""
    login_response = make_request("POST", "/auth/login", {
        "email": "admin@gharinto.com",
        "password": "admin123"
    })
    if login_response["ok"]:
        return login_response["data"]["token"]
    return None

def test_failing_endpoints():
    """Test the specific failing endpoints with proper data"""
    print("🔍 FOCUSED TESTING OF FAILING ENDPOINTS")
    print("=" * 60)
    
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Could not get admin token")
        return
    
    print(f"✅ Admin token obtained")
    
    # Test 1: Update Project (was failing with 500)
    print("\n📁 Testing Project Update...")
    
    # First get a project to update
    projects = make_request("GET", "/projects", token=admin_token)
    if projects["ok"] and projects["data"].get("projects"):
        project_id = projects["data"]["projects"][0]["id"]
        
        # Try minimal update with only required fields
        update_data = {
            "title": "Updated Test Project",
            "description": "Updated description",
            "status": "in_progress"
        }
        
        update_result = make_request("PUT", f"/projects/{project_id}", update_data, token=admin_token)
        print(f"   Project Update: {'✅ PASSED' if update_result['ok'] else '❌ FAILED'} - Status: {update_result['status']}")
        if not update_result["ok"]:
            print(f"   Error: {update_result.get('data', {}).get('error', 'Unknown error')}")
    
    # Test 2: Update Lead (was failing with 500)
    print("\n🎯 Testing Lead Update...")
    
    leads = make_request("GET", "/leads", token=admin_token)
    if leads["ok"] and leads["data"].get("leads"):
        lead_id = leads["data"]["leads"][0]["id"]
        
        # Try minimal update with proper fields
        update_data = {
            "firstName": "Updated",
            "lastName": "Lead",
            "email": "updated@test.com",
            "phone": "9876543210",
            "city": "Mumbai",
            "status": "qualified"
        }
        
        update_result = make_request("PUT", f"/leads/{lead_id}", update_data, token=admin_token)
        print(f"   Lead Update: {'✅ PASSED' if update_result['ok'] else '❌ FAILED'} - Status: {update_result['status']}")
        if not update_result["ok"]:
            print(f"   Error: {update_result.get('data', {}).get('error', 'Unknown error')}")
    
    # Test 3: Wallet (was failing with 500)
    print("\n💰 Testing Wallet...")
    
    wallet = make_request("GET", "/wallet", token=admin_token)
    print(f"   Get Wallet: {'✅ PASSED' if wallet['ok'] else '❌ FAILED'} - Status: {wallet['status']}")
    if not wallet["ok"]:
        print(f"   Error: {wallet.get('data', {}).get('error', 'Unknown error')}")
    
    # Test 4: Create Quotation (was failing with 500)
    print("\n📋 Testing Quotation Creation...")
    
    quotation_data = {
        "clientId": 1,
        "title": "Test Quotation",
        "items": [
            {
                "description": "Test Item",
                "quantity": 1,
                "unitPrice": 50000
            }
        ],
        "validUntil": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    }
    
    quotation = make_request("POST", "/quotations", quotation_data, token=admin_token)
    print(f"   Create Quotation: {'✅ PASSED' if quotation['ok'] else '❌ FAILED'} - Status: {quotation['status']}")
    if not quotation["ok"]:
        print(f"   Error: {quotation.get('data', {}).get('error', 'Unknown error')}")
    
    # Test 5: Employee Management (was failing with 500)
    print("\n👨‍💼 Testing Employee Management...")
    
    employees = make_request("GET", "/employees", token=admin_token)
    print(f"   Get Employees: {'✅ PASSED' if employees['ok'] else '❌ FAILED'} - Status: {employees['status']}")
    if not employees["ok"]:
        print(f"   Error: {employees.get('data', {}).get('error', 'Unknown error')}")
    
    # Test 6: Employee Attendance with proper timestamp format
    print("\n⏰ Testing Employee Attendance...")
    
    now = datetime.now()
    attendance_data = {
        "date": now.strftime("%Y-%m-%d"),
        "checkInTime": now.replace(hour=9, minute=0, second=0).isoformat(),
        "checkOutTime": now.replace(hour=18, minute=0, second=0).isoformat(),
        "status": "present"
    }
    
    attendance = make_request("POST", "/employees/attendance", attendance_data, token=admin_token)
    print(f"   Mark Attendance: {'✅ PASSED' if attendance['ok'] else '❌ FAILED'} - Status: {attendance['status']}")
    if not attendance["ok"]:
        print(f"   Error: {attendance.get('data', {}).get('error', 'Unknown error')}")
    
    print("\n" + "=" * 60)
    print("🏁 FOCUSED TESTING COMPLETE")

if __name__ == "__main__":
    test_failing_endpoints()