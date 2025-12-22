"""
Master script to set up DEMO and DGDS tenants and seed DEMO with test data.
"""
import sys
from create_tenants import create_tenants
from seed_data import run_seed

def main():
    print("=" * 60)
    print("TENANT SETUP AND SEEDING")
    print("=" * 60)
    
    # Step 1: Create tenants
    print("\n[Step 1/2] Creating DEMO and DGDS tenants...")
    try:
        demo_id, dgds_id = create_tenants()
        print(f"✓ Tenants created successfully")
    except Exception as e:
        print(f"✗ Failed to create tenants: {e}")
        sys.exit(1)
    
    # Step 2: Seed DEMO tenant
    print("\n[Step 2/2] Seeding DEMO tenant with test data...")
    print("  - 20 Customers")
    print("  - 80 Drivers")
    print("  - 10 Dispatchers")
    print("  - 69 Vehicles")
    print("  - 300 Transactions (spanning last 2 years to 1 month future)")
    
    try:
        run_seed("DEMO")
        print("✓ DEMO tenant seeded successfully")
    except Exception as e:
        print(f"✗ Failed to seed DEMO tenant: {e}")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print("\n📊 Tenant Summary:")
    print("  • DEMO: Fully populated with test data")
    print("  • DGDS: Empty and ready for production use")
    print("\n💡 Next Steps:")
    print("  1. Test all features with DEMO tenant")
    print("  2. Verify analytics and summary views work correctly")
    print("  3. Once verified, use DGDS tenant for production")
    print("\n")

if __name__ == "__main__":
    main()
