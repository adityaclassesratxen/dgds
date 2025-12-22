"""
Script to fix database schema and re-seed data properly
"""
from database import engine, Base, SessionLocal
from models import Driver, Dispatcher, Customer, Tenant
from sqlalchemy import text

def fix_database_schema():
    """Add missing columns to database tables"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("FIXING DATABASE SCHEMA")
        print("="*70)
        
        # Check and add is_active column to drivers table
        print("\n[1] Checking drivers table...")
        try:
            result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active'"))
            if not result.fetchone():
                print("   • Adding is_active column to drivers table...")
                db.execute(text("ALTER TABLE drivers ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL"))
                db.commit()
                print("   ✓ Added is_active column")
            else:
                print("   ✓ is_active column already exists")
        except Exception as e:
            print(f"   ✗ Error: {e}")
            db.rollback()
        
        # Check and add tenant_id columns if missing
        tables_to_check = [
            ('drivers', 'Driver'),
            ('dispatchers', 'Dispatcher'),
            ('customers', 'Customer'),
            ('customer_addresses', 'CustomerAddress'),
            ('driver_addresses', 'DriverAddress'),
            ('dispatcher_addresses', 'DispatcherAddress'),
            ('ride_transactions', 'RideTransaction'),
            ('payment_transactions', 'PaymentTransaction'),
            ('customer_vehicles', 'CustomerVehicle')
        ]
        
        print("\n[2] Checking tenant_id columns...")
        for table_name, model_name in tables_to_check:
            try:
                result = db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'tenant_id'"))
                if not result.fetchone():
                    print(f"   • Adding tenant_id to {table_name}...")
                    db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)"))
                    db.commit()
                    print(f"   ✓ Added tenant_id to {table_name}")
                else:
                    print(f"   ✓ tenant_id exists in {table_name}")
            except Exception as e:
                print(f"   ✗ Error with {table_name}: {e}")
                db.rollback()
        
        print("\n" + "="*70)
        print("SCHEMA FIX COMPLETE")
        print("="*70)
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

def reseed_demo_tenant():
    """Re-seed DEMO tenant with proper tenant_id"""
    print("\n" + "="*70)
    print("RE-SEEDING DEMO TENANT")
    print("="*70)
    
    from seed_data import run_seed
    
    try:
        # Clear existing data without tenant_id
        db = SessionLocal()
        
        # Delete orphaned records (no tenant_id)
        print("\n[1] Cleaning orphaned records...")
        tables = [
            ('ride_transactions', 'RideTransaction'),
            ('payment_transactions', 'PaymentTransaction'),
            ('customer_vehicles', 'CustomerVehicle'),
            ('dispatchers', 'Dispatcher'),
            ('drivers', 'Driver'),
            ('customers', 'Customer')
        ]
        
        for table_name, model_name in tables:
            try:
                count = db.execute(text(f"DELETE FROM {table_name} WHERE tenant_id IS NULL")).rowcount
                if count > 0:
                    print(f"   • Deleted {count} orphaned records from {table_name}")
            except Exception as e:
                print(f"   ✗ Error cleaning {table_name}: {e}")
        
        db.commit()
        db.close()
        
        # Re-seed DEMO tenant
        print("\n[2] Seeding DEMO tenant with data...")
        run_seed("DEMO")
        
        print("\n✓ DEMO tenant re-seeded successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")

def main():
    print("\n" + "="*70)
    print("DATABASE FIX AND RE-SEED")
    print("="*70)
    
    # Step 1: Fix schema
    fix_database_schema()
    
    # Step 2: Re-seed DEMO tenant
    reseed_demo_tenant()
    
    print("\n" + "="*70)
    print("ALL FIXES COMPLETE!")
    print("="*70)
    print("\nNext steps:")
    print("1. Restart backend: docker-compose restart backend")
    print("2. Login as super admin")
    print("3. Select DEMO tenant")
    print("4. Check all sections for data")
    print()

if __name__ == "__main__":
    main()
