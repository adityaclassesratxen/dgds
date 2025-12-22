"""
Comprehensive fix for login issues and tenant setup
"""
from database import SessionLocal, engine
from models import Base, Tenant, User, Customer, Driver, Dispatcher, RideTransaction
from auth import get_password_hash
from seed_data import run_seed

def setup_default_tenants():
    """Create DEMO and DGDS tenants if they don't exist"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("SETTING UP DEFAULT TENANTS")
        print("="*70)
        
        # Check and create DEMO tenant
        demo_tenant = db.query(Tenant).filter(Tenant.code == "DEMO").first()
        if not demo_tenant:
            demo_tenant = Tenant(
                name="Demo Client",
                code="DEMO",
                description="Demo tenant with seeded data for client demonstrations",
                is_active=True
            )
            db.add(demo_tenant)
            db.commit()
            db.refresh(demo_tenant)
            print("✓ Created DEMO tenant")
        else:
            print("✓ DEMO tenant already exists")
        
        # Check and create DGDS tenant
        dgds_tenant = db.query(Tenant).filter(Tenant.code == "DGDS").first()
        if not dgds_tenant:
            dgds_tenant = Tenant(
                name="DGDS Client",
                code="DGDS",
                description="DGDS production tenant for UAT",
                is_active=True
            )
            db.add(dgds_tenant)
            db.commit()
            db.refresh(dgds_tenant)
            print("✓ Created DGDS tenant")
        else:
            print("✓ DGDS tenant already exists")
        
        # Check if DEMO has data
        demo_customers = db.query(Customer).filter(Customer.tenant_id == demo_tenant.id).count()
        if demo_customers == 0:
            print("\n✓ Seeding DEMO tenant with test data...")
            run_seed("DEMO")
        else:
            print(f"✓ DEMO tenant already has {demo_customers} customers")
        
        # Verify DGDS is empty
        dgds_customers = db.query(Customer).filter(Customer.tenant_id == dgds_tenant.id).count()
        print(f"✓ DGDS tenant has {dgds_customers} customers (should be 0)")
        
        return demo_tenant.id, dgds_tenant.id
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()

def fix_user_passwords():
    """Fix any users with invalid password hashes"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("CHECKING USER PASSWORDS")
        print("="*70)
        
        users = db.query(User).all()
        fixed_count = 0
        
        for user in users:
            # Check if password hash is valid (bcrypt hashes start with $2b$)
            if not user.password_hash.startswith('$2b$'):
                print(f"⚠ Fixing invalid password hash for: {user.email}")
                # Set a default password that user can change
                user.password_hash = get_password_hash("password123")
                fixed_count += 1
        
        if fixed_count > 0:
            db.commit()
            print(f"✓ Fixed {fixed_count} user password(s)")
            print("  Default password set to: password123")
        else:
            print("✓ All user passwords are valid")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

def create_super_admin():
    """Ensure super admin exists"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("CHECKING SUPER ADMIN")
        print("="*70)
        
        # Check for existing super admin
        super_admin = db.query(User).filter(
            User.role == 'SUPER_ADMIN',
            User.email == 'superadmin@demo.com'
        ).first()
        
        if not super_admin:
            super_admin = User(
                email='superadmin@demo.com',
                password_hash=get_password_hash('admin123'),
                role='SUPER_ADMIN',
                is_active=True,
                is_verified=True,
                tenant_id=None
            )
            db.add(super_admin)
            db.commit()
            print("✓ Created super admin")
            print("  Email: superadmin@demo.com")
            print("  Password: admin123")
        else:
            print("✓ Super admin already exists")
            print("  Email: superadmin@demo.com")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

def main():
    print("\n" + "="*70)
    print("SYSTEM INITIALIZATION")
    print("="*70)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Step 1: Setup default tenants
    demo_id, dgds_id = setup_default_tenants()
    
    # Step 2: Fix user passwords
    fix_user_passwords()
    
    # Step 3: Ensure super admin exists
    create_super_admin()
    
    print("\n" + "="*70)
    print("INITIALIZATION COMPLETE")
    print("="*70)
    print("\n📊 System Status:")
    print("  • DEMO tenant: Ready with test data")
    print("  • DGDS tenant: Ready (empty for UAT)")
    print("  • Super admin: Available")
    print("\n🔑 Login Credentials:")
    print("  Super Admin:")
    print("    Email: superadmin@demo.com")
    print("    Password: admin123")
    print("\n  If your custom login fails:")
    print("    Try password: password123")
    print("\n💡 Next Steps:")
    print("  1. Login as super admin")
    print("  2. Access tenant dropdown in sidebar")
    print("  3. Switch between DEMO and DGDS")
    print("  4. Use tenant CRUD to create new tenants")
    print()

if __name__ == "__main__":
    main()
