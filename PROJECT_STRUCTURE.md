# DGDS Clone - Project Structure

## Directory Overview

```
windsurf-project-2/
├── README.md                    # Main project documentation
├── CHANGELOG.md                 # Version history and changes
├── PROJECT_STRUCTURE.md         # This file
├── .gitignore                   # Git ignore rules
├── docker-compose.yml           # Docker orchestration
├── .env.example                 # Environment variables template
│
├── backend/                     # FastAPI backend application
│   ├── main.py                  # Main FastAPI application (2000+ lines)
│   ├── models.py                # SQLAlchemy database models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Backend container configuration
│   ├── .env                    # Backend environment variables
│   └── migrations/             # Database migration scripts
│       ├── add_payment_transactions.py
│       └── create_payment_table.py
│
├── frontend/                    # React frontend application
│   ├── src/
│   │   └── App.jsx             # Main React component (3000+ lines)
│   ├── package.json            # Node.js dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── Dockerfile             # Frontend container configuration
│   ├── public/                # Static assets
│   │   └── index.html         # HTML template
│   └── dist/                  # Build output (generated)
│
└── test-results/               # Testing documentation and results
    ├── TS-00001-customer-crud.md
    ├── TS-00002-E2E-WORKFLOW-MANUAL.md
    ├── TR-00001-system-readiness.md
    ├── TR-00002-full-workflow-test.md
    └── QUICK-START-CHECKLIST.md
```

## Backend Architecture

### Core Files

#### `main.py`
- **Purpose:** FastAPI application entry point
- **Size:** ~2000 lines
- **Key Components:**
  - FastAPI app initialization
  - CORS middleware configuration
  - 30+ API endpoints
  - Database session management
  - Authentication and authorization
  - Payment gateway integration

#### `models.py`
- **Purpose:** SQLAlchemy database models
- **Key Models:**
  - `Customer` - Customer information
  - `CustomerAddress` - Customer addresses
  - `ContactNumber` - Contact details
  - `Driver` - Driver information
  - `Dispatcher` - Dispatcher information
  - `CustomerVehicle` - Vehicle details
  - `RideTransaction` - Bookings and trips
  - `PaymentTransaction` - Payment records
  - `RideTransactionEvent` - Event logs

#### `schemas.py`
- **Purpose:** Pydantic schemas for API
- **Key Schemas:**
  - Request/Response models for all entities
  - Payment processing schemas
  - Summary report schemas
  - Validation schemas

### API Endpoints Structure

```python
# Authentication & Health
GET  /api/health
GET  /

# Customer Management
GET    /api/customers/
POST   /api/customers/
GET    /api/customers/{id}
PUT    /api/customers/{id}
DELETE /api/customers/{id}

# Driver Management
GET    /api/drivers/
POST   /api/drivers/
GET    /api/drivers/{id}
PUT    /api/drivers/{id}
DELETE /api/drivers/{id}

# Dispatcher Management
GET    /api/dispatchers/
POST   /api/dispatchers/
GET    /api/dispatchers/{id}
PUT    /api/dispatchers/{id}
DELETE /api/dispatchers/{id}

# Vehicle Management
GET    /api/vehicles/
POST   /api/vehicles/
GET    /api/vehicles/{id}
DELETE /api/vehicles/{id}

# Booking & Transactions
GET    /api/bookings/
POST   /api/bookings/
GET    /api/transactions/
PATCH  /api/bookings/{id}/status
PATCH  /api/bookings/{id}/payment

# Payment Processing
POST   /api/payments/create-order
POST   /api/payments/verify
GET    /api/payments/history/{transaction_id}

# Reports & Analytics
GET    /api/summary/transactions
GET    /api/summary/by-customer
GET    /api/summary/by-driver
GET    /api/summary/by-dispatcher
GET    /api/summary/by-transaction
GET    /api/summary/by-payment
GET    /api/summary/driver-detailed/{driver_id}
```

## Frontend Architecture

### Core File: `App.jsx`
- **Purpose:** Main React application
- **Size:** ~3000 lines
- **Key Features:**
  - Component-based architecture
  - State management with React hooks
  - Axios for API communication
  - Tailwind CSS for styling
  - Razorpay SDK integration

### Component Structure

```jsx
// Main App Component
function App() {
  // State Management
  const [view, setView] = useState('register');
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  // ... other states

  // API Configuration
  const API_BASE_URL = 'http://localhost:2070';
  const api = axios.create({...});

  // Main Views
  - Register View
  - Customer Management
  - Driver Management
  - Dispatcher Management
  - Vehicle Management
  - Booking Creation
  - Trip Management
  - Financial Summary
}
```

### UI Components

#### Navigation
- Left sidebar with Quick Actions
- Main navigation menu
- Responsive design

