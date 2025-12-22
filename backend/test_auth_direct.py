"""
Directly test authentication without HTTP
"""
from database import SessionLocal
from models import User
from auth import verify_password

def test_authentication():
    print("\n" + "="*60)
    print("DIRECT AUTHENTICATION TEST")
    print("="*60)
    
    db = SessionLocal()
    
    try:
        # Get user
        user = db.query(User).filter(User.email == "Kunal1@gmail.com").first()
        if not user:
            print("✗ User not found")
            return
            
        print(f"✓ User found: {user.email}")
        
        # Test password verification
        print("\n[Step 1] Testing password '123'")
        is_valid = verify_password("123", user.password_hash)
        print(f"   • Password valid: {is_valid}")
        
        print("\n[Step 2] Testing password 'wrong'")
        is_valid = verify_password("wrong", user.password_hash)
        print(f"   • Password valid: {is_valid}")
        
        print("\n[Step 3] Testing password 'password'")
        is_valid = verify_password("password", user.password_hash)
        print(f"   • Password valid: {is_valid}")
        
        print("\n" + "="*60)
        print("CONCLUSION")
        print("="*60)
        if verify_password("123", user.password_hash):
            print("✓ Password verification works correctly")
            print("   • The issue is likely in the API layer, not authentication logic")
        else:
            print("✗ Password verification failed")
            print("   • Check password hashing during registration")
    finally:
        db.close()

if __name__ == "__main__":
    test_authentication()
