#!/usr/bin/env python3
"""
COMPREHENSIVE MARKETPLACE API TESTING
Testing for missing endpoints that should exist in an interior design marketplace
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE = 'http://localhost:4000'
FRONTEND_ORIGIN = 'http://localhost:5173'

# Get a valid token first
def get_valid_token():
    response = requests.post(f"{API_BASE}/auth/login", 
        headers={'Content-Type': 'application/json', 'Origin': FRONTEND_ORIGIN},
        json={'email': 'admin@test.com', 'password': 'password123'}
    )
    if response.ok:
        return response.json().get('token')
    return None

def test_endpoint(endpoint, method='GET', token=None, data=None):
    """Test if an endpoint exists and is accessible"""
    url = f"{API_BASE}{endpoint}"
    headers = {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN
    }
    
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=5)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data or {}, timeout=5)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=data or {}, timeout=5)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=5)
        
        return {
            'exists': response.status_code != 404,
            'status_code': response.status_code,
            'accessible': response.status_code < 500,
            'response_size': len(response.text) if response.text else 0
        }
    except Exception as e:
        return {
            'exists': False,
            'status_code': 0,
            'accessible': False,
            'error': str(e)
        }

def main():
    print("🏢 TESTING MARKETPLACE API ENDPOINTS")
    print("=" * 50)
    
    # Get authentication token
    token = get_valid_token()
    if not token:
        print("❌ Failed to get authentication token")
        return
    
    print(f"✅ Authentication token obtained")
    print()
    
    # Define expected marketplace endpoints
    marketplace_endpoints = [
        # Project Management
        ('/projects', 'GET', 'List all projects'),
        ('/projects', 'POST', 'Create new project'),
        ('/projects/1', 'GET', 'Get specific project'),
        ('/projects/1', 'PUT', 'Update project'),
        ('/projects/1', 'DELETE', 'Delete project'),
        
        # Lead Management (extended)
        ('/leads', 'POST', 'Create new lead'),
        ('/leads/1', 'GET', 'Get specific lead'),
        ('/leads/1', 'PUT', 'Update lead'),
        ('/leads/1/assign', 'POST', 'Assign lead to designer'),
        ('/leads/1/convert', 'POST', 'Convert lead to project'),
        
        # User Management
        ('/users', 'GET', 'List all users'),
        ('/users', 'POST', 'Create new user'),
        ('/users/1', 'GET', 'Get specific user'),
        ('/users/1', 'PUT', 'Update user'),
        ('/users/1', 'DELETE', 'Delete user'),
        
        # Materials Catalog
        ('/materials', 'GET', 'List materials'),
        ('/materials', 'POST', 'Create material'),
        ('/materials/categories', 'GET', 'Material categories'),
        ('/materials/1', 'GET', 'Get specific material'),
        ('/materials/1', 'PUT', 'Update material'),
        
        # Vendor Management
        ('/vendors', 'GET', 'List vendors'),
        ('/vendors', 'POST', 'Create vendor'),
        ('/vendors/1', 'GET', 'Get specific vendor'),
        ('/vendors/1', 'PUT', 'Update vendor'),
        ('/vendors/1/materials', 'GET', 'Vendor materials'),
        
        # Financial/Wallet
        ('/wallet', 'GET', 'User wallet info'),
        ('/transactions', 'GET', 'Transaction history'),
        ('/transactions', 'POST', 'Create transaction'),
        ('/payments', 'GET', 'Payment history'),
        ('/payments', 'POST', 'Process payment'),
        
        # File Management
        ('/files/upload', 'POST', 'Upload file'),
        ('/files', 'GET', 'List files'),
        ('/files/1', 'GET', 'Get specific file'),
        ('/files/1', 'DELETE', 'Delete file'),
        
        # Communications
        ('/messages', 'GET', 'List messages'),
        ('/messages', 'POST', 'Send message'),
        ('/messages/1', 'GET', 'Get specific message'),
        ('/conversations', 'GET', 'List conversations'),
        ('/conversations/1', 'GET', 'Get conversation'),
        
        # Notifications
        ('/notifications', 'GET', 'List notifications'),
        ('/notifications/1', 'PUT', 'Mark notification as read'),
        ('/notifications/mark-all-read', 'POST', 'Mark all as read'),
        
        # Advanced Analytics
        ('/analytics/leads', 'GET', 'Lead analytics'),
        ('/analytics/projects', 'GET', 'Project analytics'),
        ('/analytics/revenue', 'GET', 'Revenue analytics'),
        ('/analytics/users', 'GET', 'User analytics'),
        ('/analytics/export', 'GET', 'Export analytics'),
        
        # Settings & Configuration
        ('/settings', 'GET', 'Get settings'),
        ('/settings', 'PUT', 'Update settings'),
        ('/settings/company', 'GET', 'Company settings'),
        ('/settings/company', 'PUT', 'Update company settings'),
        
        # Search & Filtering
        ('/search', 'GET', 'Global search'),
        ('/search/projects', 'GET', 'Search projects'),
        ('/search/leads', 'GET', 'Search leads'),
        ('/search/users', 'GET', 'Search users'),
        
        # Reports
        ('/reports', 'GET', 'List reports'),
        ('/reports/leads', 'GET', 'Lead reports'),
        ('/reports/projects', 'GET', 'Project reports'),
        ('/reports/financial', 'GET', 'Financial reports'),
    ]
    
    # Test each endpoint
    existing_endpoints = []
    missing_endpoints = []
    
    for endpoint, method, description in marketplace_endpoints:
        print(f"Testing {method} {endpoint} - {description}")
        result = test_endpoint(endpoint, method, token)
        
        if result['exists']:
            existing_endpoints.append((endpoint, method, description, result))
            status = "✅ EXISTS"
            if result['status_code'] == 200:
                status += " & ACCESSIBLE"
            elif result['status_code'] == 401:
                status += " (Auth Required)"
            elif result['status_code'] == 403:
                status += " (Forbidden)"
            else:
                status += f" (Status: {result['status_code']})"
            print(f"  {status}")
        else:
            missing_endpoints.append((endpoint, method, description))
            print(f"  ❌ MISSING")
        print()
    
    # Summary Report
    print("📊 MARKETPLACE API COVERAGE REPORT")
    print("=" * 50)
    print(f"Total Endpoints Tested: {len(marketplace_endpoints)}")
    print(f"Existing Endpoints: {len(existing_endpoints)}")
    print(f"Missing Endpoints: {len(missing_endpoints)}")
    print(f"Coverage: {(len(existing_endpoints)/len(marketplace_endpoints)*100):.1f}%")
    print()
    
    if existing_endpoints:
        print("✅ EXISTING ENDPOINTS:")
        for endpoint, method, description, result in existing_endpoints:
            print(f"  {method} {endpoint} - {description} (Status: {result['status_code']})")
        print()
    
    if missing_endpoints:
        print("❌ MISSING ENDPOINTS (Should be implemented):")
        for endpoint, method, description in missing_endpoints:
            print(f"  {method} {endpoint} - {description}")
        print()
    
    # Critical Missing Features
    critical_missing = [
        ep for ep in missing_endpoints 
        if any(keyword in ep[0] for keyword in ['/projects', '/materials', '/vendors', '/files', '/messages'])
    ]
    
    if critical_missing:
        print("🚨 CRITICAL MISSING FEATURES:")
        for endpoint, method, description in critical_missing:
            print(f"  {method} {endpoint} - {description}")
        print()
    
    print("💡 RECOMMENDATIONS:")
    print("1. Implement project management endpoints for core marketplace functionality")
    print("2. Add materials catalog for interior design marketplace")
    print("3. Implement vendor management system")
    print("4. Add file upload/management for project assets")
    print("5. Implement messaging system for user communication")
    print("6. Add comprehensive search and filtering capabilities")
    print("7. Implement financial/wallet system for transactions")

if __name__ == "__main__":
    main()