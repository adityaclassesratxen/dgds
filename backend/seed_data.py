import random
from datetime import datetime, timedelta
from decimal import Decimal

from database import Base, SessionLocal, engine
from models import (
    AdminContact,
    ContactNumber,
    Customer,
    CustomerAddress,
    CustomerVehicle,
    Dispatcher,
    Driver,
    DriverAddress,
    DriverContactNumber,
    PaymentMethod,
    RideTransaction,
    RideTransactionEvent,
    Tenant,
)


def build_customer(index: int, tenant_id: int) -> Customer:
    customer = Customer(
        name=f"Customer {index}",
        email=f"customer{index}@example.com",
        tenant_id=tenant_id,
    )

    customer.addresses = [
        CustomerAddress(
            address_line=f"{100 + index} Main Street",
            city="Metropolis",
            state="State",
            postal_code=f"5000{index}",
            country="India",
            is_primary=True,
        )
    ]

    customer.contact_numbers = [
        ContactNumber(
            label="Primary",
            phone_number=f"+9198000{index:04}",
            is_primary=True,
        )
    ]

    customer.vehicles = []

    return customer


def build_driver(index: int, tenant_id: int) -> Driver:
    driver = Driver(name=f"Driver {index}", tenant_id=tenant_id)

    driver.addresses = [
        DriverAddress(
            address_line=f"{50 + index} Depot Road",
            city="Metropolis",
            state="State",
            postal_code=f"6000{index}",
            country="India",
            is_primary=True,
        )
    ]

    driver.contact_numbers = [
        DriverContactNumber(
            label="Primary",
            phone_number=f"+9177000{index:04}",
            is_primary=True,
        )
    ]

    return driver


def seed_customers(session, tenant_id: int, count: int = 20):
    for idx in range(1, count + 1):
        email = f"customer{idx}@example.com"
        exists = session.query(Customer).filter_by(email=email, tenant_id=tenant_id).first()
        if exists:
            continue
        session.add(build_customer(idx, tenant_id))


def seed_drivers(session, tenant_id: int, count: int = 80):
    for idx in range(1, count + 1):
        name = f"Driver {idx}"
        exists = session.query(Driver).filter_by(name=name, tenant_id=tenant_id).first()
        if exists:
            continue
        session.add(build_driver(idx, tenant_id))


def seed_dispatchers(session, tenant_id: int, count: int = 10):
    for idx in range(1, count + 1):
        name = f"Dispatcher {idx}"
        exists = session.query(Dispatcher).filter_by(name=name, tenant_id=tenant_id).first()
        if exists:
            continue
        dispatcher = Dispatcher(
            name=name,
            contact_number=f"+9155000{idx:03}",
            email=f"dispatcher{idx}@example.com",
            tenant_id=tenant_id,
        )
        session.add(dispatcher)


def seed_vehicles(session, tenant_id: int, count: int = 69):
    customers = session.query(Customer).filter_by(tenant_id=tenant_id).all()
    if not customers:
        print("Cannot seed vehicles without customers.")
        return

    for i in range(1, count + 1):
        reg_num = f"KA01AB{1000 + i:04}"
        exists = session.query(CustomerVehicle).filter_by(registration_number=reg_num).first()
        if exists:
            continue

        customer = random.choice(customers)
        vehicle = CustomerVehicle(
            customer_id=customer.id,
            nickname=f"Ride {i}",
            vehicle_make=random.choice(["Honda", "Hyundai", "Toyota", "Tata", "Mahindra", "Maruti"]),
            vehicle_model=random.choice(["City", "Creta", "Corolla", "Nexon", "Thar", "Swift"]),
            vehicle_type=random.choice(["Sedan", "SUV", "Hatchback"]),
            is_automatic=random.choice([True, False]),
            transmission_type=random.choice(["automatic", "manual"]),
            registration_number=reg_num,
            additional_details="Seeded vehicle for testing",
        )
        session.add(vehicle)