#### Forms
- Customer registration form
- Driver registration form
- Dispatcher creation form
- Vehicle registration form
- Booking creation form

#### Data Display
- Customer list with details
- Driver list with earnings
- Transaction list with status
- Financial summary cards
- Commission breakdown modals

## Database Schema

### Primary Tables

1. **customers**
   - id, name, email, created_at, updated_at

2. **customer_addresses**
   - id, customer_id, label, address_line, city, state, pincode, is_primary

3. **contact_numbers**
   - id, customer_id, label, phone_number, is_primary

4. **drivers**
   - id, name, email, created_at, updated_at

5. **dispatchers**
   - id, name, email, contact_number, created_at, updated_at

6. **customer_vehicles**
   - id, customer_id, nickname, vehicle_make, vehicle_model, vehicle_type, registration_number

7. **ride_transactions**
   - id, transaction_number, customer_id, driver_id, dispatcher_id, vehicle_id
   - pickup_location, destination_location, status, total_amount, paid_amount, is_paid

8. **payment_transactions**
   - id, ride_transaction_id, payment_method, amount, status, razorpay_order_id

9. **ride_transaction_events**
   - id, transaction_id, event, description, created_at

### Relationships

```
Customer 1:N CustomerAddress
Customer 1:N ContactNumber
Customer 1:N CustomerVehicle
Customer 1:N RideTransaction

Driver 1:N RideTransaction

Dispatcher 1:N RideTransaction

CustomerVehicle 1:N RideTransaction

RideTransaction 1:N PaymentTransaction
RideTransaction 1:N RideTransactionEvent
```

## Testing Structure

### Test Suite Organization

```
test-results/
├── TS-00001-customer-crud.md          # Test Suite: Customer CRUD Operations
├── TS-00002-E2E-WORKFLOW-MANUAL.md    # Test Suite: End-to-End Workflow
├── TR-00001-system-readiness.md      # Test Run: System Readiness Check
├── TR-00002-full-workflow-test.md     # Test Run: Complete Workflow Test
└── QUICK-START-CHECKLIST.md          # Quick Reference Guide
```

### Test Case Coverage

1. **System Health** (1 test)
2. **Customer Management** (3 tests)
3. **Driver Management** (2 tests)
4. **Dispatcher Management** (1 test)
5. **Vehicle Management** (2 tests)
6. **Booking Creation** (1 test)
7. **Trip Lifecycle** (5 tests)
8. **Payment Processing** (3 tests)
9. **Financial Reporting** (6 tests)

Total: **24 test cases**

## Configuration Files

### `docker-compose.yml`
- Service definitions for:
  - PostgreSQL (primary: port 2060)
  - PostgreSQL (secondary: port 5460)
  - FastAPI backend (port 2070)
  - React frontend (port 2050)

### Environment Variables
```yaml
# Database
DATABASE_URL: postgresql://...

# Razorpay
RAZORPAY_KEY_ID: rzp_test_...
RAZORPAY_KEY_SECRET: ...

# Business Logic
HOURLY_RATE: 400
DRIVER_COMMISSION_PERCENT: 75
ADMIN_COMMISSION_PERCENT: 20
DISPATCHER_COMMISSION_PERCENT: 2
SUPER_ADMIN_COMMISSION_PERCENT: 3
```

## Development Workflow

### 1. Setup
```bash
git clone <repository>
cd windsurf-project-2
docker-compose up -d
```

### 2. Development
- Backend: Edit files in `backend/`
- Frontend: Edit files in `frontend/`
- Database: Run migrations in `backend/migrations/`

### 3. Testing
- Follow `test-results/TS-00002-E2E-WORKFLOW-MANUAL.md`
- Use `test-results/QUICK-START-CHECKLIST.md` for quick tests

### 4. Deployment
- Update environment variables
- Build and push containers
- Run database migrations

## Code Standards

### Backend (Python)
- Follow PEP 8
- Use type hints
- Document all endpoints
- Validate with Pydantic

### Frontend (JavaScript)
- Use ES6+ features
- Component-based structure
- Consistent naming conventions
- Proper error handling

### Database
- Snake_case for all identifiers
- Proper foreign key constraints
- Indexes for performance
- Migration scripts for changes

## Security Considerations

1. **Environment Variables**: All secrets in environment
2. **CORS**: Configured for production domains
3. **Input Validation**: Pydantic schemas
4. **SQL Injection**: SQLAlchemy ORM protection
5. **Payment Security**: Razorpay webhook verification

## Performance Optimizations

1. **Database**: Proper indexing
2. **API**: Response pagination
3. **Frontend**: Lazy loading
4. **Caching**: Response caching where appropriate

---

**Last Updated:** December 19, 2025
**Version:** 1.0.0
