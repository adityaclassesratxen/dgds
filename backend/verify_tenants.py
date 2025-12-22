"""
Script to verify DEMO and DGDS tenant data.
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Tenant, Customer, Driver, Dispatcher, CustomerVehicle, RideTransaction

def verify_tenant_data(tenant_code: str):
    """Verify data for a specific tenant."""
    db = SessionLocal()
    
    try:
        tenant = db.query(Tenant).filter(Tenant.code == tenant_code).first()
        if not tenant:
            print(f"✗ Tenant '{tenant_code}' not found")
            return
        
        print(f"\n{'='*60}")
        print(f"Tenant: {tenant.name} (Code: {tenant.code}, ID: {tenant.id})")
        print(f"{'='*60}")
        
        # Count entities
        customers_count = db.query(Customer).filter(Customer.tenant_id == tenant.id).count()
        drivers_count = db.query(Driver).filter(Driver.tenant_id == tenant.id).count()
        dispatchers_count = db.query(Dispatcher).filter(Dispatcher.tenant_id == tenant.id).count()
        vehicles_count = db.query(CustomerVehicle).join(Customer).filter(Customer.tenant_id == tenant.id).count()
        transactions_count = db.query(RideTransaction).filter(RideTransaction.tenant_id == tenant.id).count()
        
        print(f"📊 Data Summary:")
        print(f"  • Customers:    {customers_count:>4}")
        print(f"  • Drivers:      {drivers_count:>4}")
        print(f"  • Dispatchers:  {dispatchers_count:>4}")
        print(f"  • Vehicles:     {vehicles_count:>4}")
        print(f"  • Transactions: {transactions_count:>4}")
        
        # Calculate transaction statistics
        if transactions_count > 0:
            transactions = db.query(RideTransaction).filter(RideTransaction.tenant_id == tenant.id).all()
            total_amount = sum(float(t.total_amount) for t in transactions)
            completed_count = sum(1 for t in transactions if t.status == 'COMPLETED')
            
            print(f"\n💰 Transaction Statistics:")
            print(f"  • Total Amount:     ₹{total_amount:,.2f}")
            print(f"  • Completed Trips:  {completed_count}")
            print(f"  • Completion Rate:  {(completed_count/transactions_count*100):.1f}%")
            
            # Date range
            dates = [t.created_at for t in transactions if t.created_at]
            if dates:
                min_date = min(dates)
                max_date = max(dates)
                print(f"  • Date Range:       {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
        
        status = "✓ POPULATED" if customers_count > 0 else "✓ EMPTY"
        print(f"\nStatus: {status}")
        
    except Exception as e:
        print(f"✗ Error verifying tenant: {e}")
    finally:
        db.close()

def main():
    print("\n" + "="*60)
    print("TENANT DATA VERIFICATION")
    print("="*60)
    
    # Verify DEMO tenant
    verify_tenant_data("DEMO")
    
    # Verify DGDS tenant
    verify_tenant_data("DGDS")
    
    print("\n" + "="*60)
    print("VERIFICATION COMPLETE")
    print("="*60)
    print("\n💡 Testing Workflow:")
    print("  1. Login to frontend and select DEMO tenant")
    print("  2. Navigate to Dashboard - verify stats display")
    print("  3. Navigate to Summary - verify all data shows")
    print("  4. Navigate to Analytics - verify charts and reports")
    print("  5. Switch to DGDS tenant - verify it's empty")
    print("  6. Add test data to DGDS to verify system works")
    print()

if __name__ == "__main__":
    main()
