import random
from datetime import datetime
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
)


def build_customer(index: int) -> Customer:
    customer = Customer(
        name=f"Customer {index}",
        email=f"customer{index}@example.com",
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

    customer.vehicles = [
        CustomerVehicle(
            nickname=f"Garage Ride {index}",
            vehicle_make=random.choice(["Honda", "Hyundai", "Toyota", "Tata"]),
            vehicle_model=random.choice(["City", "Creta", "Corolla", "Nexon"]),
            vehicle_type=random.choice(["Sedan", "SUV", "Hatchback"]),
            is_automatic=bool(index % 2),
            transmission_type="automatic" if index % 2 else "manual",
            registration_number=f"KA01AB{index:04}",
            additional_details="Seeded vehicle for testing",
        )
    ]

    return customer


def build_driver(index: int) -> Driver:
    driver = Driver(name=f"Driver {index}")

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


def seed_customers(session, count: int = 10):
    for idx in range(1, count + 1):
        email = f"customer{idx}@example.com"
        exists = session.query(Customer).filter_by(email=email).first()
        if exists:
            continue
        session.add(build_customer(idx))


def seed_drivers(session, count: int = 15):
    for idx in range(1, count + 1):
        name = f"Driver {idx}"
        exists = session.query(Driver).filter_by(name=name).first()
        if exists:
            continue
        session.add(build_driver(idx))


def seed_dispatchers(session, count: int = 3):
    for idx in range(1, count + 1):
        name = f"Dispatcher {idx}"
        exists = session.query(Dispatcher).filter_by(name=name).first()
        if exists:
            continue
        dispatcher = Dispatcher(
            name=name,
            contact_number=f"+9155000{idx:03}",
            email=f"dispatcher{idx}@example.com",
        )
        session.add(dispatcher)


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


def seed_transactions(session):
    scenarios = [
        {
            "transaction_number": "TXN-SEED-001",
            "dispatcher_name": "Dispatcher 1",
            "customer_email": "customer1@example.com",
            "driver_name": "Driver 1",
            "vehicle_reg": "KA01AB0001",
            "hours": 4,
            "payment_method": PaymentMethod.RAZORPAY,
            "pickup": "Customer 1 Residence",
            "drop": "City Center Mall",
            "return": "Customer 1 Residence",
            "events": [
                ("BOOKING_CREATED", "Dispatcher created booking #1"),
                ("DRIVER_ACCEPTED", "Driver accepted booking"),
                ("ENROUTE_TO_PICKUP", "Driver enroute to pickup"),
                ("CUSTOMER_PICKED", "Customer onboarded"),
                ("AT_DESTINATION", "Reached destination"),
                ("RETURNING", "Returning to pickup"),
                ("COMPLETED", "Ride completed and payment settled"),
            ],
        },
        {
            "transaction_number": "TXN-SEED-002",
            "dispatcher_name": "Dispatcher 2",
            "customer_email": "customer7@example.com",
            "driver_name": "Driver 5",
            "vehicle_reg": "KA01AB0007",
            "hours": 8,
            "payment_method": PaymentMethod.PHONEPE,
            "pickup": "Pickup Point A",
            "drop": "Drop Point B",
            "return": "Pickup Point A",
            "events": [
                ("BOOKING_CREATED", "Dispatcher created transaction #2"),
                ("DRIVER_ACCEPTED", "Driver confirmed ride"),
                ("ENROUTE_TO_PICKUP", "Driver moving to pickup"),
                ("CUSTOMER_PICKED", "Customer boarded"),
                ("AT_DESTINATION", "Customer dropped at B"),
                ("RETURNING", "Driver returning to pickup A"),
                ("COMPLETED", "Trip completed, payment collected"),
            ],
        },
        {
            "transaction_number": "TXN-SEED-003",
            "dispatcher_name": "Dispatcher 1",
            "customer_email": "customer3@example.com",
            "driver_name": "Driver 8",
            "vehicle_reg": "KA01AB0003",
            "hours": 6,
            "payment_method": PaymentMethod.CASH,
            "pickup": "Airport Terminal 2",
            "drop": "Hotel Grand",
            "return": None,
            "events": [
                ("BOOKING_CREATED", "Airport transfer requested"),
                ("DRIVER_ACCEPTED", "Driver assigned to airport run"),
                ("CUSTOMER_PICKED", "Customer picked at airport"),
                ("AT_DESTINATION", "Customer dropped at hotel"),
                ("COMPLETED", "Cash received on drop"),
            ],
        },
        {
            "transaction_number": "TXN-SEED-004",
            "dispatcher_name": "Dispatcher 3",
            "customer_email": "customer5@example.com",
            "driver_name": "Driver 10",
            "vehicle_reg": "KA01AB0005",
            "hours": 5,
            "payment_method": PaymentMethod.RAZORPAY,
            "pickup": "Tech Park A",
            "drop": "Client Office B",
            "return": "Tech Park A",
            "events": [
                ("BOOKING_CREATED", "Client visit scheduled"),
                ("DRIVER_ACCEPTED", "Driver confirmed schedule"),
                ("ENROUTE_TO_PICKUP", "Heading to Tech Park A"),
                ("CUSTOMER_PICKED", "Customer boarded for visit"),
                ("AT_DESTINATION", "Meeting venue reached"),
                ("RETURNING", "Returning to Tech Park"),
                ("COMPLETED", "Ride closed after return"),
            ],
        },
        {
            "transaction_number": "TXN-SEED-005",
            "dispatcher_name": "Dispatcher 2",
            "customer_email": "customer9@example.com",
            "driver_name": "Driver 12",
            "vehicle_reg": "KA01AB0009",
            "hours": 3,
            "payment_method": PaymentMethod.PHONEPE,
            "pickup": "Residence Sector 9",
            "drop": "Shopping Plaza",
            "return": None,
            "events": [
                ("BOOKING_CREATED", "Short errand booking created"),
                ("DRIVER_ACCEPTED", "Driver lined up"),
                ("ENROUTE_TO_PICKUP", "Driver heading to sector 9"),
                ("CUSTOMER_PICKED", "Customer picked for shopping"),
                ("AT_DESTINATION", "Dropped at shopping plaza"),
                ("COMPLETED", "PhonePe payment completed"),
            ],
        },
    ]

    hourly_rate = Decimal("400")

    sample_vehicles = [
        {
            "customer_email": "customer1@example.com",
            "nickname": "My Car",
            "vehicle_make": "Toyota",
            "vehicle_model": "Corolla",
            "vehicle_type": "Sedan",
            "is_automatic": True,
            "transmission_type": "automatic",
            "registration_number": "KA01AB0001",
            "additional_details": "Seeded vehicle for testing",
        },
        {
            "customer_email": "customer7@example.com",
            "nickname": "My SUV",
            "vehicle_make": "Hyundai",
            "vehicle_model": "Creta",
            "vehicle_type": "SUV",
            "is_automatic": False,
            "transmission_type": "manual",
            "registration_number": "KA01AB0007",
            "additional_details": "Seeded vehicle for testing",
        },
        {
            "customer_email": "customer3@example.com",
            "nickname": "My Hatchback",
            "vehicle_make": "Tata",
            "vehicle_model": "Nexon",
            "vehicle_type": "Hatchback",
            "is_automatic": True,
            "transmission_type": "automatic",
            "registration_number": "KA01AB0003",
            "additional_details": "Seeded vehicle for testing",
        },
        {
            "customer_email": "customer5@example.com",
            "nickname": "My Sedan",
            "vehicle_make": "Honda",
            "vehicle_model": "City",
            "vehicle_type": "Sedan",
            "is_automatic": False,
            "transmission_type": "manual",
            "registration_number": "KA01AB0005",
            "additional_details": "Seeded vehicle for testing",
        },
        {
            "customer_email": "customer9@example.com",
            "nickname": "My SUV",
            "vehicle_make": "Hyundai",
            "vehicle_model": "Creta",
            "vehicle_type": "SUV",
            "is_automatic": True,
            "transmission_type": "automatic",
            "registration_number": "KA01AB0009",
            "additional_details": "Seeded vehicle for testing",
        },
    ]

    # Insert vehicles for customers
    for idx, vehicle_data in enumerate(sample_vehicles, 1):
        exists = (
            session.query(CustomerVehicle)
            .filter_by(registration_number=vehicle_data["registration_number"])
            .first()
        )
        if exists:
            continue

        customer = session.query(Customer).filter_by(email=vehicle_data["customer_email"]).first()
        if not customer:
            print(f"Skipping vehicle for {vehicle_data['customer_email']} - customer not found")
            continue

        vehicle = CustomerVehicle(
            customer_id=customer.id,
            nickname=vehicle_data["nickname"],
            vehicle_make=vehicle_data["vehicle_make"],
            vehicle_model=vehicle_data["vehicle_model"],
            vehicle_type=vehicle_data["vehicle_type"],
            is_automatic=vehicle_data["is_automatic"],
            transmission_type=vehicle_data["transmission_type"],
            registration_number=vehicle_data["registration_number"],
            additional_details=vehicle_data["additional_details"],
        )
        session.add(vehicle)

    for scenario in scenarios:
        exists = (
            session.query(RideTransaction)
            .filter_by(transaction_number=scenario["transaction_number"])
            .first()
        )
        if exists:
            continue

        dispatcher = session.query(Dispatcher).filter_by(
            name=scenario["dispatcher_name"]
        ).first()
        customer = session.query(Customer).filter_by(
            email=scenario["customer_email"]
        ).first()
        driver = session.query(Driver).filter_by(
            name=scenario["driver_name"]
        ).first()
        vehicle = session.query(CustomerVehicle).filter_by(
            registration_number=scenario["vehicle_reg"]
        ).first()

        if not all([dispatcher, customer, driver, vehicle]):
            print(
                f"Skipping {scenario['transaction_number']} due to missing references."
            )
            continue

        total_amount = hourly_rate * scenario["hours"]
        transaction = RideTransaction(
            transaction_number=scenario["transaction_number"],
            dispatcher_id=dispatcher.id,
            customer_id=customer.id,
            driver_id=driver.id,
            vehicle_id=vehicle.id,
            pickup_location=scenario["pickup"],
            destination_location=scenario["drop"],
            return_location=scenario["return"],
            ride_duration_hours=scenario["hours"],
            payment_method=scenario["payment_method"],
            total_amount=total_amount,
            driver_share=total_amount * Decimal("0.78"),
            admin_share=total_amount * Decimal("0.20"),
            dispatcher_share=total_amount * Decimal("0.02"),
        )

        transaction.events = [
            RideTransactionEvent(event=event, description=description)
            for event, description in scenario["events"]
        ]

        session.add(transaction)


def run_seed():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_customers(session)
        seed_drivers(session)
        seed_dispatchers(session)
        seed_admin_contacts(session)
        seed_transactions(session)
        session.commit()
        print("Seed data inserted successfully.")
    except Exception as exc:
        session.rollback()
        print("Seeding failed, rolled back changes.")
        raise exc
    finally:
        session.close()


if __name__ == "__main__":
    print(f"Seeding started at {datetime.utcnow().isoformat()}Z")
    run_seed()
