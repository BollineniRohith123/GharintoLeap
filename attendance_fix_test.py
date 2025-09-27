#!/usr/bin/env python3
"""
Test to fix the employee attendance endpoint
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE = "http://localhost:4000"

def test_attendance_fix():
    # Login as admin
    login_response = requests.post(f"{API_BASE}/auth/login", json={
        "email": "admin@gharinto.com",
        "password": "admin123"
    })
    
    if not login_response.ok:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Test with proper timestamp format
    today = datetime.now()
    check_in_timestamp = today.replace(hour=9, minute=0, second=0, microsecond=0)
    check_out_timestamp = today.replace(hour=18, minute=0, second=0, microsecond=0)
    
    attendance_data = {
        "date": today.strftime("%Y-%m-%d"),
        "checkInTime": check_in_timestamp.isoformat(),
        "checkOutTime": check_out_timestamp.isoformat(),
        "status": "present"
    }
    
    print("🧪 Testing attendance with full timestamp format:")
    print(f"   Date: {attendance_data['date']}")
    print(f"   Check-in: {attendance_data['checkInTime']}")
    print(f"   Check-out: {attendance_data['checkOutTime']}")
    
    response = requests.post(f"{API_BASE}/employees/attendance", 
                           json=attendance_data, 
                           headers=headers)
    
    print(f"\n📊 Response Status: {response.status_code}")
    if response.content:
        try:
            response_data = response.json()
            print(f"📄 Response Data: {json.dumps(response_data, indent=2)}")
        except:
            print(f"📄 Response Text: {response.text}")
    
    if response.ok:
        print("✅ Attendance endpoint working with proper timestamp format!")
    else:
        print("❌ Attendance endpoint still failing")
        
        # Try alternative format - just date + time
        print("\n🧪 Testing with date + time format:")
        attendance_data_alt = {
            "date": today.strftime("%Y-%m-%d"),
            "checkInTime": f"{today.strftime('%Y-%m-%d')} 09:00:00",
            "checkOutTime": f"{today.strftime('%Y-%m-%d')} 18:00:00",
            "status": "present"
        }
        
        print(f"   Check-in: {attendance_data_alt['checkInTime']}")
        print(f"   Check-out: {attendance_data_alt['checkOutTime']}")
        
        response2 = requests.post(f"{API_BASE}/employees/attendance", 
                               json=attendance_data_alt, 
                               headers=headers)
        
        print(f"\n📊 Alternative Response Status: {response2.status_code}")
        if response2.content:
            try:
                response_data2 = response2.json()
                print(f"📄 Alternative Response Data: {json.dumps(response_data2, indent=2)}")
            except:
                print(f"📄 Alternative Response Text: {response2.text}")
        
        if response2.ok:
            print("✅ Attendance endpoint working with date + time format!")
        else:
            print("❌ Both timestamp formats failed")

if __name__ == "__main__":
    test_attendance_fix()