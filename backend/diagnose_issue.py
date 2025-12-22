"""
Diagnostic script to check tenant and user setup
"""
from database import SessionLocal
from models import Tenant, Customer, User, UserRole
from auth import get_password_hash

def main():
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("DIAGNOSTIC CHECK")
        print("="*70)
        
        # Check tenants
        print("\n1. TENANTS IN DATABASE:")
        tenants = db.query(Tenant).all()
        for t in tenants:
            print(f"   ✓ {t.name} (Code: {t.code}, ID: {t.id})")
            customers = db.query(Customer).filter_by(tenant_id=t.id).count()
            print(f"     → {customers} customers")
        
        # Check users
        print("\n2. USERS IN DATABASE:")
        users = db.query(User).all()
        if not users:
            print("   ⚠️  NO USERS FOUND!")
            print("   → You need to register a user with ADMIN or SUPER_ADMIN role")
        else:
            for u in users:
                print(f"   • {u.email} (Role: {u.role}, Tenant ID: {u.tenant_id})")
        
        # Check for admin users
        print("\n3. ADMIN/SUPER_ADMIN USERS:")
        admin_users = db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])
        ).all()
        
        if not admin_users:
            print("   ⚠️  NO ADMIN USERS FOUND!")
            print("   → Creating a test admin user...")
            
            # Create test admin user
            test_admin = User(
                email="admin@demo.com",
                password_hash=get_password_hash("admin123"),
                role=UserRole.SUPER_ADMIN,
                tenant_id=None,  # Super admin doesn't need tenant
                is_active=True,
                is_verified=True
            )
            db.add(test_admin)
            db.commit()
            print("   ✓ Created admin user:")
            print("      Email: admin@demo.com")
            print("      Password: admin123")
            print("      Role: SUPER_ADMIN")
        else:
            print("   ✓ Found admin users:")
            for u in admin_users:
                print(f"      • {u.email} (Role: {u.role})")
        
        print("\n" + "="*70)
        print("SOLUTION")
        print("="*70)
        print("\n📋 To see the tenant dropdown:")
        print("   1. Go to: http://localhost:2070")
        print("   2. Login with admin credentials:")
        if admin_users:
            print(f"      Email: {admin_users[0].email}")
            print("      Password: (use your password)")
        else:
            print("      Email: admin@demo.com")
            print("      Password: admin123")
        print("   3. After login, check LEFT SIDEBAR")
        print("   4. You should see 'Select Tenant' dropdown")
        print("\n⚠️  IMPORTANT:")
        print("   • Dropdown only shows for ADMIN/SUPER_ADMIN roles")
        print("   • If you're logged in as CUSTOMER/DRIVER, you won't see it")
        print("   • Refresh the page after login if needed")
        print()
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
