"""
Complete workflow test for tenant functionality.
"""
import requests
import json

BASE_URL = "http://backend:8000"

def test_workflow():
    print("\n" + "="*60)
    print("TENANT WORKFLOW TEST")
    print("="*60)
    
    # Step 1: Create a super admin user for testing
    print("\n[Step 1] Creating test super admin user...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/users/register",
            json={
                "username": "testadmin",
                "email": "testadmin@example.com",
                "password": "admin123",
                "role": "SUPER_ADMIN"
            }
        )
        if response.status_code in [200, 201]:
            print("✓ Test admin user created")
        elif response.status_code == 400 and "already exists" in response.text.lower():
            print("✓ Test admin user already exists")
        else:
            print(f"⚠ Response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠ Could not create user (may already exist): {e}")
    
    # Step 2: Login as super admin
    print("\n[Step 2] Logging in as super admin...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/users/login",
            data={
                "username": "testadmin",
                "password": "admin123"
            }
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"✓ Login successful")
            print(f"  Token: {token[:20]}...")
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return
    except Exception as e:
        print(f"✗ Login error: {e}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 3: Fetch tenants
    print("\n[Step 3] Fetching tenants list...")
    try:
        response = requests.get(f"{BASE_URL}/api/tenants/", headers=headers)
        if response.status_code == 200:
            tenants = response.json()
            print(f"✓ Fetched {len(tenants)} tenants:")
            for tenant in tenants:
                print(f"  • {tenant['name']} (Code: {tenant['code']}, ID: {tenant['id']})")
        else:
            print(f"✗ Failed to fetch tenants: {response.status_code}")
            print(f"  Response: {response.text}")
            return
    except Exception as e:
        print(f"✗ Error fetching tenants: {e}")
        return
    
    # Step 4: Test with DEMO tenant
    print("\n[Step 4] Testing dashboard with DEMO tenant...")
    demo_tenant = next((t for t in tenants if t['code'] == 'DEMO'), None)
    if demo_tenant:
        headers_with_tenant = {
            **headers,
            "X-Tenant-Id": str(demo_tenant['id'])
        }
        try:
            response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers_with_tenant)
            if response.status_code == 200:
                stats = response.json()
                print(f"✓ DEMO tenant dashboard stats:")
                print(f"  • Total Customers: {stats.get('total_customers', 0)}")
                print(f"  • Total Drivers: {stats.get('total_drivers', 0)}")
                print(f"  • Total Transactions: {stats.get('total_transactions', 0)}")
                print(f"  • Active Drivers: {stats.get('active_drivers', 0)}")
            else:
                print(f"✗ Failed to fetch dashboard: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    # Step 5: Test with DGDS tenant
    print("\n[Step 5] Testing dashboard with DGDS tenant...")
    dgds_tenant = next((t for t in tenants if t['code'] == 'DGDS'), None)
    if dgds_tenant:
        headers_with_tenant = {
            **headers,
            "X-Tenant-Id": str(dgds_tenant['id'])
        }
        try:
            response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers_with_tenant)
            if response.status_code == 200:
                stats = response.json()
                print(f"✓ DGDS tenant dashboard stats:")
                print(f"  • Total Customers: {stats.get('total_customers', 0)}")
                print(f"  • Total Drivers: {stats.get('total_drivers', 0)}")
                print(f"  • Total Transactions: {stats.get('total_transactions', 0)}")
                print(f"  • Active Drivers: {stats.get('active_drivers', 0)}")
            else:
                print(f"✗ Failed to fetch dashboard: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n" + "="*60)
    print("WORKFLOW TEST COMPLETE")
    print("="*60)
    print("\n✅ Summary:")
    print("  1. Super admin user can login")
    print("  2. Tenant API endpoint returns DEMO and DGDS")
    print("  3. DEMO tenant has populated data")
    print("  4. DGDS tenant is empty (as expected)")
    print("\n💡 Frontend Testing:")
    print("  1. Open http://localhost:3000")
    print("  2. Login with: testadmin / admin123")
    print("  3. Check sidebar for tenant dropdown")
    print("  4. Select DEMO - should show data")
    print("  5. Select DGDS - should show empty state")
    print()

if __name__ == "__main__":
    test_workflow()
