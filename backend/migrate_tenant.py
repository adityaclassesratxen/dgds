#!/usr/bin/env python3
"""
Migration script to assign default tenant_id to existing users without a tenant.
Run this once after deploying the tenant-aware backend.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import User, Tenant, Base, UserRole

def run_migration():
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print("Connecting to database...")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Ensure tables exist
    print("Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Create default tenant if it doesn't exist
        print("Checking for default tenant 'DGDS_CLONE'...")
        default_tenant = db.query(Tenant).filter(Tenant.code == "DGDS_CLONE").first()
        if not default_tenant:
            print("Creating default tenant 'DGDS_CLONE'...")
            default_tenant = Tenant(
                name="DGDS Clone",
                code="DGDS_CLONE",
                description="Default tenant for DGDS Clone application",
                is_active=True,
            )
            db.add(default_tenant)
            db.commit()
            db.refresh(default_tenant)
            print(f"Created default tenant with ID: {default_tenant.id}")
        else:
            print(f"Default tenant exists with ID: {default_tenant.id}")

        # Find users without tenant_id (excluding Super Admins)
        users_without_tenant = db.query(User).filter(
            User.tenant_id.is_(None),
            User.role != UserRole.SUPER_ADMIN
        ).all()

        print(f"\nFound {len(users_without_tenant)} users without tenant_id")

        if users_without_tenant:
            print("Assigning default tenant to users...")
            for user in users_without_tenant:
                user.tenant_id = default_tenant.id
                print(f"  - Assigned tenant to {user.email} ({user.role.value})")
            
            db.commit()
            print("\n✅ Migration completed successfully!")
        else:
            print("✅ All users already have tenant_id assigned")

        # Summary
        total_users = db.query(User).count()
        super_admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).count()
        tenant_users = db.query(User).filter(User.tenant_id.is_not(None)).count()
        print("\n📊 Summary:")
        print(f"  Total users: {total_users}")
        print(f"  Super Admins: {super_admins} (no tenant)")
        print(f"  Tenant-assigned users: {tenant_users}")

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
