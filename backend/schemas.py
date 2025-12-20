from decimal import Decimal
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, model_validator

from models import PaymentMethod, TransactionStatus


class SavedPaymentMethodCreate(BaseModel):
    payment_method: PaymentMethod
    upi_id: Optional[str] = None
    nickname: Optional[str] = None
    is_default: bool = False


class SavedPaymentMethodResponse(BaseModel):
    id: int
    customer_id: int
    payment_method: PaymentMethod
    upi_id: Optional[str] = None
    card_last4: Optional[str] = None
    card_brand: Optional[str] = None
    is_default: bool
    is_active: bool
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AddressBase(BaseModel):
    address_line: str = Field(..., max_length=255)
    city: str = Field(..., max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(..., max_length=100)
    is_primary: bool = False


class ContactNumberBase(BaseModel):
    label: str = Field(..., max_length=50)
    phone_number: str = Field(..., max_length=20)
    is_primary: bool = False


class NameOnlyBase(BaseModel):
    name: str


class AddressCreate(AddressBase):
    pass


class ContactNumberCreate(ContactNumberBase):
    pass


class CustomerBase(NameOnlyBase):
    email: EmailStr


class CustomerCreate(CustomerBase):
    addresses: List[AddressCreate]
    contact_numbers: List[ContactNumberCreate]

    @model_validator(mode="after")
    def validate_primary_records(self):
        if not self.addresses:
            raise ValueError("At least one address is required")
        if not self.contact_numbers:
            raise ValueError("At least one contact number is required")

        primary_addresses = [addr for addr in self.addresses if addr.is_primary]
        if len(primary_addresses) != 1:
            raise ValueError("Exactly one primary address must be selected")

        primary_contacts = [
            contact for contact in self.contact_numbers if contact.is_primary
        ]
        if len(primary_contacts) != 1:
            raise ValueError("Exactly one primary contact number must be selected")

        return self


class AddressResponse(AddressBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContactNumberResponse(ContactNumberBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerResponse(CustomerBase):
    id: int
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    addresses: List[AddressResponse]
    contact_numbers: List[ContactNumberResponse]

    class Config:
        from_attributes = True


class DriverAddressCreate(AddressBase):
    pass


class DriverContactNumberCreate(ContactNumberBase):
    pass


class DriverCreate(NameOnlyBase):
    addresses: List[DriverAddressCreate]
    contact_numbers: List[DriverContactNumberCreate]

    @model_validator(mode="after")
    def validate_primary_records(self):
        if not self.addresses:
            raise ValueError("At least one address is required for driver")
        if not self.contact_numbers:
            raise ValueError("At least one contact number is required for driver")

        primary_addresses = [addr for addr in self.addresses if addr.is_primary]
        if len(primary_addresses) != 1:
            raise ValueError("Exactly one primary address must be selected for driver")

        primary_contacts = [
            contact for contact in self.contact_numbers if contact.is_primary
        ]
        if len(primary_contacts) != 1:
            raise ValueError("Exactly one primary contact number must be selected for driver")

        return self


class DriverAddressResponse(AddressResponse):
    pass


class DriverContactNumberResponse(ContactNumberResponse):
    pass


class DriverResponse(NameOnlyBase):
    id: int
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    addresses: List[DriverAddressResponse]
    contact_numbers: List[DriverContactNumberResponse]

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    dispatcher_id: int
    customer_id: int
    driver_id: int
    vehicle_id: int
    pickup_location: str = Field(..., max_length=255)
    destination_location: str = Field(..., max_length=255)
    return_location: Optional[str] = Field(None, max_length=255)
    ride_duration_hours: int = Field(..., gt=0)
    payment_method: PaymentMethod


class BookingEventResponse(BaseModel):
    id: int
    event: str
    description: str
    timestamp: datetime

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    id: int
    transaction_number: str
    dispatcher_id: int
    customer_id: int
    driver_id: int
    vehicle_id: int
    customer: Optional[CustomerResponse] = None
    driver: Optional[DriverResponse] = None
    pickup_location: str
    destination_location: str
    return_location: Optional[str]
    ride_duration_hours: int
    payment_method: PaymentMethod
    total_amount: Decimal
    driver_share: Decimal
    admin_share: Decimal
    dispatcher_share: Decimal
    status: TransactionStatus
    is_paid: bool
    paid_amount: Decimal
    created_at: datetime
    updated_at: datetime
    events: List[BookingEventResponse]

    class Config:
        from_attributes = True


# Authentication Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)  # Pattern validation done in endpoint, not in schema
    role: str = Field(default="CUSTOMER")
    customer_id: Optional[int] = None
    driver_id: Optional[int] = None
    dispatcher_id: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    is_verified: bool
    customer_id: Optional[int] = None
    driver_id: Optional[int] = None
    dispatcher_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)  # Pattern validation done in endpoint, not in schema
