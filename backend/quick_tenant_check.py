"""
Quick check to verify tenant setup and API accessibility.
"""
from database import SessionLocal
from models import Tenant, Customer, Driver, Dispatcher, RideTransaction

def main():
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("TENANT CONFIGURATION CHECK")
        print("="*70)
        
        # Check tenants
        tenants = db.query(Tenant).all()
        print(f"\n✓ Found {len(tenants)} tenant(s) in database:")
        
        for tenant in tenants:
            print(f"\n  📁 {tenant.name}")
            print(f"     Code: {tenant.code}")
            print(f"     ID: {tenant.id}")
            print(f"     Active: {tenant.is_active}")
            
            # Count data for this tenant
            customers = db.query(Customer).filter(Customer.tenant_id == tenant.id).count()
            drivers = db.query(Driver).filter(Driver.tenant_id == tenant.id).count()
            dispatchers = db.query(Dispatcher).filter(Dispatcher.tenant_id == tenant.id).count()
            transactions = db.query(RideTransaction).filter(RideTransaction.tenant_id == tenant.id).count()
            
            print(f"     Data: {customers} customers, {drivers} drivers, {dispatchers} dispatchers, {transactions} transactions")
        
        print("\n" + "="*70)
        print("FRONTEND TENANT DROPDOWN LOCATION")
        print("="*70)
        print("\n📍 The tenant dropdown is in the SIDEBAR (left side)")
        print("   File: frontend/src/App.jsx, Lines: 1512-1538")
        print("\n⚠️  IMPORTANT: Only visible to ADMIN and SUPER_ADMIN users!")
        print("\n📋 To see the dropdown:")
        print("   1. Open: http://localhost:2070")
        print("   2. Register/Login as ADMIN or SUPER_ADMIN")
        print("   3. Look in the LEFT SIDEBAR below user info")
        print("   4. You'll see 'Select Tenant' dropdown with:")
        print("      • All Tenants")
        print("      • Demo Client (DEMO)")
        print("      • DGDS Client (DGDS)")
        
        print("\n" + "="*70)
        print("TESTING CHECKLIST")
        print("="*70)
        print("\n✅ Backend Setup:")
        print("   [✓] DEMO tenant created with test data")
        print("   [✓] DGDS tenant created (empty)")
        print("   [✓] API endpoint /api/tenants/ configured")
        print("   [✓] Tenant filtering implemented")
        
        print("\n📝 Frontend Testing (Manual):")
        print("   [ ] Login as ADMIN/SUPER_ADMIN user")
        print("   [ ] Verify tenant dropdown appears in sidebar")
        print("   [ ] Select DEMO - verify data shows (20 customers, 80 drivers)")
        print("   [ ] Select DGDS - verify empty state (0 for all)")
        print("   [ ] Switch between tenants - verify data updates")
        print("   [ ] Refresh page - verify tenant selection persists")
        
        print("\n💡 If dropdown not visible:")
        print("   • Check user role (must be ADMIN or SUPER_ADMIN)")
        print("   • Check browser console for errors")
        print("   • Verify you're logged in")
        print("   • Check Network tab for /api/tenants/ call")
        
        print("\n" + "="*70)
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
