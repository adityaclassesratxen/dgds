"""
Script to fix invalid password hash for Kunal1@gmail.com
"""
from database import SessionLocal
from models import User
from auth import get_password_hash

def main():
    print("\n" + "="*60)
    print("FIXING USER PASSWORD")
    print("="*60)
    
    db = SessionLocal()
    try:
        # Find user
        user = db.query(User).filter(User.email == "Kunal1@gmail.com").first()
        if not user:
            print("✗ User not found")
            return
            
        print(f"✓ Found user: {user.email}")
        print(f"   • Current hash: {user.password_hash}")
        
        # Generate proper hash
        new_hash = get_password_hash("123")
        print(f"   • New valid hash: {new_hash}")
        
        # Update password
        user.password_hash = new_hash
        db.commit()
        print("✓ Password updated successfully!")
        
        # Verify new password
        from auth import verify_password
        is_valid = verify_password("123", new_hash)
        print(f"   • Verification test: {'✓ SUCCESS' if is_valid else '✗ FAILED'}")
        
        print("\n" + "="*60)
        print("NEXT STEPS")
        print("="*60)
        print("1. Try logging in with Kunal1@gmail.com and password '123'")
        print("2. Test other login functionality")
        print("3. Verify registration process creates valid password hashes")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
