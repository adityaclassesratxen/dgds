"""
Fix tenant assignments for all seeded data
Assign customers, drivers, dispatchers to Demo Client (tenant_id=1)
"""
from database import SessionLocal
from models import Customer, Driver, Dispatcher, RideTransaction, Tenant

def fix_tenant_assignments():
    db = SessionLocal()
    try:
        # Get Demo Client tenant
        demo_tenant = db.query(Tenant).filter(Tenant.name == 'Demo Client').first()
        if not demo_tenant:
            print("✗ Demo Client tenant not found")
            return
        
        print(f"✓ Found Demo Client (ID: {demo_tenant.id})")
        
        # Fix customers with null tenant_id
        customers_updated = db.query(Customer).filter(Customer.tenant_id == None).update(
            {Customer.tenant_id: demo_tenant.id},
            synchronize_session=False
        )
        db.commit()
        print(f"✓ Updated {customers_updated} customers to Demo Client")
        
        # Fix drivers with null tenant_id
        drivers_updated = db.query(Driver).filter(Driver.tenant_id == None).update(
            {Driver.tenant_id: demo_tenant.id},
            synchronize_session=False
        )
        db.commit()
        print(f"✓ Updated {drivers_updated} drivers to Demo Client")
        
        # Fix dispatchers with null tenant_id
        dispatchers_updated = db.query(Dispatcher).filter(Dispatcher.tenant_id == None).update(
            {Dispatcher.tenant_id: demo_tenant.id},
            synchronize_session=False
        )
        db.commit()
        print(f"✓ Updated {dispatchers_updated} dispatchers to Demo Client")
        
        # Fix transactions with null tenant_id
        transactions_updated = db.query(RideTransaction).filter(RideTransaction.tenant_id == None).update(
            {RideTransaction.tenant_id: demo_tenant.id},
            synchronize_session=False
        )
        db.commit()
        print(f"✓ Updated {transactions_updated} transactions to Demo Client")
        
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print(f"Total customers: {db.query(Customer).count()}")
        print(f"Total drivers: {db.query(Driver).count()}")
        print(f"Total dispatchers: {db.query(Dispatcher).count()}")
        print(f"Total transactions: {db.query(RideTransaction).count()}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_tenant_assignments()