def seed_admin_contacts(session, count: int = 4):
    for idx in range(1, count + 1):
        name = f"Admin {idx}"
        exists = session.query(AdminContact).filter_by(name=name).first()
        if exists:
            continue
        admin_contact = AdminContact(
            name=name,
            contact_address=f"admin{idx}@example.com",
            primary_address=f"{200 + idx} Corporate Ave, Business City",
        )
        session.add(admin_contact)


def ensure_reference(session, model, identifier, field="id"):
    return session.query(model).filter(getattr(model, field) == identifier).first()


def seed_transactions(session, tenant_id: int, count: int = 300):
    customers = session.query(Customer).filter_by(tenant_id=tenant_id).all()
    drivers = session.query(Driver).filter_by(tenant_id=tenant_id).all()
    dispatchers = session.query(Dispatcher).filter_by(tenant_id=tenant_id).all()
    vehicles = session.query(CustomerVehicle).join(Customer).filter(Customer.tenant_id == tenant_id).all()

    if not all([customers, drivers, dispatchers, vehicles]):
        print("Cannot seed transactions without customers, drivers, dispatchers, and vehicles.")
        return

    hourly_rate = Decimal("400")
    locations = ["Airport", "Hotel", "Office", "Home", "Mall", "Restaurant", "Park"]

    for i in range(1, count + 1):
        txn_num = f"TXN-SEED-{i:04}"
        exists = session.query(RideTransaction).filter_by(transaction_number=txn_num).first()
        if exists:
            continue

        customer = random.choice(customers)
        driver = random.choice(drivers)
        dispatcher = random.choice(dispatchers)
        vehicle = random.choice(vehicles)

        # Generate a random date within the last two years and up to one month in the future
        days_offset = random.randint(-730, 30)
        created_at = datetime.now() + timedelta(days=days_offset)

        hours = random.randint(1, 12)
        total_amount = hourly_rate * hours

        transaction = RideTransaction(
            transaction_number=txn_num,
            dispatcher_id=dispatcher.id,
            customer_id=customer.id,
            driver_id=driver.id,
            vehicle_id=vehicle.id,
            pickup_location=random.choice(locations),
            destination_location=random.choice(locations),
            return_location=random.choice(locations + [None]),
            ride_duration_hours=hours,
            payment_method=random.choice(list(PaymentMethod)),
            total_amount=total_amount,
            driver_share=total_amount * Decimal("0.78"),
            admin_share=total_amount * Decimal("0.20"),
            dispatcher_share=total_amount * Decimal("0.02"),
            created_at=created_at,
            tenant_id=tenant_id,
        )

        transaction.events = [
            RideTransactionEvent(event="BOOKING_CREATED", description="Booking created via seed."),
            RideTransactionEvent(event="COMPLETED", description="Ride completed via seed."),
        ]

        session.add(transaction)


def run_seed(tenant_code: str = "DEMO"):
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        # Get tenant by code
        tenant = session.query(Tenant).filter_by(code=tenant_code).first()
        if not tenant:
            print(f"Tenant with code '{tenant_code}' not found. Please create tenants first.")
            return
        
        print(f"Seeding data for tenant: {tenant.name} (ID: {tenant.id})")
        
        seed_customers(session, tenant.id, count=20)
        session.flush()  # Flush to get customer IDs
        
        seed_drivers(session, tenant.id, count=80)
        session.flush()  # Flush to get driver IDs
        
        seed_dispatchers(session, tenant.id, count=10)
        session.flush()  # Flush to get dispatcher IDs
        
        seed_vehicles(session, tenant.id, count=69)
        session.flush()  # Flush to get vehicle IDs
        
        seed_admin_contacts(session)
        session.flush()
        
        seed_transactions(session, tenant.id, count=300)
        
        session.commit()
        print(f"Seed data inserted successfully for tenant: {tenant.name}")
    except Exception as exc:
        session.rollback()
        print("Seeding failed, rolled back changes.")
        raise exc
    finally:
        session.close()


if __name__ == "__main__":
    import sys
    tenant_code = sys.argv[1] if len(sys.argv) > 1 else "DEMO"
    print(f"Seeding started at {datetime.utcnow().isoformat()}Z")
    print(f"Target tenant: {tenant_code}")
    run_seed(tenant_code)
