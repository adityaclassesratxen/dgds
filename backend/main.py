from decimal import Decimal
from typing import Optional, Callable
import os
from datetime import datetime, timedelta
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import case
from database import SessionLocal, engine, Base
from models import (
    Customer,
    CustomerAddress,
    ContactNumber,
    Driver,
    DriverAddress,
    DriverContactNumber,
    Dispatcher,
    AdminContact,
    SuperAdmin,
    RideTransaction,
    RideTransactionEvent,
    CustomerVehicle,
    PaymentTransaction,
    PaymentMethod,
    PaymentPayerType,
    PaymentStatus,
    User,
    UserRole,
    Tenant,
)
from schemas import (
    CustomerCreate,
    CustomerResponse,
    DriverCreate,
    DriverResponse,
    BookingCreate,
    BookingResponse,
    UserLogin,
    UserRegister,
    Token,
    UserResponse,
    PasswordChange,
)
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_dispatcher,
    require_driver
)
from tenant_filter import get_tenant_filter, apply_tenant_filter
from dependencies import get_translator, create_error_response, create_success_response

# Import ACCESS_TOKEN_EXPIRE_MINUTES from auth module
from auth import ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DGDS Clone API", version="1.0.0")

# Startup event to auto-seed database
@app.on_event("startup")
async def startup_event():
    """Run database seeding on startup"""
    try:
        from fix_login_and_setup_tenants import setup_default_tenants, create_super_admin
        print("🚀 Running database initialization...")
        setup_default_tenants()
        create_super_admin()
        print("✅ Database initialization complete")
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        # Don't fail startup if seeding fails

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/register", response_model=UserResponse)
async def register_customer(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new customer with login credentials"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if customer already exists
    existing_customer = db.query(Customer).filter(Customer.email == user_data.email).first()
    if existing_customer:
        raise HTTPException(status_code=400, detail="Email already registered as customer")
    
    # Create customer
    db_customer = Customer(name=user_data.name, email=user_data.email)
    
    # Add primary address if provided
    if user_data.address:
        db_customer.addresses = [
            CustomerAddress(
                address_line=user_data.address.address_line,
                city=user_data.address.city,
                state=user_data.address.state,
                postal_code=user_data.address.postal_code,
                country=user_data.address.country,
                is_primary=True,
            )
        ]
    
    # Add primary contact if provided
    if user_data.phone:
        db_customer.contact_numbers = [
            ContactNumber(
                label="Primary",
                phone_number=user_data.phone,
                is_primary=True,
            )
        ]
    
    db.add(db_customer)
    db.flush()  # Get the customer ID
    
    # Create user account linked to customer
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        role=UserRole.CUSTOMER,
        customer_id=db_customer.id,
        is_active=True,
        is_verified=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {
        "id": db_user.id,
        "email": db_user.email,
        "role": db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
        "is_active": db_user.is_active,
        "is_verified": db_user.is_verified,
        "customer_id": db_customer.id,
        "driver_id": None,
        "dispatcher_id": None,
        "created_at": db_user.created_at
    }

    if user.customer_id:
        customer = db.query(Customer).filter(Customer.id == user.customer_id).first()
        if customer:
            user_info["customer_name"] = customer.name
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_info
    }

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    
    user_info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "customer_id": current_user.customer_id,
        "driver_id": current_user.driver_id,
        "dispatcher_id": current_user.dispatcher_id,
        "created_at": current_user.created_at
    }
    
    return user_info

# ============================================================================
# TENANT MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/tenants/")
async def get_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tenants - accessible by ALL authenticated users for tenant selection"""
    # All users can view tenants to select which company/tenant they're working with
    tenants = db.query(Tenant).all()
    return [
        {
            "id": tenant.id,
            "name": tenant.name,
            "code": tenant.code,
            "description": tenant.description,
            "is_active": tenant.is_active,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        }
        for tenant in tenants
    ]

@app.post("/api/tenants/")
async def create_tenant(
    tenant_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tenant - only accessible by SUPER_ADMIN"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can create tenants")
    
    # Check if tenant code already exists
    existing = db.query(Tenant).filter(Tenant.code == tenant_data.get("code")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant code already exists")
    
    new_tenant = Tenant(
        name=tenant_data.get("name"),
        code=tenant_data.get("code"),
        description=tenant_data.get("description", ""),
        is_active=tenant_data.get("is_active", True)
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    return {
        "id": new_tenant.id,
        "name": new_tenant.name,
        "code": new_tenant.code,
        "description": new_tenant.description,
        "is_active": new_tenant.is_active,
        "created_at": new_tenant.created_at.isoformat()
    }

@app.put("/api/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: int,
    tenant_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a tenant - only accessible by SUPER_ADMIN"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can update tenants")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update fields
    if "name" in tenant_data:
        tenant.name = tenant_data["name"]
    if "description" in tenant_data:
        tenant.description = tenant_data["description"]
    if "is_active" in tenant_data:
        tenant.is_active = tenant_data["is_active"]
    
    db.commit()
    db.refresh(tenant)
    
    return {
        "id": tenant.id,
        "name": tenant.name,
        "code": tenant.code,
        "description": tenant.description,
        "is_active": tenant.is_active,
        "created_at": tenant.created_at.isoformat()
    }

@app.delete("/api/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a tenant - only accessible by SUPER_ADMIN"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete tenants")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check if tenant has data
    customer_count = db.query(Customer).filter(Customer.tenant_id == tenant_id).count()
    if customer_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete tenant with existing data ({customer_count} customers)"
        )
    
    db.delete(tenant)
    db.commit()
    
    return {"message": "Tenant deleted successfully"}

# ============================================================================
# DASHBOARD STATISTICS ENDPOINTS
# ============================================================================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Get dashboard statistics"""
    
    # Get recent transactions (last 7) - tenant filtered
    recent_tx_query = db.query(RideTransaction).filter(
        RideTransaction.created_at >= datetime.now() - timedelta(days=7)
    )
    recent_tx_query = apply_tenant_filter(recent_tx_query, RideTransaction, tenant_filter)
    recent_transactions = recent_tx_query.order_by(RideTransaction.created_at.desc()).limit(7).all()
    
    # Get customer stats - tenant filtered
    customers_query = db.query(Customer).filter(Customer.is_archived == False)
    customers_query = apply_tenant_filter(customers_query, Customer, tenant_filter)
    total_customers = customers_query.count()
    
    # Get last logged in user (excluding current user) - tenant filtered if applicable
    last_login_query = db.query(User).filter(
        User.last_login.isnot(None),
        User.id != current_user.id
    )
    # For non-admin users, only show users from their tenant
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        last_login_query = last_login_query.filter(User.tenant_id == current_user.tenant_id)
    last_login = last_login_query.order_by(User.last_login.desc()).first()
    
    # Get active drivers - tenant filtered
    active_drivers_query = db.query(Driver)
    active_drivers_query = apply_tenant_filter(active_drivers_query, Driver, tenant_filter)
    active_drivers = active_drivers_query.order_by(Driver.created_at.desc()).limit(5).all()
    
    # Get active customers - tenant filtered
    active_customers_query = db.query(Customer).filter(Customer.is_archived == False)
    active_customers_query = apply_tenant_filter(active_customers_query, Customer, tenant_filter)
    active_customers = active_customers_query.order_by(Customer.created_at.desc()).limit(5).all()
    
    # Get active dispatchers - tenant filtered
    active_dispatchers_query = db.query(Dispatcher).filter(Dispatcher.is_archived == False)
    active_dispatchers_query = apply_tenant_filter(active_dispatchers_query, Dispatcher, tenant_filter)
    active_dispatchers = active_dispatchers_query.order_by(Dispatcher.created_at.desc()).limit(5).all()
    
    # Get recent bookings - tenant filtered
    recent_bookings_query = db.query(RideTransaction)
    recent_bookings_query = apply_tenant_filter(recent_bookings_query, RideTransaction, tenant_filter)
    recent_bookings = recent_bookings_query.order_by(RideTransaction.created_at.desc()).limit(5).all()
    
    return {
        "recent_transactions": [
            {
                "id": tx.id,
                "transaction_number": tx.transaction_number,
                "pickup_location": tx.pickup_location,
                "destination_location": tx.destination_location,
                "status": tx.status.value if hasattr(tx.status, 'value') else tx.status,
                "created_at": tx.created_at.isoformat(),
                "customer_name": tx.customer.name if tx.customer else "N/A"
            }
            for tx in recent_transactions
        ],
        "customer_stats": {
            "total": total_customers,
            "recent_this_week": db.query(Customer).filter(
                Customer.created_at >= datetime.now() - timedelta(days=7)
            ).count()
        },
        "last_login": {
            "email": last_login.email if last_login else None,
            "last_login": last_login.last_login.isoformat() if last_login and last_login.last_login else None,
            "role": last_login.role.value if last_login and hasattr(last_login.role, 'value') else (last_login.role if last_login else None)
        },
        "active_drivers": [
            {
                "id": driver.id,
                "name": driver.name,
                "created_at": driver.created_at.isoformat() if driver.created_at else None
            }
            for driver in active_drivers
        ],
        "active_customers": [
            {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "created_at": customer.created_at.isoformat() if customer.created_at else None
            }
            for customer in active_customers
        ],
        "active_dispatchers": [
            {
                "id": dispatcher.id,
                "name": dispatcher.name,
                "email": dispatcher.email,
                "contact_number": dispatcher.contact_number
            }
            for dispatcher in active_dispatchers
        ],
        "recent_bookings": [
            {
                "id": booking.id,
                "transaction_number": booking.transaction_number,
                "customer_name": booking.customer.name if booking.customer else "N/A",
                "driver_name": booking.driver.name if booking.driver else "Not Assigned",
                "created_at": booking.created_at.isoformat()
            }
            for booking in recent_bookings
        ]
    }

