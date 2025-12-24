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
    LargeBinary,
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
    TENANT_ADMIN = "TENANT_ADMIN"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customers = relationship("Customer", back_populates="tenant")
    drivers = relationship("Driver", back_populates="tenant")
    dispatchers = relationship("Dispatcher", back_populates="tenant")
    admin_users = relationship("User", back_populates="tenant")
    ride_transactions = relationship("RideTransaction", back_populates="tenant")
    payment_transactions = relationship("PaymentTransaction", back_populates="tenant")
    saved_payment_methods = relationship("SavedPaymentMethod", back_populates="tenant")


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
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    dispatcher_id = Column(Integer, ForeignKey("dispatchers.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="admin_users")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customers")

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
    
    # Registration fee fields
    registration_fee_amount = Column(Numeric(10, 2), default=500, nullable=False)  # Default ₹500
    registration_fee_paid = Column(Boolean, default=False, nullable=False)
    registration_fee_paid_at = Column(DateTime(timezone=True), nullable=True)
    registration_fee_payment_id = Column(String(100), nullable=True)
    registration_fee_deducted = Column(Boolean, default=False, nullable=False)  # Track if deducted from earnings
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="drivers")

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
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="dispatchers")


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
    STRIPE = "STRIPE"
    PHONEPE = "PHONEPE"
    GOOGLEPAY = "GOOGLEPAY"
    PAYTM = "PAYTM"
    UPI = "UPI"
    QR_CODE = "QR_CODE"
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
    friendly_booking_id = Column(String(50), unique=True, index=True, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("customer_vehicles.id"), nullable=False)
    dispatcher_id = Column(Integer, ForeignKey("dispatchers.id"), nullable=False)
    pickup_location = Column(String(255), nullable=False)
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="ride_transactions")
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
    
    # Driver expense breakdown fields
    food_bill = Column(Numeric(10, 2), default=0, nullable=True)
    outstation_bill = Column(Numeric(10, 2), default=0, nullable=True)
    toll_fees = Column(Numeric(10, 2), default=0, nullable=True)
    accommodation_bill = Column(Numeric(10, 2), default=0, nullable=True)
    late_fine = Column(Numeric(10, 2), default=0, nullable=True)
    pickup_location_fare = Column(Numeric(10, 2), default=0, nullable=True)
    accommodation_included = Column(Boolean, default=False, nullable=True)
    
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
    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_payment_method_id = Column(String(100), nullable=True)
    stripe_charge_id = Column(String(100), nullable=True)
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
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="payment_transactions")
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


class SavedPaymentMethod(Base):
    __tablename__ = "saved_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(
        Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    upi_id = Column(String(100), nullable=True)  # For UPI payments
    card_last4 = Column(String(4), nullable=True)  # Last 4 digits of card
    card_brand = Column(String(50), nullable=True)  # Visa, Mastercard, etc.
    razorpay_customer_id = Column(String(100), nullable=True)  # Razorpay customer ID
    razorpay_token = Column(String(100), nullable=True)  # Razorpay token for saved card
    is_default = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    nickname = Column(String(100), nullable=True)  # User-friendly name like "My PhonePe"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="saved_payment_methods")


class PaymentScreenshot(Base):
    __tablename__ = "payment_screenshots"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("ride_transactions.id", ondelete="CASCADE"), nullable=False
    )
    screenshot_data = Column(LargeBinary, nullable=False)  # Store image as binary
    screenshot_url = Column(String(500), nullable=True)  # Optional: store cloud URL
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    transaction = relationship("RideTransaction")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    verifier = relationship("User", foreign_keys=[verified_by])
    tenant = relationship("Tenant")


class ErrorChatMessage(Base):
    __tablename__ = "error_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("ride_transactions.id", ondelete="CASCADE"), nullable=False
    )
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_type = Column(SAEnum(UserRole), nullable=False)  # CUSTOMER, DRIVER, DISPATCHER, etc.
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign key relationships
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    
    # Relationships
    transaction = relationship("RideTransaction")
    sender = relationship("User")
    tenant = relationship("Tenant")
