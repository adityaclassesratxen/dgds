#!/usr/bin/env python3
"""
Migration script to assign default tenant_id to existing users without a tenant.
Run this once after deploying the tenant-aware backend.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Define models inline to avoid import issues
Base = declarative_base()

from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

class UserRole(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"
    DRIVER = "DRIVER"
    DISPATCHER = "DISPATCHER"
    TENANT_ADMIN = "TENANT_ADMIN"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    tenant_id = Column(Integer, nullable=True)
    customer_id = Column(Integer, nullable=True)
    driver_id = Column(Integer, nullable=True)
    dispatcher_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