@app.post("/api/customers/", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    existing_customer = (
        db.query(Customer).filter(Customer.email == customer.email).first()
    )
    if existing_customer:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Determine tenant_id for the new customer
    if tenant_filter is not None:
        # Admin/Super Admin creating for a specific tenant
        customer_tenant_id = tenant_filter
    elif current_user.tenant_id:
        # Non-admin users create in their own tenant
        customer_tenant_id = current_user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="Cannot determine tenant for customer creation")

    db_customer = Customer(name=customer.name, email=customer.email, tenant_id=customer_tenant_id)

    db_customer.addresses = [
        CustomerAddress(
            address_line=addr.address_line,
            city=addr.city,
            state=addr.state,
            postal_code=addr.postal_code,
            country=addr.country,
            is_primary=addr.is_primary,
        )
        for addr in customer.addresses
    ]

    db_customer.contact_numbers = [
        ContactNumber(
            label=contact.label,
            phone_number=contact.phone_number,
            is_primary=contact.is_primary,
        )
        for contact in customer.contact_numbers
    ]

    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.get("/api/customers/", response_model=list[CustomerResponse])
async def get_customers(
    skip: int = 0, 
    limit: int = 100, 
    include_archived: bool = False, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Customer)
    query = apply_tenant_filter(query, Customer, tenant_filter)
    if not include_archived:
        query = query.filter(Customer.is_archived == False)
    customers = query.offset(skip).limit(limit).all()
    return customers


@app.get("/api/customers/{customer_id}")
async def get_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Customer).filter(Customer.id == customer_id)
    query = apply_tenant_filter(query, Customer, tenant_filter)
    customer = query.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "is_archived": customer.is_archived,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "addresses": [
            {"id": a.id, "address_line": a.address_line, "city": a.city, "state": a.state, "postal_code": a.postal_code, "country": a.country, "is_primary": a.is_primary}
            for a in customer.addresses
        ],
        "contact_numbers": [
            {"id": c.id, "label": c.label, "phone_number": c.phone_number, "is_primary": c.is_primary}
            for c in customer.contact_numbers
        ],
    }


class CustomerUpdate(BaseModel):
    name: str = None
    email: str = None


@app.put("/api/customers/{customer_id}")
async def update_customer(
    customer_id: int, 
    customer_data: CustomerUpdate, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Customer).filter(Customer.id == customer_id)
    query = apply_tenant_filter(query, Customer, tenant_filter)
    customer = query.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer_data.name:
        customer.name = customer_data.name
    if customer_data.email:
        customer.email = customer_data.email
    db.commit()
    db.refresh(customer)
    return {"message": "Customer updated", "id": customer.id, "name": customer.name, "email": customer.email}


@app.delete("/api/customers/{customer_id}")
async def archive_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Customer).filter(Customer.id == customer_id)
    query = apply_tenant_filter(query, Customer, tenant_filter)
    customer = query.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_archived = True
    db.commit()
    return {"message": "Customer archived", "id": customer_id}


@app.post("/api/customers/{customer_id}/restore")
async def restore_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Customer).filter(Customer.id == customer_id)
    query = apply_tenant_filter(query, Customer, tenant_filter)
    customer = query.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_archived = False
    db.commit()
    return {"message": "Customer restored", "id": customer_id}


@app.get("/api/transactions/", response_model=list[BookingResponse])
async def get_transactions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(RideTransaction)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)
    transactions = query.offset(skip).limit(limit).all()
    return transactions


@app.post("/api/drivers/", response_model=DriverResponse)
async def create_driver(
    driver: DriverCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    existing_driver = (
        db.query(Driver).filter(Driver.name == driver.name).first()
    )
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver name already exists")

    # Determine tenant_id for the new driver
    if tenant_filter is not None:
        driver_tenant_id = tenant_filter
    elif current_user.tenant_id:
        driver_tenant_id = current_user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="Cannot determine tenant for driver creation")

    db_driver = Driver(name=driver.name, tenant_id=driver_tenant_id)

    db_driver.addresses = [
        DriverAddress(
            address_line=addr.address_line,
            city=addr.city,
            state=addr.state,
            postal_code=addr.postal_code,
            country=addr.country,
            is_primary=addr.is_primary,
        )
        for addr in driver.addresses
    ]

    db_driver.contact_numbers = [
        DriverContactNumber(
            label=contact.label,
            phone_number=contact.phone_number,
            is_primary=contact.is_primary,
        )
        for contact in driver.contact_numbers
    ]

    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


@app.get("/api/drivers/", response_model=list[DriverResponse])
async def get_drivers(
    skip: int = 0, 
    limit: int = 100, 
    include_archived: bool = False, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Driver)
    query = apply_tenant_filter(query, Driver, tenant_filter)
    if not include_archived:
        query = query.filter(Driver.is_archived == False)
    drivers = query.offset(skip).limit(limit).all()
    return drivers


@app.get("/api/drivers/{driver_id}")
async def get_driver(
    driver_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Driver).filter(Driver.id == driver_id)
    query = apply_tenant_filter(query, Driver, tenant_filter)
    driver = query.first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {
        "id": driver.id,
        "name": driver.name,
        "is_archived": driver.is_archived,
        "created_at": driver.created_at.isoformat() if driver.created_at else None,
        "addresses": [
            {"id": a.id, "address_line": a.address_line, "city": a.city, "state": a.state, "postal_code": a.postal_code, "country": a.country, "is_primary": a.is_primary}
            for a in driver.addresses
        ],
        "contact_numbers": [
            {"id": c.id, "label": c.label, "phone_number": c.phone_number, "is_primary": c.is_primary}
            for c in driver.contact_numbers
        ],
    }


class DriverUpdate(BaseModel):
    name: str = None


@app.put("/api/drivers/{driver_id}")
async def update_driver(
    driver_id: int, 
    driver_data: DriverUpdate, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Driver).filter(Driver.id == driver_id)
    query = apply_tenant_filter(query, Driver, tenant_filter)
    driver = query.first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if driver_data.name:
        driver.name = driver_data.name
    db.commit()
    db.refresh(driver)
    return {"message": "Driver updated", "id": driver.id, "name": driver.name}


@app.delete("/api/drivers/{driver_id}")
async def archive_driver(
    driver_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Driver).filter(Driver.id == driver_id)
    query = apply_tenant_filter(query, Driver, tenant_filter)
    driver = query.first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_archived = True
    db.commit()
    return {"message": "Driver archived", "id": driver_id}


