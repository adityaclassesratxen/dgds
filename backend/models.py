from enum import Enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    Numeric,
    Enum as SAEnum,
    Text,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DISPATCHER = "DISPATCHER"
    DRIVER = "DRIVER"
    CUSTOMER = "CUSTOMER"
    SUPER_ADMIN = "SUPER_ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Foreign key relationships
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    dispatcher_id = Column(Integer, ForeignKey("dispatchers.id"), nullable=True)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    addresses = relationship(
        "CustomerAddress",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    contact_numbers = relationship(
        "ContactNumber",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    vehicles = relationship(
        "CustomerVehicle",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(
        Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    address_line = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="addresses")


class ContactNumber(Base):
    __tablename__ = "contact_numbers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(
        Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    label = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="contact_numbers")


class CustomerVehicle(Base):
    __tablename__ = "customer_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(
        Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    nickname = Column(String(100), nullable=False)
    vehicle_make = Column(String(100), nullable=False)
    vehicle_model = Column(String(100), nullable=False)
    vehicle_type = Column(String(100), nullable=True)
    is_automatic = Column(Boolean, default=True, nullable=False)
    transmission_type = Column(String(50), nullable=False, default="automatic")
    registration_number = Column(String(50), nullable=False, unique=True)
    additional_details = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="vehicles")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    addresses = relationship(
        "DriverAddress",
        back_populates="driver",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    contact_numbers = relationship(
        "DriverContactNumber",
        back_populates="driver",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class DriverAddress(Base):
    __tablename__ = "driver_addresses"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    address_line = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    driver = relationship("Driver", back_populates="addresses")


class DriverContactNumber(Base):
    __tablename__ = "driver_contact_numbers"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    label = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    driver = relationship("Driver", back_populates="contact_numbers")


class Dispatcher(Base):
    __tablename__ = "dispatchers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    contact_number = Column(String(20), nullable=False, unique=True)
    email = Column(String(150), nullable=False, unique=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AdminContact(Base):
    __tablename__ = "admin_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    contact_address = Column(String(150), nullable=False, unique=True)
    primary_address = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SuperAdmin(Base):
    __tablename__ = "superadmins"

    id = Column(Integer, primary_key=True, index=True)
    contact_address = Column(String(150), nullable=False, unique=True)
    primary_address = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TransactionStatus(str, Enum):
    REQUESTED = "REQUESTED"
    DRIVER_ACCEPTED = "DRIVER_ACCEPTED"
    ENROUTE_TO_PICKUP = "ENROUTE_TO_PICKUP"
    CANCELLED = "CANCELLED"
    CUSTOMER_PICKED = "CUSTOMER_PICKED"
    AT_DESTINATION = "AT_DESTINATION"
    RETURNING = "RETURNING"
    COMPLETED = "COMPLETED"


class PaymentMethod(str, Enum):
    RAZORPAY = "RAZORPAY"
    PHONEPE = "PHONEPE"
    CASH = "CASH"


class PaymentPayerType(str, Enum):
    CUSTOMER = "CUSTOMER"
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class RideTransaction(Base):
    __tablename__ = "ride_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_number = Column(String(50), unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("customer_vehicles.id"), nullable=False)
    dispatcher_id = Column(Integer, ForeignKey("dispatchers.id"), nullable=False)
    pickup_location = Column(String(255), nullable=False)
    destination_location = Column(String(255), nullable=False)
    return_location = Column(String(255), nullable=True)
    ride_duration_hours = Column(Integer, nullable=False)
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    driver_share = Column(Numeric(10, 2), nullable=False)
    admin_share = Column(Numeric(10, 2), nullable=False)
    dispatcher_share = Column(Numeric(10, 2), nullable=False)
    super_admin_share = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(
        SAEnum(TransactionStatus),
        default=TransactionStatus.REQUESTED,
        nullable=False,
    )
    is_paid = Column(Boolean, default=False, nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer = relationship("Customer")
    driver = relationship("Driver")
    vehicle = relationship("CustomerVehicle")
    dispatcher = relationship("Dispatcher")
    events = relationship(
        "RideTransactionEvent",
        back_populates="transaction",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payments = relationship(
        "PaymentTransaction",
        back_populates="ride_transaction",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    ride_transaction_id = Column(
        Integer, ForeignKey("ride_transactions.id", ondelete="CASCADE"), nullable=False
    )
    payment_method = Column(
        SAEnum(PaymentMethod),
        nullable=False,
    )
    amount = Column(Numeric(10, 2), nullable=False)
    payer_type = Column(
        SAEnum(PaymentPayerType),
        nullable=False,
    )
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    status = Column(
        SAEnum(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ride_transaction = relationship("RideTransaction", back_populates="payments")


class RideTransactionEvent(Base):
    __tablename__ = "ride_transaction_events"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("ride_transactions.id", ondelete="CASCADE"), nullable=False
    )
    event = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    transaction = relationship("RideTransaction", back_populates="events")
