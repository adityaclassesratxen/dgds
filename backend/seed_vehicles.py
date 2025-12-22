"""
Seed customer vehicles for the DGDS Clone application
Creates ~40 vehicles: 3-4 per customer + standalone vehicles for Uber-style service
"""
from database import SessionLocal
from models import Customer, CustomerVehicle, Tenant
import random

# Vehicle data for realistic seeding
VEHICLE_MAKES = [
    "Toyota", "Honda", "Maruti Suzuki", "Hyundai", "Mahindra", 
    "Tata", "Ford", "Volkswagen", "Nissan", "Renault"
]

VEHICLE_MODELS = {
    "Toyota": ["Innova Crysta", "Fortuner", "Camry", "Etios"],
    "Honda": ["City", "Amaze", "WR-V", "Civic"],
    "Maruti Suzuki": ["Swift", "Dzire", "Ertiga", "Vitara Brezza"],
    "Hyundai": ["Creta", "Verna", "i20", "Venue"],
    "Mahindra": ["Scorpio", "XUV500", "Bolero", "Thar"],
    "Tata": ["Nexon", "Harrier", "Safari", "Tigor"],
    "Ford": ["EcoSport", "Endeavour", "Figo", "Aspire"],
    "Volkswagen": ["Polo", "Vento", "Tiguan", "T-Roc"],
    "Nissan": ["Magnite", "Kicks", "Terrano", "Sunny"],
    "Renault": ["Duster", "Kwid", "Triber", "Kiger"]
}

VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "MUV"]

TRANSMISSION_TYPES = ["Manual", "Automatic"]

def generate_registration_number():
    """Generate realistic Indian vehicle registration number"""
    states = ["KA", "MH", "DL", "TN", "UP", "GJ", "RJ", "AP", "TS", "WB"]
    state = random.choice(states)
    district = random.randint(1, 99)
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))
    numbers = random.randint(1000, 9999)
    return f"{state}{district:02d}{letters}{numbers}"

def seed_vehicles():
    db = SessionLocal()
    try:
        # Get Demo Client tenant
        demo_tenant = db.query(Tenant).filter(Tenant.name == 'Demo Client').first()
        if not demo_tenant:
            print("✗ Demo Client tenant not found")
            return
        
        print(f"✓ Found Demo Client (ID: {demo_tenant.id})")
        
        # Get all customers
        customers = db.query(Customer).filter(Customer.tenant_id == demo_tenant.id).all()
        print(f"✓ Found {len(customers)} customers")
        
        # Clear existing vehicles for Demo Client customers
        existing_count = db.query(CustomerVehicle).join(Customer).filter(
            Customer.tenant_id == demo_tenant.id
        ).count()
        if existing_count > 0:
            # Get customer IDs for Demo Client
            customer_ids = [c.id for c in customers]
            db.query(CustomerVehicle).filter(
                CustomerVehicle.customer_id.in_(customer_ids)
            ).delete(synchronize_session=False)
            db.commit()
            print(f"✓ Cleared {existing_count} existing vehicles")
        
        vehicles_created = 0
        
        # Create 3-4 vehicles per customer
        for customer in customers:
            num_vehicles = random.randint(3, 4)
            
            for i in range(num_vehicles):
                make = random.choice(VEHICLE_MAKES)
                model = random.choice(VEHICLE_MODELS[make])
                vehicle_type = random.choice(VEHICLE_TYPES)
                transmission = random.choice(TRANSMISSION_TYPES)
                
                vehicle = CustomerVehicle(
                    customer_id=customer.id,
                    nickname=f"{customer.name}'s {make} {model}",
                    vehicle_make=make,
                    vehicle_model=model,
                    registration_number=generate_registration_number(),
                    vehicle_type=vehicle_type,
                    is_automatic=(transmission == "Automatic"),
                    transmission_type=transmission.lower()
                )
                db.add(vehicle)
                vehicles_created += 1
        
        db.commit()
        print(f"✓ Created {vehicles_created} customer vehicles (3-4 per customer)")
        
        # Summary
        print("\n" + "="*70)
        print("VEHICLE SEEDING SUMMARY")
        print("="*70)
        
        total_vehicles = db.query(CustomerVehicle).count()
        
        print(f"Total vehicles: {total_vehicles}")
        print(f"Average vehicles per customer: {total_vehicles / len(customers):.1f}")
        
        # Show breakdown by make
        print("\nVehicles by make:")
        for make in VEHICLE_MAKES:
            count = db.query(CustomerVehicle).filter(
                CustomerVehicle.vehicle_make == make
            ).count()
            if count > 0:
                print(f"  - {make}: {count}")
        
        # Show breakdown by type
        print("\nVehicles by type:")
        for vtype in VEHICLE_TYPES:
            count = db.query(CustomerVehicle).filter(
                CustomerVehicle.vehicle_type == vtype
            ).count()
            if count > 0:
                print(f"  - {vtype}: {count}")
        
        print("\n✓ Vehicle seeding completed successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_vehicles()