@app.post("/api/drivers/{driver_id}/restore")
async def restore_driver(
    driver_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Driver).filter(Driver.id == driver_id)
    query = apply_tenant_filter(query, Driver, tenant_filter)
    driver = query.first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_archived = False
    db.commit()
    return {"message": "Driver restored", "id": driver_id}


@app.get("/api/dispatchers/")
async def get_dispatchers(
    skip: int = 0, 
    limit: int = 100, 
    include_archived: bool = False, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Dispatcher)
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    if not include_archived:
        query = query.filter(Dispatcher.is_archived == False)
    dispatchers = query.offset(skip).limit(limit).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "contact_number": d.contact_number,
            "email": d.email,
            "is_archived": d.is_archived,
        }
        for d in dispatchers
    ]


@app.get("/api/dispatchers/{dispatcher_id}")
async def get_dispatcher(
    dispatcher_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Dispatcher).filter(Dispatcher.id == dispatcher_id)
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    dispatcher = query.first()
    if not dispatcher:
        raise HTTPException(status_code=404, detail="Dispatcher not found")
    return {
        "id": dispatcher.id,
        "name": dispatcher.name,
        "contact_number": dispatcher.contact_number,
        "email": dispatcher.email,
        "is_archived": dispatcher.is_archived,
        "created_at": dispatcher.created_at.isoformat() if dispatcher.created_at else None,
    }


class DispatcherCreate(BaseModel):
    name: str
    contact_number: str
    email: str


class DispatcherUpdate(BaseModel):
    name: str = None
    contact_number: str = None
    email: str = None


@app.post("/api/dispatchers/")
async def create_dispatcher(
    dispatcher: DispatcherCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    # Determine tenant_id for the new dispatcher
    if tenant_filter is not None:
        dispatcher_tenant_id = tenant_filter
    elif current_user.tenant_id:
        dispatcher_tenant_id = current_user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="Cannot determine tenant for dispatcher creation")

    db_dispatcher = Dispatcher(
        name=dispatcher.name,
        contact_number=dispatcher.contact_number,
        email=dispatcher.email,
        tenant_id=dispatcher_tenant_id,
    )
    db.add(db_dispatcher)
    db.commit()
    db.refresh(db_dispatcher)
    return {
        "id": db_dispatcher.id,
        "name": db_dispatcher.name,
        "contact_number": db_dispatcher.contact_number,
        "email": db_dispatcher.email,
    }


@app.put("/api/dispatchers/{dispatcher_id}")
async def update_dispatcher(
    dispatcher_id: int, 
    dispatcher_data: DispatcherUpdate, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Dispatcher).filter(Dispatcher.id == dispatcher_id)
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    dispatcher = query.first()
    if not dispatcher:
        raise HTTPException(status_code=404, detail="Dispatcher not found")
    if dispatcher_data.name:
        dispatcher.name = dispatcher_data.name
    if dispatcher_data.contact_number:
        dispatcher.contact_number = dispatcher_data.contact_number
    if dispatcher_data.email:
        dispatcher.email = dispatcher_data.email
    db.commit()
    db.refresh(dispatcher)
    return {"message": "Dispatcher updated", "id": dispatcher.id, "name": dispatcher.name}


@app.delete("/api/dispatchers/{dispatcher_id}")
async def archive_dispatcher(
    dispatcher_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Dispatcher).filter(Dispatcher.id == dispatcher_id)
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    dispatcher = query.first()
    if not dispatcher:
        raise HTTPException(status_code=404, detail="Dispatcher not found")
    dispatcher.is_archived = True
    db.commit()
    return {"message": "Dispatcher archived", "id": dispatcher_id}


