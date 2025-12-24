"""
Comprehensive Test Data Seed Script
Creates realistic test data distributed across 1-2 years:
- 10 Customers
- 30 Drivers  
- 5 Dispatchers
- 20 Vehicles (with automatic/manual transmission)
- 100 Trips/Transactions
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import (
    Customer, CustomerAddress, ContactNumber,
    Driver, DriverAddress, DriverContactNumber,
    Dispatcher, CustomerVehicle, RideTransaction,
    PaymentTransaction, TransactionStatus, PaymentMethod, PaymentStatus,
    Tenant
)

# Sample data for realistic names and locations
FIRST_NAMES = [
    "Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anita", "Suresh", "Kavita",
    "Rahul", "Deepa", "Arun", "Meera", "Sanjay", "Pooja", "Vijay", "Lakshmi",
    "Kiran", "Sunita", "Manoj", "Rekha", "Ashok", "Geeta", "Ravi", "Shanti",
    "Prakash", "Usha", "Dinesh", "Kamala", "Mohan", "Radha", "Sunil", "Padma"
]

LAST_NAMES = [
    "Kumar", "Sharma", "Singh", "Patel", "Reddy", "Rao", "Nair", "Menon",
    "Iyer", "Pillai", "Gupta", "Verma", "Joshi", "Desai", "Shah", "Mehta",
    "Chopra", "Malhotra", "Kapoor", "Khanna", "Bhatia", "Saxena", "Agarwal", "Bansal"
]

CITIES = ["Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]
STATES = ["Karnataka", "Maharashtra", "Delhi", "Tamil Nadu", "Telangana", "Maharashtra", "West Bengal", "Gujarat"]

LOCATIONS = [
    "MG Road", "Koramangala", "Indiranagar", "Whitefield", "Electronic City",
    "HSR Layout", "Jayanagar", "Marathahalli", "BTM Layout", "Banashankari",
    "JP Nagar", "Hebbal", "Yelahanka", "Malleshwaram", "Rajajinagar",
    "Basavanagudi", "Sadashivanagar", "RT Nagar", "Vijayanagar", "Kengeri"
]

VEHICLE_MAKES = ["Toyota", "Honda", "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Volkswagen"]
VEHICLE_MODELS = {
    "Toyota": ["Innova", "Fortuner", "Camry", "Etios"],
    "Honda": ["City", "Amaze", "WR-V", "Jazz"],
    "Maruti Suzuki": ["Swift", "Dzire", "Ertiga", "Baleno", "Brezza"],
    "Hyundai": ["Creta", "Venue", "i20", "Verna"],
    "Tata": ["Nexon", "Harrier", "Safari", "Tiago"],
    "Mahindra": ["XUV700", "Scorpio", "Thar", "XUV300"],
    "Kia": ["Seltos", "Sonet", "Carens"],
    "Volkswagen": ["Polo", "Vento", "Taigun"]
}

VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "MUV", "Luxury"]

def generate_phone():
    return f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}"

def generate_email(name):
    domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
    clean_name = name.lower().replace(" ", ".")
    return f"{clean_name}{random.randint(1, 999)}@{random.choice(domains)}"

def generate_registration_number():
    state_codes = ["KA", "MH", "DL", "TN", "TS", "GJ", "WB", "AP"]
    return f"{random.choice(state_codes)}{random.randint(1, 99):02d}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(1000, 9999)}"

def random_date_in_range(start_date, end_date):
    """Generate a random date between start_date and end_date"""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

def seed_database(progress_callback=None):
    """
    Seed database with test data
    Args:
        progress_callback: Optional callback function to report progress (message, percentage)
    """
    db = SessionLocal()
    
    def report_progress(message, percentage):
        if progress_callback:
            progress_callback(message, percentage)
        print(f"[{percentage}%] {message}")
    
    try:
        report_progress("🌱 Starting database seeding...", 0)
        
        # Get DEMO tenant for assigning all seeded data
        demo_tenant = db.query(Tenant).filter(Tenant.code == "DEMO").first()
        if not demo_tenant:
            raise Exception("DEMO tenant not found. Please ensure tenants are seeded first.")
        demo_tenant_id = demo_tenant.id
        report_progress(f"📋 Using DEMO tenant (ID: {demo_tenant_id})", 5)
        
        # Get timestamp for unique names
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Date range: 2 years ago to now
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)  # 2 years
        
        # ============================================
        # CREATE DISPATCHERS (5)
        # ============================================
        report_progress("📞 Creating 5 Dispatchers...", 10)
        dispatchers = []
        for i in range(5):
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} D{timestamp}{i}"
            dispatcher = Dispatcher(
                name=name,
                email=generate_email(name),
                contact_number=generate_phone(),
                tenant_id=demo_tenant_id,
                created_at=random_date_in_range(start_date, end_date - timedelta(days=365))
            )
            db.add(dispatcher)
            dispatchers.append(dispatcher)
        db.commit()
        report_progress(f"✅ Created {len(dispatchers)} dispatchers", 15)
        
        # ============================================
        # CREATE CUSTOMERS (10)
        # ============================================
        report_progress("👤 Creating 10 Customers...", 20)
        customers = []
        for i in range(10):
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} C{timestamp}{i}"
            city_idx = random.randint(0, len(CITIES) - 1)
            
            customer = Customer(
                name=name,
                email=generate_email(name),
                tenant_id=demo_tenant_id,
                created_at=random_date_in_range(start_date, end_date - timedelta(days=300))
            )
            db.add(customer)
            db.flush()
            
            # Add address
            address = CustomerAddress(
                customer_id=customer.id,
                address_line=f"{random.randint(1, 500)}, {random.choice(LOCATIONS)}",
                city=CITIES[city_idx],
                state=STATES[city_idx],
                postal_code=f"{random.randint(500000, 600000)}",
                country="India",
                is_primary=True
            )
            db.add(address)
            
            # Add contact
            contact = ContactNumber(
                customer_id=customer.id,
                label="Mobile",
                phone_number=generate_phone(),
                is_primary=True
            )
            db.add(contact)
            
            customers.append(customer)
        db.commit()
        report_progress(f"✅ Created {len(customers)} customers with addresses and contacts", 35)
        
        # ============================================
        # CREATE DRIVERS (30)
        # ============================================
        report_progress("🚗 Creating 30 Drivers...", 40)
        drivers = []
        for i in range(30):
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} DR{timestamp}{i}"
            city_idx = random.randint(0, len(CITIES) - 1)
            
            driver = Driver(
                name=name,
                tenant_id=demo_tenant_id,
                created_at=random_date_in_range(start_date, end_date - timedelta(days=200))
            )
            db.add(driver)
            db.flush()
            
            # Add address
            address = DriverAddress(
                driver_id=driver.id,
                address_line=f"{random.randint(1, 500)}, {random.choice(LOCATIONS)}",
                city=CITIES[city_idx],
                state=STATES[city_idx],
                postal_code=f"{random.randint(500000, 600000)}",
                country="India",
                is_primary=True
            )
            db.add(address)
            
            # Add contact
            contact = DriverContactNumber(
                driver_id=driver.id,
                label="Mobile",
                phone_number=generate_phone(),
                is_primary=True
            )
            db.add(contact)
            
            drivers.append(driver)
        db.commit()
        report_progress(f"✅ Created {len(drivers)} drivers with addresses and contacts", 55)
        
        # ============================================
        # CREATE VEHICLES (20)
        # ============================================
        report_progress("🚙 Creating 20 Vehicles...", 60)
        vehicles = []
        transmission_types = ["automatic", "manual"]
        
        for i in range(20):
            customer = random.choice(customers)
            make = random.choice(VEHICLE_MAKES)
            model = random.choice(VEHICLE_MODELS[make])
            is_automatic = random.choice([True, False])
            
            vehicle = CustomerVehicle(
                customer_id=customer.id,
                nickname=f"{customer.name}'s {model}",
                vehicle_make=make,
                vehicle_model=model,
                vehicle_type=random.choice(VEHICLE_TYPES),
                is_automatic=is_automatic,
                transmission_type="automatic" if is_automatic else "manual",
                registration_number=generate_registration_number(),
                additional_details=f"Color: {random.choice(['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey'])}",
                created_at=random_date_in_range(start_date, end_date - timedelta(days=100))
            )
            # CustomerVehicle gets tenant_id through customer relationship
            db.add(vehicle)
            vehicles.append(vehicle)
        db.commit()
        report_progress(f"✅ Created {len(vehicles)} vehicles (automatic and manual)", 70)
        
        # ============================================
        # CREATE TRANSACTIONS/TRIPS (100)
        # ============================================
        report_progress("💰 Creating 100 Transactions/Trips...", 75)
        transactions = []
        statuses = [TransactionStatus.COMPLETED] * 70 + [TransactionStatus.REQUESTED] * 15 + [TransactionStatus.CANCELLED] * 15
        payment_methods = [PaymentMethod.UPI] * 40 + [PaymentMethod.CASH] * 30 + [PaymentMethod.RAZORPAY] * 30
        
        for i in range(100):
            customer = random.choice(customers)
            driver = random.choice(drivers)
            dispatcher = random.choice(dispatchers)
            vehicle = random.choice([v for v in vehicles if v.customer_id == customer.id] or vehicles)
            
            # Random date distributed across 2 years
            transaction_date = random_date_in_range(start_date, end_date)
            
            # Random amounts
            base_amount = random.randint(500, 5000)
            total_amount = Decimal(str(base_amount))
            
            status = random.choice(statuses)
            
            # Payment status based on transaction status
            if status == TransactionStatus.COMPLETED:
                paid_percentage = random.choice([1.0] * 70 + [0.5, 0.6, 0.7, 0.8, 0.9] * 6)
            elif status == TransactionStatus.CANCELLED:
                paid_percentage = random.choice([0.0] * 80 + [0.3, 0.5] * 10)
            else:
                paid_percentage = random.choice([0.0] * 50 + [0.3, 0.5, 0.7] * 17)
            
            paid_amount = Decimal(str(round(float(total_amount) * paid_percentage, 2)))
            
            # Commission splits
            driver_share = total_amount * Decimal('0.79')
            dispatcher_share = total_amount * Decimal('0.18')
            admin_share = total_amount * Decimal('0.02')
            super_admin_share = total_amount * Decimal('0.01')
            
            # Generate transaction number
            txn_number = f"TXN-{transaction_date.strftime('%Y%m%d')}-{i+1:04d}"
            friendly_id = f"DGDS-{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(100, 999)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(10, 99)}"
            
            transaction = RideTransaction(
                transaction_number=txn_number,
                friendly_booking_id=friendly_id,
                customer_id=customer.id,
                driver_id=driver.id,
                dispatcher_id=dispatcher.id,
                vehicle_id=vehicle.id,
                pickup_location=random.choice(LOCATIONS),
                destination_location=random.choice(LOCATIONS),
                return_location=random.choice(LOCATIONS) if random.random() > 0.7 else None,
                ride_duration_hours=random.randint(1, 12),
                total_amount=total_amount,
                paid_amount=paid_amount,
                driver_share=driver_share,
                dispatcher_share=dispatcher_share,
                admin_share=admin_share,
                super_admin_share=super_admin_share,
                status=status,
                payment_method=random.choice(payment_methods),
                is_paid=paid_amount >= total_amount,
                tenant_id=demo_tenant_id,  # Assign to DEMO tenant
                created_at=transaction_date,
                updated_at=transaction_date + timedelta(hours=random.randint(1, 48))
            )
            db.add(transaction)
            transactions.append(transaction)
            
            # Create payment records for paid transactions
            if paid_amount > 0:
                db.flush()
                from models import PaymentPayerType
                payment = PaymentTransaction(
                    ride_transaction_id=transaction.id,
                    amount=paid_amount,
                    payment_method=transaction.payment_method,
                    status=PaymentStatus.SUCCESS if paid_amount >= total_amount else PaymentStatus.PENDING,
                    payer_type=PaymentPayerType.CUSTOMER,
                    notes=f"Payment for {txn_number}"
                )
                db.add(payment)
        
        db.commit()
        report_progress(f"✅ Created {len(transactions)} transactions with payments", 95)
        
        # ============================================
        # SUMMARY
        # ============================================
        report_progress("🎉 DATABASE SEEDING COMPLETE!", 100)
        print("\n" + "=" * 50)
        print("🎉 DATABASE SEEDING COMPLETE!")
        print("=" * 50)
        print(f"\n📊 Summary:")
        print(f"   • Customers:    {len(customers)}")
        print(f"   • Drivers:      {len(drivers)}")
        print(f"   • Dispatchers:  {len(dispatchers)}")
        print(f"   • Vehicles:     {len(vehicles)}")
        print(f"   • Transactions: {len(transactions)}")
        print(f"\n📅 Date Range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Calculate totals
        total_revenue = sum(float(t.total_amount) for t in transactions)
        total_collected = sum(float(t.paid_amount) for t in transactions)
        completed = sum(1 for t in transactions if t.status == TransactionStatus.COMPLETED)
        
        print(f"\n💰 Financial Summary:")
        print(f"   • Total Revenue:   ₹{total_revenue:,.2f}")
        print(f"   • Total Collected: ₹{total_collected:,.2f}")
        print(f"   • Pending:         ₹{total_revenue - total_collected:,.2f}")
        print(f"   • Completed Trips: {completed}")
        
        # Vehicle transmission breakdown
        automatic = sum(1 for v in vehicles if v.is_automatic)
        manual = len(vehicles) - automatic
        print(f"\n🚙 Vehicle Transmission:")
        print(f"   • Automatic: {automatic}")
        print(f"   • Manual:    {manual}")
        
        print("\n✅ You can now use the Analytics section to view this data!")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
