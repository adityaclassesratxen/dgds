"""
Script to create DEMO and DGDS tenants in the database.
"""
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Tenant

def create_tenants():
    """Create DEMO and DGDS tenants."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if tenants already exist
        demo_tenant = db.query(Tenant).filter(Tenant.code == "DEMO").first()
        dgds_tenant = db.query(Tenant).filter(Tenant.code == "DGDS").first()
        
        if not demo_tenant:
            demo_tenant = Tenant(
                name="Demo Client",
                code="DEMO",
                description="Demo tenant with seeded data for testing and development",
                is_active=True
            )
            db.add(demo_tenant)
            print("✓ Created DEMO tenant")
        else:
            print("✓ DEMO tenant already exists")
        
        if not dgds_tenant:
            dgds_tenant = Tenant(
                name="DGDS Client",
                code="DGDS",
                description="DGDS production tenant",
                is_active=True
            )
            db.add(dgds_tenant)
            print("✓ Created DGDS tenant")
        else:
            print("✓ DGDS tenant already exists")
        
        db.commit()
        
        # Get tenant IDs
        demo_tenant = db.query(Tenant).filter(Tenant.code == "DEMO").first()
        dgds_tenant = db.query(Tenant).filter(Tenant.code == "DGDS").first()
        
        print(f"\nTenant IDs:")
        print(f"  DEMO: {demo_tenant.id}")
        print(f"  DGDS: {dgds_tenant.id}")
        
        return demo_tenant.id, dgds_tenant.id
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error creating tenants: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating DEMO and DGDS tenants...")
    create_tenants()
    print("\n✓ Tenants created successfully!")