@app.post("/api/dispatchers/{dispatcher_id}/restore")
async def restore_dispatcher(
    dispatcher_id: int, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(Dispatcher).filter(Dispatcher.id == dispatcher_id)
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    dispatcher = query.first()
    if not dispatcher:
        raise HTTPException(status_code=404, detail="Dispatcher not found")
    dispatcher.is_archived = False
    db.commit()
    return {"message": "Dispatcher restored", "id": dispatcher_id}


@app.get("/api/vehicles/")
async def get_vehicles(
    skip: int = 0, 
    limit: int = 100, 
    customer_id: Optional[int] = None, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(CustomerVehicle).join(Customer)
    # Apply tenant filter through Customer relationship
    if tenant_filter is not None:
        query = query.filter(Customer.tenant_id == tenant_filter)
    if customer_id:
        query = query.filter(CustomerVehicle.customer_id == customer_id)
    vehicles = query.offset(skip).limit(limit).all()
    return [
        {
            "id": v.id,
            "registration_number": v.registration_number,
            "nickname": v.nickname,
            "make": v.vehicle_make,
            "model": v.vehicle_model,
            "vehicle_type": v.vehicle_type,
            "is_automatic": v.is_automatic,
            "transmission_type": v.transmission_type,
            "customer_id": v.customer_id,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in vehicles
    ]


class VehicleCreate(BaseModel):
    customer_id: int
    nickname: str
    vehicle_make: str
    vehicle_model: str
    vehicle_type: str = "Sedan"
    is_automatic: bool = True
    transmission_type: str = "automatic"
    registration_number: str
    additional_details: str = None


@app.post("/api/vehicles/")
async def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    # Check if customer exists
    customer = db.query(Customer).filter(Customer.id == vehicle.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if registration number is unique
    existing = db.query(CustomerVehicle).filter(
        CustomerVehicle.registration_number == vehicle.registration_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle with this registration number already exists")
    
    db_vehicle = CustomerVehicle(
        customer_id=vehicle.customer_id,
        nickname=vehicle.nickname,
        vehicle_make=vehicle.vehicle_make,
        vehicle_model=vehicle.vehicle_model,
        vehicle_type=vehicle.vehicle_type,
        is_automatic=vehicle.is_automatic,
        transmission_type=vehicle.transmission_type,
        registration_number=vehicle.registration_number,
        additional_details=vehicle.additional_details,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return {
        "id": db_vehicle.id,
        "nickname": db_vehicle.nickname,
        "registration_number": db_vehicle.registration_number,
        "customer_id": db_vehicle.customer_id,
        "message": "Vehicle created successfully"
    }


@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(CustomerVehicle).filter(CustomerVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "nickname": vehicle.nickname,
        "make": vehicle.vehicle_make,
        "model": vehicle.vehicle_model,
        "type": vehicle.vehicle_type,
        "customer_id": vehicle.customer_id,
        "is_automatic": vehicle.is_automatic,
        "transmission_type": vehicle.transmission_type,
        "additional_details": vehicle.additional_details,
    }


@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(CustomerVehicle).filter(CustomerVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted", "id": vehicle_id}


def generate_transaction_number(db: Session) -> str:
    count = db.query(RideTransaction).count() + 1
    return f"TXN-{count:05}"


@app.post("/api/bookings/", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    # Determine tenant_id for the new booking
    if tenant_filter is not None:
        booking_tenant_id = tenant_filter
    elif current_user.tenant_id:
        booking_tenant_id = current_user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="Cannot determine tenant for booking creation")

    # Ensure dispatcher, customer, driver, vehicle exist and belong to the same tenant
    dispatcher = db.query(Dispatcher).filter(
        Dispatcher.id == booking.dispatcher_id,
        Dispatcher.tenant_id == booking_tenant_id
    ).first()
    if not dispatcher:
        raise HTTPException(status_code=404, detail="Dispatcher not found or not in your tenant")

    customer = db.query(Customer).filter(
        Customer.id == booking.customer_id,
        Customer.tenant_id == booking_tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found or not in your tenant")

    driver = db.query(Driver).filter(
        Driver.id == booking.driver_id,
        Driver.tenant_id == booking_tenant_id
    ).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found or not in your tenant")

    vehicle = db.query(CustomerVehicle).filter(
        CustomerVehicle.id == booking.vehicle_id,
        CustomerVehicle.tenant_id == booking_tenant_id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or not in your tenant")

    import os
    hourly_rate = int(os.getenv("HOURLY_RATE", "400"))
    driver_pct = Decimal(os.getenv("DRIVER_COMMISSION_PERCENT", "75")) / 100
    admin_pct = Decimal(os.getenv("ADMIN_COMMISSION_PERCENT", "20")) / 100
    dispatcher_pct = Decimal(os.getenv("DISPATCHER_COMMISSION_PERCENT", "2")) / 100
    super_admin_pct = Decimal(os.getenv("SUPER_ADMIN_COMMISSION_PERCENT", "3")) / 100

    total_amount = hourly_rate * booking.ride_duration_hours
    driver_share = total_amount * driver_pct
    admin_share = total_amount * admin_pct
    dispatcher_share = total_amount * dispatcher_pct
    super_admin_share = total_amount * super_admin_pct

    transaction = RideTransaction(
        transaction_number=generate_transaction_number(db),
        dispatcher_id=booking.dispatcher_id,
        customer_id=booking.customer_id,
        driver_id=booking.driver_id,
        vehicle_id=booking.vehicle_id,
        pickup_location=booking.pickup_location,
        destination_location=booking.destination_location,
        return_location=booking.return_location,
        ride_duration_hours=booking.ride_duration_hours,
        payment_method=booking.payment_method,
        total_amount=total_amount,
        driver_share=driver_share,
        admin_share=admin_share,
        dispatcher_share=dispatcher_share,
        super_admin_share=super_admin_share,
        tenant_id=booking_tenant_id,
    )

    transaction.events = [
        RideTransactionEvent(
            event="BOOKING_CREATED",
            description="Dispatcher created booking with pickup/drop details",
        ),
        RideTransactionEvent(
            event="BOOKING_CONFIRMED",
            description="Dispatcher confirmed booking to driver and customer",
        ),
    ]

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@app.get("/api/bookings/", response_model=list[BookingResponse])
async def list_bookings(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(RideTransaction)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)
    bookings = (
        query.order_by(RideTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return bookings


@app.patch("/api/bookings/{transaction_id}/status")
async def update_booking_status(
    transaction_id: int,
    status: str,
    description: str = "Status updated",
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(RideTransaction).filter(RideTransaction.id == transaction_id)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)
    transaction = query.first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    valid_statuses = [
        "REQUESTED", "DRIVER_ACCEPTED", "ENROUTE_TO_PICKUP",
        "CUSTOMER_PICKED", "AT_DESTINATION", "RETURNING", "COMPLETED", "CANCELLED"
    ]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    transaction.status = status
    event = RideTransactionEvent(
        transaction_id=transaction_id,
        event=status,
        description=description,
    )
    db.add(event)
    db.commit()
    db.refresh(transaction)
    return {"message": f"Status updated to {status}", "transaction_id": transaction_id}


@app.patch("/api/bookings/{transaction_id}/payment")
async def mark_payment(
    transaction_id: int,
    paid_amount: float,
    payment_method: PaymentMethod = PaymentMethod.CASH,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    query = db.query(RideTransaction).filter(RideTransaction.id == transaction_id)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)
    transaction = query.first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Create payment transaction record
    payment = PaymentTransaction(
        ride_transaction_id=transaction_id,
        payment_method=payment_method,
        amount=Decimal(str(paid_amount)),
        payer_type=PaymentPayerType.CUSTOMER,
        status=PaymentStatus.SUCCESS,
    )
    db.add(payment)

    # Update ride transaction
    transaction.paid_amount = Decimal(str(paid_amount))
    transaction.is_paid = paid_amount >= float(transaction.total_amount)

    event = RideTransactionEvent(
        transaction_id=transaction_id,
        event="PAYMENT_RECEIVED",
        description=f"Payment of ₹{paid_amount} received via {payment_method.value}. {'Fully paid' if transaction.is_paid else 'Partial payment'}",
    )
    db.add(event)
    db.commit()
    db.refresh(transaction)
    return {
        "message": "Payment recorded",
        "paid_amount": float(transaction.paid_amount),
        "total_amount": float(transaction.total_amount),
        "is_paid": transaction.is_paid,
        "due_amount": float(transaction.total_amount) - float(transaction.paid_amount),
    }


@app.get("/api/summary/by-customer")
async def summary_by_customer(
    dispatcher_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    transaction_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from sqlalchemy import func as sqlfunc
    query = (
        db.query(
            Customer.id,
            Customer.name,
            Customer.email,
            sqlfunc.count(RideTransaction.id).label("total_trips"),
            sqlfunc.sum(RideTransaction.total_amount).label("total_amount"),
            sqlfunc.sum(RideTransaction.paid_amount).label("paid_amount"),
        )
        .outerjoin(RideTransaction, RideTransaction.customer_id == Customer.id)
    )
    
    # Apply tenant filter
    query = apply_tenant_filter(query, Customer, tenant_filter)
    if tenant_filter is not None:
        query = query.filter(RideTransaction.tenant_id == tenant_filter)
    
    # Apply filters
    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(Customer.id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))
    if date_from:
        query = query.filter(RideTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(RideTransaction.created_at <= date_to)
    
    results = query.group_by(Customer.id).all()
    return [
        {
            "customer_id": r.id,
            "name": r.name,
            "email": r.email,
            "total_trips": r.total_trips or 0,
            "total_amount": float(r.total_amount or 0),
            "paid_amount": float(r.paid_amount or 0),
            "due_amount": float((r.total_amount or 0) - (r.paid_amount or 0)),
        }
        for r in results
    ]


@app.get("/api/summary/by-driver")
async def summary_by_driver(
    dispatcher_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    transaction_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from sqlalchemy import func as sqlfunc
    query = (
        db.query(
            Driver.id,
            Driver.name,
            sqlfunc.count(RideTransaction.id).label("total_trips"),
            sqlfunc.sum(RideTransaction.driver_share).label("total_earnings"),
            sqlfunc.sum(
                case(
                    (RideTransaction.is_paid == True, RideTransaction.driver_share),
                    else_=0
                )
            ).label("paid_earnings"),
        )
        .outerjoin(RideTransaction, RideTransaction.driver_id == Driver.id)
    )
    
    # Apply tenant filter
    query = apply_tenant_filter(query, Driver, tenant_filter)
    if tenant_filter is not None:
        query = query.filter(RideTransaction.tenant_id == tenant_filter)
    
    # Apply filters
    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(Driver.id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))
    if date_from:
        query = query.filter(RideTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(RideTransaction.created_at <= date_to)
    
    results = query.group_by(Driver.id).all()
    return [
        {
            "driver_id": r.id,
            "name": r.name,
            "total_trips": r.total_trips or 0,
            "total_earnings": float(r.total_earnings or 0),
            "paid_earnings": float(r.paid_earnings or 0),
            "due_earnings": float((r.total_earnings or 0) - (r.paid_earnings or 0)),
        }
        for r in results
    ]


@app.get("/api/summary/by-dispatcher")
async def summary_by_dispatcher(
    dispatcher_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    transaction_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from sqlalchemy import func as sqlfunc
    query = (
        db.query(
            Dispatcher.id,
            Dispatcher.name,
            sqlfunc.count(RideTransaction.id).label("total_bookings"),
            sqlfunc.sum(RideTransaction.dispatcher_share).label("total_commission"),
            sqlfunc.sum(
                case(
                    (RideTransaction.is_paid == True, RideTransaction.dispatcher_share),
                    else_=0
                )
            ).label("paid_commission"),
        )
        .outerjoin(RideTransaction, RideTransaction.dispatcher_id == Dispatcher.id)
    )
    
    # Apply tenant filter
    query = apply_tenant_filter(query, Dispatcher, tenant_filter)
    if tenant_filter is not None:
        query = query.filter(RideTransaction.tenant_id == tenant_filter)
    
    # Apply filters
    if dispatcher_id:
        query = query.filter(Dispatcher.id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))
    if date_from:
        query = query.filter(RideTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(RideTransaction.created_at <= date_to)
    
    results = query.group_by(Dispatcher.id).all()
    return [
        {
            "dispatcher_id": r.id,
            "name": r.name,
            "total_bookings": r.total_bookings or 0,
            "total_commission": float(r.total_commission or 0),
            "paid_commission": float(r.paid_commission or 0),
            "due_commission": float((r.total_commission or 0) - (r.paid_commission or 0)),
        }
        for r in results
    ]


@app.get("/api/summary/transactions")
async def summary_transactions(
    dispatcher_id: int = None,
    driver_id: int = None,
    customer_id: int = None,
    transaction_number: str = None,
    date_from: str = None,
    date_to: str = None,
    date_preset: str = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime, timedelta

    query = db.query(RideTransaction)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)

    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))

    if date_preset:
        now = datetime.now()
        if date_preset == "7days":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=7))
        elif date_preset == "3months":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=90))
        elif date_preset == "1year":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=365))
    elif date_from or date_to:
        if date_from:
            query = query.filter(RideTransaction.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(RideTransaction.created_at <= datetime.fromisoformat(date_to))

    transactions = query.all()

    total = len(transactions)
    completed = sum(1 for t in transactions if t.status == "COMPLETED")
    paid = sum(1 for t in transactions if t.is_paid)
    total_amount = sum(float(t.total_amount) for t in transactions)
    paid_amount = sum(float(t.paid_amount) for t in transactions)

    return {
        "total_transactions": total,
        "completed_transactions": completed,
        "paid_transactions": paid,
        "pending_transactions": total - completed,
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "due_amount": total_amount - paid_amount,
    }


@app.get("/api/transactions/list")
async def list_transactions_filtered(
    dispatcher_id: int = None,
    driver_id: int = None,
    customer_id: int = None,
    transaction_number: str = None,
    status: str = None,
    date_from: str = None,
    date_to: str = None,
    date_preset: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from datetime import datetime, timedelta

    query = db.query(RideTransaction)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)

    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))
    if status:
        query = query.filter(RideTransaction.status == status)

    if date_preset:
        now = datetime.now()
        if date_preset == "7days":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=7))
        elif date_preset == "3months":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=90))
        elif date_preset == "1year":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=365))
    elif date_from or date_to:
        if date_from:
            query = query.filter(RideTransaction.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(RideTransaction.created_at <= datetime.fromisoformat(date_to))

    transactions = query.order_by(RideTransaction.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": t.id,
            "transaction_number": t.transaction_number,
            "customer_id": t.customer_id,
            "driver_id": t.driver_id,
            "dispatcher_id": t.dispatcher_id,
            "pickup_location": t.pickup_location,
            "destination_location": t.destination_location,
            "status": t.status.value if hasattr(t.status, 'value') else t.status,
            "total_amount": float(t.total_amount),
            "paid_amount": float(t.paid_amount),
            "due_amount": float(t.total_amount) - float(t.paid_amount),
            "is_paid": t.is_paid,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in transactions
    ]


@app.get("/api/summary/by-transaction")
async def summary_by_transaction(
    dispatcher_id: int = None,
    driver_id: int = None,
    customer_id: int = None,
    date_preset: str = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    from datetime import datetime, timedelta

    query = db.query(RideTransaction)
    query = apply_tenant_filter(query, RideTransaction, tenant_filter)

    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)

    if date_preset:
        now = datetime.now()
        if date_preset == "7days":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=7))
        elif date_preset == "3months":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=90))
        elif date_preset == "1year":
            query = query.filter(RideTransaction.created_at >= now - timedelta(days=365))

    transactions = query.order_by(RideTransaction.created_at.desc()).all()

    return [
        {
            "id": t.id,
            "transaction_number": t.transaction_number,
            "customer_name": t.customer.name if t.customer else "N/A",
            "driver_name": t.driver.name if t.driver else "N/A",
            "dispatcher_name": t.dispatcher.name if t.dispatcher else "N/A",
            "pickup_location": t.pickup_location,
            "destination_location": t.destination_location,
            "status": t.status.value if hasattr(t.status, 'value') else t.status,
            "total_amount": float(t.total_amount),
            "driver_share": float(t.driver_share),
            "admin_share": float(t.admin_share),
            "dispatcher_share": float(t.dispatcher_share),
            "super_admin_share": float(t.super_admin_share) if t.super_admin_share else 0,
            "paid_amount": float(t.paid_amount),
            "due_amount": float(t.total_amount) - float(t.paid_amount),
            "is_paid": t.is_paid,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in transactions
    ]


@app.get("/api/revenue-summary")
async def get_revenue_summary(
    dispatcher_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    transaction_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from sqlalchemy import func as sqlfunc
    from datetime import datetime
    
    query = db.query(RideTransaction)
    
    # Apply filters
    if dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == dispatcher_id)
    if driver_id:
        query = query.filter(RideTransaction.driver_id == driver_id)
    if customer_id:
        query = query.filter(RideTransaction.customer_id == customer_id)
    if transaction_number:
        query = query.filter(RideTransaction.transaction_number.ilike(f"%{transaction_number}%"))
    if date_from:
        query = query.filter(RideTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(RideTransaction.created_at <= date_to)
    
    # Calculate aggregates
    aggregates = query.with_entities(
        sqlfunc.sum(RideTransaction.total_amount).label('total_customer_revenue'),
        sqlfunc.sum(RideTransaction.paid_amount).label('total_paid_amount'),
        sqlfunc.sum(RideTransaction.driver_share).label('total_driver_share'),
        sqlfunc.sum(RideTransaction.admin_share).label('total_admin_share'),
        sqlfunc.sum(RideTransaction.dispatcher_share).label('total_dispatcher_share'),
        sqlfunc.sum(RideTransaction.super_admin_share).label('total_super_admin_share'),
        sqlfunc.sum(
            case((RideTransaction.is_paid == True, RideTransaction.driver_share), else_=0)
        ).label('paid_driver_amount'),
        sqlfunc.sum(
            case((RideTransaction.is_paid == True, RideTransaction.admin_share), else_=0)
        ).label('paid_admin_amount'),
        sqlfunc.sum(
            case((RideTransaction.is_paid == True, RideTransaction.dispatcher_share), else_=0)
        ).label('paid_dispatcher_amount'),
        sqlfunc.sum(
            case((RideTransaction.is_paid == True, RideTransaction.super_admin_share), else_=0)
        ).label('paid_super_admin_amount'),
        sqlfunc.count(RideTransaction.id).label('total_transactions'),
        sqlfunc.sum(
            case((RideTransaction.is_paid == True, 1), else_=0)
        ).label('paid_transactions')
    ).first()
    
    # Calculate due amounts
    total_customer_revenue = float(aggregates.total_customer_revenue or 0)
    total_paid_amount = float(aggregates.total_paid_amount or 0)
    total_due_amount = total_customer_revenue - total_paid_amount
    
    total_driver_share = float(aggregates.total_driver_share or 0)
    paid_driver_amount = float(aggregates.paid_driver_amount or 0)
    due_driver_amount = total_driver_share - paid_driver_amount
    
    total_admin_share = float(aggregates.total_admin_share or 0)
    paid_admin_amount = float(aggregates.paid_admin_amount or 0)
    due_admin_amount = total_admin_share - paid_admin_amount
    
    total_dispatcher_share = float(aggregates.total_dispatcher_share or 0)
    paid_dispatcher_amount = float(aggregates.paid_dispatcher_amount or 0)
    due_dispatcher_amount = total_dispatcher_share - paid_dispatcher_amount
    
    total_super_admin_share = float(aggregates.total_super_admin_share or 0)
    paid_super_admin_amount = float(aggregates.paid_super_admin_amount or 0)
    due_super_admin_amount = total_super_admin_share - paid_super_admin_amount
    
    return {
        "summary": {
            "total_transactions": aggregates.total_transactions or 0,
            "paid_transactions": aggregates.paid_transactions or 0,
            "unpaid_transactions": (aggregates.total_transactions or 0) - (aggregates.paid_transactions or 0)
        },
        "customer_revenue": {
            "total_revenue": total_customer_revenue,
            "paid_amount": total_paid_amount,
            "due_amount": total_due_amount
        },
        "driver_payments": {
            "total_earnings": total_driver_share,
            "paid_amount": paid_driver_amount,
            "due_amount": due_driver_amount
        },
        "admin_earnings": {
            "total_commission": total_admin_share,
            "paid_amount": paid_admin_amount,
            "due_amount": due_admin_amount
        },
        "dispatcher_commissions": {
            "total_commission": total_dispatcher_share,
            "paid_amount": paid_dispatcher_amount,
            "due_amount": due_dispatcher_amount
        },
        "super_admin_commissions": {
            "total_commission": total_super_admin_share,
            "paid_amount": paid_super_admin_amount,
            "due_amount": due_super_admin_amount
        },
        "commission_breakdown": {
            "driver_percent": int(os.getenv("DRIVER_COMMISSION_PERCENT", 75)),
            "admin_percent": int(os.getenv("ADMIN_COMMISSION_PERCENT", 20)),
            "dispatcher_percent": int(os.getenv("DISPATCHER_COMMISSION_PERCENT", 2)),
            "super_admin_percent": int(os.getenv("SUPER_ADMIN_COMMISSION_PERCENT", 3))
        }
    }


@app.get("/api/summary/by-payment")
async def summary_by_payment(
    payment_method: Optional[str] = None,
    payer_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Get payment settlement summary with details"""
    from sqlalchemy import func as sqlfunc
    
    query = db.query(PaymentTransaction).join(
        RideTransaction, PaymentTransaction.ride_transaction_id == RideTransaction.id
    ).join(Customer, RideTransaction.customer_id == Customer.id, isouter=True)
    
    # Apply tenant filter through RideTransaction
    if tenant_filter is not None:
        query = query.filter(RideTransaction.tenant_id == tenant_filter)
    
    if payment_method:
        query = query.filter(PaymentTransaction.payment_method == payment_method)
    if payer_type:
        query = query.filter(PaymentTransaction.payer_type == payer_type)
    if status:
        query = query.filter(PaymentTransaction.status == status)
    
    payments = query.order_by(PaymentTransaction.created_at.desc()).all()
    
    # Get summary by payment method
    method_summary = db.query(
        PaymentTransaction.payment_method,
        sqlfunc.count(PaymentTransaction.id).label('count'),
        sqlfunc.sum(PaymentTransaction.amount).label('total_amount'),
        sqlfunc.sum(case((PaymentTransaction.status == PaymentStatus.SUCCESS, PaymentTransaction.amount), else_=0)).label('success_amount'),
    ).group_by(PaymentTransaction.payment_method).all()
    
    # Get summary by payer type
    payer_summary = db.query(
        PaymentTransaction.payer_type,
        sqlfunc.count(PaymentTransaction.id).label('count'),
        sqlfunc.sum(PaymentTransaction.amount).label('total_amount'),
        sqlfunc.sum(case((PaymentTransaction.status == PaymentStatus.SUCCESS, PaymentTransaction.amount), else_=0)).label('success_amount'),
    ).group_by(PaymentTransaction.payer_type).all()
    
    return {
        "payments": [
            {
                "id": p.id,
                "ride_transaction_id": p.ride_transaction_id,
                "transaction_number": p.ride_transaction.transaction_number if p.ride_transaction else None,
                "customer_id": p.ride_transaction.customer_id if p.ride_transaction else None,
                "customer_name": p.ride_transaction.customer.name if p.ride_transaction and p.ride_transaction.customer else None,
                "driver_name": p.ride_transaction.driver.name if p.ride_transaction and p.ride_transaction.driver else None,
                "payment_method": p.payment_method.value if hasattr(p.payment_method, 'value') else p.payment_method,
                "amount": float(p.amount),
                "payer_type": p.payer_type.value if hasattr(p.payer_type, 'value') else p.payer_type,
                "razorpay_order_id": p.razorpay_order_id,
                "razorpay_payment_id": p.razorpay_payment_id,
                "status": p.status.value if hasattr(p.status, 'value') else p.status,
                "notes": p.notes,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in payments
        ],
        "by_method": [
            {
                "method": m.payment_method.value if hasattr(m.payment_method, 'value') else m.payment_method,
                "count": m.count,
                "total_amount": float(m.total_amount or 0),
                "success_amount": float(m.success_amount or 0),
            }
            for m in method_summary
        ],
        "by_payer": [
            {
                "payer_type": p.payer_type.value if hasattr(p.payer_type, 'value') else p.payer_type,
                "count": p.count,
                "total_amount": float(p.total_amount or 0),
                "success_amount": float(p.success_amount or 0),
            }
            for p in payer_summary
        ],
        "total_payments": len(payments),
        "total_amount": sum(float(p.amount) for p in payments),
        "success_count": len([p for p in payments if p.status == PaymentStatus.SUCCESS]),
        "pending_count": len([p for p in payments if p.status == PaymentStatus.PENDING]),
        "failed_count": len([p for p in payments if p.status == PaymentStatus.FAILED]),
    }


@app.get("/api/summary/driver-detailed/{driver_id}")
async def driver_detailed_summary(
    driver_id: int,
    db: Session = Depends(get_db),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Get detailed driver summary with registration, normal payments, waive offs, fines"""
    from sqlalchemy import func as sqlfunc
    
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Get all transactions for this driver
    transactions = db.query(RideTransaction).filter(
        RideTransaction.driver_id == driver_id
    )
    # Apply tenant filter
    if tenant_filter is not None:
        transactions = transactions.filter(RideTransaction.tenant_id == tenant_filter)
    transactions = transactions.all()
    
    # Get all payments for this driver's transactions
    payments = db.query(PaymentTransaction).join(
        RideTransaction, PaymentTransaction.ride_transaction_id == RideTransaction.id
    ).filter(RideTransaction.driver_id == driver_id)
    # Apply tenant filter
    if tenant_filter is not None:
        payments = payments.filter(RideTransaction.tenant_id == tenant_filter)
    payments = payments.all()
    
    # Calculate totals
    total_rides = len(transactions)
    total_earnings = sum(float(t.driver_share) for t in transactions)
    paid_earnings = sum(float(t.driver_share) for t in transactions if t.is_paid)
    due_earnings = total_earnings - paid_earnings
    
    # Payment breakdown
    cash_payments = [p for p in payments if p.payment_method == PaymentMethod.CASH]
    razorpay_payments = [p for p in payments if p.payment_method == PaymentMethod.RAZORPAY]
    phonepe_payments = [p for p in payments if p.payment_method == PaymentMethod.PHONEPE]
    
    return {
        "driver": {
            "id": driver.id,
            "name": driver.name,
            "email": driver.email,
            "is_active": driver.is_active,
        },
        "summary": {
            "total_rides": total_rides,
            "total_earnings": total_earnings,
            "paid_earnings": paid_earnings,
            "due_earnings": due_earnings,
        },
        "payment_breakdown": {
            "cash": {
                "count": len(cash_payments),
                "amount": sum(float(p.amount) for p in cash_payments),
            },
            "razorpay": {
                "count": len(razorpay_payments),
                "amount": sum(float(p.amount) for p in razorpay_payments),
            },
            "phonepe": {
                "count": len(phonepe_payments),
                "amount": sum(float(p.amount) for p in phonepe_payments),
            },
        },
        "registration_details": {
            "registration_amount": 0,  # Placeholder - add actual registration tracking
            "registration_date": None,
            "registration_paid": False,
        },
        "adjustments": {
            "waive_offs": 0,  # Placeholder for waive off tracking
            "fines": 0,  # Placeholder for fine tracking
            "bonuses": 0,  # Placeholder for bonus tracking
        },
        "transactions": [
            {
                "id": t.id,
                "transaction_number": t.transaction_number,
                "customer_name": t.customer.name if t.customer else "N/A",
                "total_amount": float(t.total_amount),
                "driver_share": float(t.driver_share),
                "is_paid": t.is_paid,
                "status": t.status.value if hasattr(t.status, 'value') else t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions[:20]  # Limit to last 20 transactions
        ],
    }


class PaymentOrderRequest(BaseModel):
    transaction_id: int
    amount: float

@app.post("/api/payments/create-order")
async def create_razorpay_order(
    request: PaymentOrderRequest,
    db: Session = Depends(get_db),
):
    import razorpay
    import json
    
    # Verify transaction exists
    transaction = db.query(RideTransaction).filter(RideTransaction.id == request.transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Initialize Razorpay client
    client = razorpay.Client(
        auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
    )
    
    # Create Razorpay order
    order_data = {
        "amount": int(request.amount * 100),  # Razorpay expects amount in paise
        "currency": "INR",
        "receipt": f"txn_{request.transaction_id}",
        "notes": {
            "transaction_id": str(request.transaction_id),
            "transaction_number": transaction.transaction_number
        }
    }
    
    try:
        order = client.order.create(order_data)
        
        # Create pending payment transaction
        payment = PaymentTransaction(
            ride_transaction_id=request.transaction_id,
            payment_method=PaymentMethod.RAZORPAY,
            amount=Decimal(str(request.amount)),
            payer_type=PaymentPayerType.CUSTOMER,
            razorpay_order_id=order["id"],
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        
        return {
            "order_id": order["id"],
            "amount": request.amount,
            "currency": "INR",
            "key_id": os.getenv("RAZORPAY_KEY_ID"),
            "payment_id": payment.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


class PaymentVerifyRequest(BaseModel):
    payment_id: str
    order_id: str
    signature: str
    db_payment_id: int

@app.post("/api/payments/verify")
async def verify_razorpay_payment(
    request: PaymentVerifyRequest,
    db: Session = Depends(get_db),
):
    import razorpay
    import hashlib
    
    # Get payment transaction
    payment = db.query(PaymentTransaction).filter(PaymentTransaction.id == request.db_payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    
    # Initialize Razorpay client
    client = razorpay.Client(
        auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
    )
    
    # Verify signature
    params = {
        "razorpay_order_id": request.order_id,
        "razorpay_payment_id": request.payment_id,
        "razorpay_signature": request.signature
    }
    
    try:
        client.utility.verify_payment_signature(params)
        
        # Update payment transaction
        payment.razorpay_payment_id = request.payment_id
        payment.razorpay_signature = request.signature
        payment.status = PaymentStatus.SUCCESS
        
        # Update ride transaction
        transaction = payment.ride_transaction
        transaction.paid_amount += payment.amount
        transaction.is_paid = transaction.paid_amount >= transaction.total_amount
        
        # Create event
        event = RideTransactionEvent(
            transaction_id=transaction.id,
            event="PAYMENT_VERIFIED",
            description=f"Razorpay payment verified. Payment ID: {request.payment_id}",
        )
        db.add(event)
        db.commit()
        
        return {
            "message": "Payment verified successfully",
            "paid_amount": float(transaction.paid_amount),
            "total_amount": float(transaction.total_amount),
            "is_paid": transaction.is_paid,
            "due_amount": float(transaction.total_amount) - float(transaction.paid_amount),
        }
    except razorpay.errors.SignatureVerificationError:
        payment.status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")
    except Exception as e:
        payment.status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Payment verification error: {str(e)}")


@app.get("/api/payments/{transaction_id}/history")
async def get_payment_history(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    payments = db.query(PaymentTransaction).filter(
        PaymentTransaction.ride_transaction_id == transaction_id
    ).order_by(PaymentTransaction.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "amount": float(p.amount),
            "payment_method": p.payment_method.value,
            "payer_type": p.payer_type.value,
            "status": p.status.value,
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "notes": p.notes,
        }
        for p in payments
    ]


class StripePaymentIntentRequest(BaseModel):
    transaction_id: int
    amount: float
    payment_method_types: list[str] = ["card", "link"]

@app.post("/api/payments/stripe/create-payment-intent")
async def create_stripe_payment_intent(
    request: StripePaymentIntentRequest,
    db: Session = Depends(get_db),
):
    import stripe
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    transaction = db.query(RideTransaction).filter(RideTransaction.id == request.transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(request.amount * 100),
            currency="inr",
            payment_method_types=request.payment_method_types,
            metadata={
                "transaction_id": str(request.transaction_id),
                "transaction_number": transaction.transaction_number
            },
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never"
            }
        )
        
        payment = PaymentTransaction(
            ride_transaction_id=request.transaction_id,
            payment_method=PaymentMethod.STRIPE,
            amount=Decimal(str(request.amount)),
            payer_type=PaymentPayerType.CUSTOMER,
            stripe_payment_intent_id=payment_intent.id,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        
        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id,
            "payment_id": payment.id,
            "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {str(e)}")


class StripeWebhookEvent(BaseModel):
    type: str
    data: dict

@app.post("/api/payments/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    import stripe
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        
        payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.stripe_payment_intent_id == payment_intent["id"]
        ).first()
        
        if payment:
            payment.stripe_payment_method_id = payment_intent.get("payment_method")
            payment.stripe_charge_id = payment_intent.get("charges", {}).get("data", [{}])[0].get("id")
            payment.status = PaymentStatus.SUCCESS
            
            transaction = payment.ride_transaction
            transaction.paid_amount += payment.amount
            transaction.is_paid = transaction.paid_amount >= transaction.total_amount
            
            event = RideTransactionEvent(
                transaction_id=transaction.id,
                event="PAYMENT_VERIFIED",
                description=f"Stripe payment verified. Payment Intent ID: {payment_intent['id']}",
            )
            db.add(event)
            db.commit()
    
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        
        payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.stripe_payment_intent_id == payment_intent["id"]
        ).first()
        
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.notes = payment_intent.get("last_payment_error", {}).get("message", "Payment failed")
            db.commit()
    
    return {"status": "success"}


@app.get("/api/config")
async def get_config():
    import os
    return {
        "hourly_rate": int(os.getenv("HOURLY_RATE", 200)),
        "driver_commission_percent": int(os.getenv("DRIVER_COMMISSION_PERCENT", 75)),
        "admin_commission_percent": int(os.getenv("ADMIN_COMMISSION_PERCENT", 20)),
        "dispatcher_commission_percent": int(os.getenv("DISPATCHER_COMMISSION_PERCENT", 2)),
        "super_admin_commission_percent": int(os.getenv("SUPER_ADMIN_COMMISSION_PERCENT", 3)),
        "payment_methods": ["RAZORPAY", "STRIPE", "PHONEPE", "GOOGLEPAY", "PAYTM", "CASH"],
        "app_name": os.getenv("APP_NAME", "DGDS Clone"),
    }


@app.get("/")
async def root():
    return {
        "message": "DGDS Clone API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


# Authentication Endpoints
@app.post("/api/auth/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    try:
        role = UserRole(user_data.role.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}")
    
    # Validate password strength (additional check beyond Pydantic)
    password = user_data.password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "@$!%*?&" for c in password)
    
    if not has_upper:
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter (A-Z)")
    if not has_lower:
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter (a-z)")
    if not has_digit:
        raise HTTPException(status_code=400, detail="Password must contain at least one number (0-9)")
    if not has_special:
        raise HTTPException(status_code=400, detail="Password must contain at least one special character (@$!%*?&)")
    
    # Create user
    try:
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            role=role,
            customer_id=user_data.customer_id,
            driver_id=user_data.driver_id,
            dispatcher_id=user_data.dispatcher_id,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@app.post("/api/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request, 
    credentials: UserLogin, 
    db: Session = Depends(get_db),
    translator: Callable = Depends(get_translator)
):
    """Login and get access token"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise create_error_response(
            translator,
            "auth.invalid_credentials",
            status_code=401
        )
    
    if not user.is_active:
        raise create_error_response(
            translator,
            "auth.inactive_user",
            status_code=403
        )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
        }
    }


@app.post("/api/auth/quick-login/{role}")
@limiter.limit("10/minute")
async def quick_login(request: Request, role: str, db: Session = Depends(get_db)):
    """Quick login for testing - creates/logs in with default test accounts"""
    from datetime import datetime
    
    # Define test accounts for each role
    test_accounts = {
        "customer": {"email": "customer@test.com", "password": "test123", "role": UserRole.CUSTOMER},
        "driver": {"email": "driver@test.com", "password": "test123", "role": UserRole.DRIVER},
        "dispatcher": {"email": "dispatcher@test.com", "password": "test123", "role": UserRole.DISPATCHER},
        "admin": {"email": "admin@test.com", "password": "test123", "role": UserRole.ADMIN},
        "super_admin": {"email": "superadmin@demo.com", "password": "admin123", "role": UserRole.SUPER_ADMIN}
    }
    
    if role not in test_accounts:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    account = test_accounts[role]
    
    # Check if user exists
    user = db.query(User).filter(User.email == account["email"]).first()
    
    # Create user if doesn't exist
    if not user:
        # Truncate password to 72 bytes for bcrypt compatibility
        password = account["password"][:72]
        
        # Assign tenant_id based on role
        # Super admin has no tenant (can see all data)
        # Other roles get assigned to DEMO tenant by default
        tenant_id = None
        if role != "super_admin":
            demo_tenant = db.query(Tenant).filter(Tenant.name == "DEMO").first()
            if demo_tenant:
                tenant_id = demo_tenant.id
        
        user = User(
            email=account["email"],
            password_hash=get_password_hash(password),
            role=account["role"],
            is_active=True,
            is_verified=True,
            tenant_id=tenant_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
        }
    }


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return current_user


@app.post("/api/auth/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@app.post("/api/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (client should discard token)"""
    return {"message": "Logged out successfully"}


@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    from sqlalchemy import text
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "razorpay_configured": bool(os.getenv("RAZORPAY_KEY_ID")) and "YOUR_KEY" not in os.getenv("RAZORPAY_KEY_ID", ""),
            "phonepe_configured": bool(os.getenv("PHONEPE_CLIENT_ID")),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": str(e),
        }


# ============================================================================
# DETAILED DRILL-DOWN REPORTS WITH COMMISSION BREAKDOWN
# ============================================================================

from detailed_reports import (
    generate_detailed_customer_report,
    generate_detailed_dispatcher_report,
    generate_detailed_admin_report,
    generate_detailed_super_admin_report
)
from driver_analytics import (
    generate_comprehensive_driver_analytics,
    get_driver_registration_charges_timeline
)
from reports import ReportFilters


@app.post("/api/reports/detailed/customers")
@limiter.limit("20/minute")
async def get_detailed_customer_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate detailed customer report with transaction and payment breakdown"""
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    
    return generate_detailed_customer_report(db, filters)


@app.post("/api/reports/detailed/dispatchers")
@limiter.limit("20/minute")
async def get_detailed_dispatcher_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate detailed dispatcher report with commission earnings breakdown"""
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    
    return generate_detailed_dispatcher_report(db, filters)


@app.post("/api/reports/detailed/admin")
@limiter.limit("20/minute")
async def get_detailed_admin_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate detailed admin report with commission earnings breakdown"""
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    
    return generate_detailed_admin_report(db, filters)


@app.post("/api/reports/detailed/super-admin")
@limiter.limit("20/minute")
async def get_detailed_super_admin_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate detailed super admin report with platform-wide statistics and commission breakdown"""
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    
    return generate_detailed_super_admin_report(db, filters)


# ============================================================================
# COMPREHENSIVE DRIVER ANALYTICS
# ============================================================================

@app.post("/api/analytics/drivers/comprehensive")
@limiter.limit("20/minute")
async def get_comprehensive_driver_analytics(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """
    Generate comprehensive driver analytics including:
    - Total revenue generated
    - Commission breakdown (earned, paid, pending)
    - Registration charges by time period
    - Transaction completion status (fully paid, partially paid, unpaid)
    - Detailed payment tracking
    """
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    
    return generate_comprehensive_driver_analytics(db, filters)


@app.get("/api/analytics/drivers/registration-charges")
@limiter.limit("20/minute")
async def get_driver_registration_timeline(
    request: Request,
    driver_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """
    Get driver registration charges timeline
    Breaks down by day, month, and year
    """
    return get_driver_registration_charges_timeline(db, driver_id, tenant_filter)


# ============================================================================
# ANALYTICS OVERVIEW AND OTHER REPORTS
# ============================================================================

@app.get("/api/analytics/drivers/{driver_id}/revenue-breakdown")
@limiter.limit("30/minute")
async def get_driver_revenue_breakdown(
    request: Request,
    driver_id: int,
    time_filter: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """
    Get detailed revenue breakdown for a specific driver
    Includes all expenses and commission splits
    """
    from reports import get_driver_revenue_breakdown
    return get_driver_revenue_breakdown(db, driver_id, time_filter, tenant_filter)


@app.post("/api/reports/analytics")
@limiter.limit("20/minute")
async def get_analytics_overview(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate comprehensive analytics overview"""
    from reports import generate_analytics_report
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    return generate_analytics_report(db, filters)


@app.post("/api/reports/transactions")
@limiter.limit("20/minute")
async def get_transaction_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate transaction report"""
    from reports import generate_transaction_report
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    return generate_transaction_report(db, filters)


@app.post("/api/drivers/{driver_id}/pay-registration-fee")
@limiter.limit("30/minute")
async def pay_driver_registration_fee(
    request: Request,
    driver_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """
    Mark driver registration fee as paid
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can mark registration fees as paid")
    
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if tenant_filter is not None and driver.tenant_id != tenant_filter:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if driver.registration_fee_paid:
        raise HTTPException(status_code=400, detail="Registration fee already paid")
    
    # Update driver registration fee status
    driver.registration_fee_paid = True
    driver.registration_fee_paid_at = datetime.now()
    driver.registration_fee_payment_id = payment_data.get("payment_id", "manual")
    
    db.commit()
    db.refresh(driver)
    
    return {
        "message": "Registration fee marked as paid",
        "driver_id": driver.id,
        "fee_amount": float(driver.registration_fee_amount),
        "paid_at": driver.registration_fee_paid_at.isoformat()
    }


@app.post("/api/reports/vehicles")
@limiter.limit("20/minute")
async def get_vehicle_report(
    request: Request,
    filters: ReportFilters,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_filter: Optional[int] = Depends(get_tenant_filter)
):
    """Generate vehicle report"""
    from reports import generate_vehicle_report
    if tenant_filter is not None:
        filters.tenant_id = tenant_filter
    return generate_vehicle_report(db, filters)


# ============================================================================
# DATABASE SEEDING ENDPOINT
# ============================================================================

# Global variable to track seeding status
seeding_status = {
    "is_running": False,
    "progress": 0,
    "message": "",
    "completed": False,
    "error": None
}

@app.post("/api/admin/seed-database")
@limiter.limit("5/hour")
async def trigger_database_seeding(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger async database seeding with test data
    Only accessible by admin users
    """
    global seeding_status
    
    # Check if user is admin
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can seed the database")
    
    # Check if seeding is already running
    if seeding_status["is_running"]:
        return {
            "status": "already_running",
            "message": "Database seeding is already in progress",
            "progress": seeding_status["progress"]
        }
    
    # Reset status
    seeding_status = {
        "is_running": True,
        "progress": 0,
        "message": "Starting database seeding...",
        "completed": False,
        "error": None
    }
    
    # Run seeding in background
    def run_seeding():
        global seeding_status
        try:
            from seed_test_data import seed_database
            
            def progress_callback(message, percentage):
                seeding_status["progress"] = percentage
                seeding_status["message"] = message
            
            seed_database(progress_callback=progress_callback)
            
            seeding_status["completed"] = True
            seeding_status["is_running"] = False
            seeding_status["message"] = "Database seeding completed successfully!"
            
        except Exception as e:
            seeding_status["error"] = str(e)
            seeding_status["is_running"] = False
            seeding_status["message"] = f"Error during seeding: {str(e)}"
    
    background_tasks.add_task(run_seeding)
    
    return {
        "status": "started",
        "message": "Database seeding started in background"
    }


@app.get("/api/admin/seed-database/status")
@limiter.limit("60/minute")
async def get_seeding_status(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get current status of database seeding"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can check seeding status")
    
    return seeding_status


@app.websocket("/ws/location/{trip_id}")
async def websocket_location(websocket: WebSocket, trip_id: str):
    """
    WebSocket endpoint for real-time driver GPS tracking.
    
    Usage:
    - Driver page connects and sends: {"lat": 28.6139, "lng": 77.2090}
    - Dispatcher map connects and receives same messages
    
    Args:
        trip_id: Transaction number (e.g., "TXN-SEED-0011")
    
    Flow:
    1. Driver opens /driver/live?trip=TXN-SEED-0011
    2. Browser GPS → WebSocket → Backend
    3. Backend broadcasts to all dispatchers watching this trip
    4. Dispatcher map updates in real-time
    """
    from ws.location import manager
    
    await manager.connect(trip_id, websocket)
    try:
        while True:
            # Receive GPS data from driver
            data = await websocket.receive_json()
            # data should be: {"lat": float, "lng": float}
            
            # Broadcast to all other connections in this trip room
            await manager.broadcast(trip_id, data)
    except WebSocketDisconnect:
        manager.disconnect(trip_id, websocket)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=2060, reload=True)
