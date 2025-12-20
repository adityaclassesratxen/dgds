"""
Database Reset and Seed Script
Drops all tables and recreates them with fresh seed data
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import Base
from models import (
    User, Customer, Driver, Dispatcher, CustomerAddress, 
    ContactNumber, CustomerVehicle, RideTransaction, UserRole,
    DriverAddress, DriverContactNumber, Tenant
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_database(tenant_name="DGDS Clone"):
    """
    Reset database and seed with initial data
    Args:
        tenant_name: Name of the tenant/company
    """
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/uber_clone_db")
    
    print(f"🔄 Resetting database for tenant: {tenant_name}")
    print(f"📍 Database URL: {DATABASE_URL}")
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Drop all tables
    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    print("🏗️  Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Hash password
        hashed_password = pwd_context.hash("password123")
        
        # Create tenant first
        print(f"🏢 Creating tenant: {tenant_name}...")
        tenant_code = tenant_name.upper().replace(" ", "_")[:20]
        tenant = Tenant(
            name=tenant_name,
            code=tenant_code,
            description=f"Default tenant for {tenant_name}",
            is_active=True
        )
        db.add(tenant)
        db.flush()  # Get the tenant ID
        
        print(f"👤 Creating users for {tenant_name}...")
        
        # Create Super Admin
        super_admin_user = User(
            email="superadmin@dgds.com",
            password_hash=hashed_password,
            role=UserRole.SUPER_ADMIN,
            tenant_id=tenant.id,
            is_active=True,
            is_verified=True
        )
        db.add(super_admin_user)
        
        # Create Admin
        admin_user = User(
            email="admin@dgds.com",
            password_hash=hashed_password,
            role=UserRole.ADMIN,
            tenant_id=tenant.id,
            is_active=True,
            is_verified=True
        )
        db.add(admin_user)
        
        # Create sample customers
        print("👥 Creating sample customers...")
        customer1 = Customer(
            name="John Doe",
            email="john@example.com",
            tenant_id=tenant.id,
            is_archived=False
        )
        db.add(customer1)
        db.flush()
        
        # Add customer address
        address1 = CustomerAddress(
            customer_id=customer1.id,
            address_line="123 Main Street",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
            country="India",
            is_primary=True
        )
        db.add(address1)
        
        # Add customer contact
        contact1 = ContactNumber(
            customer_id=customer1.id,
            label="Mobile",
            phone_number="9876543210",
            is_primary=True
        )
        db.add(contact1)
        
        # Add customer vehicle
        vehicle1 = CustomerVehicle(
            customer_id=customer1.id,
            nickname="My Innova",
            vehicle_make="Toyota",
            vehicle_model="Innova",
            vehicle_type="SUV",
            registration_number="MH01AB1234",
            is_automatic=True
        )
        db.add(vehicle1)
        
        # Create customer user account
        customer1_user = User(
            email="john@example.com",
            password_hash=hashed_password,
            role=UserRole.CUSTOMER,
            customer_id=customer1.id,
            tenant_id=tenant.id,
            is_active=True,
            is_verified=True
        )
        db.add(customer1_user)
        
        # Create sample drivers
        print("🚗 Creating sample drivers...")
        driver1 = Driver(
            name="Rajesh Kumar",
            tenant_id=tenant.id,
            is_archived=False
        )
        db.add(driver1)
        db.flush()
        
        # Add driver address
        driver_address1 = DriverAddress(
            driver_id=driver1.id,
            address_line="456 Park Avenue",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400002",
            country="India",
            is_primary=True
        )
        db.add(driver_address1)
        
        # Add driver contact
        driver_contact1 = DriverContactNumber(
            driver_id=driver1.id,
            label="Mobile",
            phone_number="9123456789",
            is_primary=True
        )
        db.add(driver_contact1)
        
        # Create driver user account
        driver1_user = User(
            email="rajesh@dgds.com",
            password_hash=hashed_password,
            role=UserRole.DRIVER,
            driver_id=driver1.id,
            tenant_id=tenant.id,
            is_active=True,
            is_verified=True
        )
        db.add(driver1_user)
        
        # Create sample dispatcher
        print("📞 Creating sample dispatcher...")
        dispatcher1 = Dispatcher(
            name="Priya Sharma",
            email="priya@dgds.com",
            tenant_id=tenant.id,
            contact_number="9234567890",
            is_archived=False
        )
        db.add(dispatcher1)
        db.flush()
        
        # Create dispatcher user account
        dispatcher1_user = User(
            email="priya@dgds.com",
            password_hash=hashed_password,
            role=UserRole.DISPATCHER,
            dispatcher_id=dispatcher1.id,
            tenant_id=tenant.id,
            is_active=True,
            is_verified=True
        )
        db.add(dispatcher1_user)
        
        # Commit all changes
        db.commit()
        
        print(f"✅ Database reset complete for {tenant_name}!")
        print("\n📋 Default Credentials:")
        print("=" * 50)
        print(f"Tenant Name: {tenant_name}")
        print(f"Super Admin: superadmin@dgds.com / password123")
        print(f"Admin: admin@dgds.com / password123")
        print(f"Dispatcher: priya@dgds.com / password123")
        print(f"Driver: rajesh@dgds.com / password123")
        print(f"Customer: john@example.com / password123")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print(f"❌ Error resetting database: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    # Get tenant name from command line argument or use default
    tenant_name = sys.argv[1] if len(sys.argv) > 1 else "DGDS Clone"
    reset_database(tenant_name)
