"""
Script to test login functionality
"""
import requests
from database import SessionLocal
from models import User

# Test credentials
TEST_USER = "Kunal1@gmail.com"
TEST_PASSWORD = "123"

# Local API URL
API_URL = "http://backend:8000/api/users/login"

def test_login():
    print("\n" + "="*60)
    print("LOGIN TESTING")
    print("="*60)
    
    # Step 1: Verify user exists
    print("\n[Step 1] Verifying user exists in database...")
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_USER).first()
    if user:
        print(f"✓ User found: {user.email}")
        print(f"   • Is active: {user.is_active}")
        print(f"   • Is verified: {user.is_verified}")
    else:
        print(f"✗ User {TEST_USER} not found")
        return
    
    # Step 2: Test login API
    print("\n[Step 2] Testing login API...")
    try:
        response = requests.post(
            API_URL,
            data={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        print(f"✓ API Response: {response.status_code}")
        if response.status_code == 200:
            print("✓ Login successful!")
            print(f"   • Access Token: {response.json().get('access_token')[:30]}...")
        else:
            print(f"✗ Login failed: {response.text}")
    except Exception as e:
        print(f"✗ API Error: {str(e)}")
    
    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("1. If login successful: Test in frontend")
    print("2. If failed: Check backend auth logic")
    print("3. Verify password hashing algorithm")
    print()

if __name__ == "__main__":
    test_login()
