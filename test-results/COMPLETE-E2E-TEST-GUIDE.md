# DGDS Clone - Complete E2E Testing Guide
## React + FastAPI + PostgreSQL Application

---

## 🌐 System Ports Reference

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | 2050 | http://localhost:2050 | React App (Vite) |
| **Backend API** | 2070 | http://localhost:2070 | FastAPI Server |
| **PostgreSQL** | 2060 | localhost:2060 | Database (internal 5432) |
| **API Docs** | 2070 | http://localhost:2070/docs | Swagger UI |
| **API ReDoc** | 2070 | http://localhost:2070/redoc | ReDoc Documentation |

---

## 🚀 Quick Start Commands

### Start Application
```bash
cd /Users/ratxensolutionspvtltd/CascadeProjects/windsurf-project-2

# Start all services
docker-compose up -d

# Check all containers running
docker ps

# View logs
docker-compose logs -f

# Restart specific service
docker restart dgds-frontend
docker restart dgds-backend
docker restart dgds-postgres
```

### Stop Application
```bash
docker-compose down

# Remove volumes (full reset)
docker-compose down -v
```

---

## ✅ Pre-Test Health Checks

### 1. Frontend Check
```bash
curl -s http://localhost:2050 | head -5
# Should return HTML content
```

### 2. Backend Health Check
```bash
curl -s http://localhost:2070/api/health | jq
# Expected:
# {
#   "status": "healthy",
#   "database": "connected",
#   "razorpay_configured": true,
#   "phonepe_configured": true
# }
```

### 3. Database Check
```bash
curl -s http://localhost:2070/api/customers/ | jq 'length'
# Returns number of customers
```

### 4. API Root Info
```bash
curl -s http://localhost:2070/ | jq
# Returns API info and version
```

---

## 📋 Complete Workflow Checklist

### Phase 1: Entity Setup (CRUD Operations)

#### ✅ Create Customer
1. Navigate to http://localhost:2050
2. Click "Add Customer" in Quick Actions
3. Fill form:
   - Name: Test Customer E2E
   - Email: customer.e2e@test.com
   - Address: 123 Test Street, Test City, TS, 12345, India
   - Contact: Mobile, 9876543210
4. Click "Register Customer"
5. **Verify**: Customer appears in Customers list

#### ✅ Create Driver
1. Click "Add Driver" in Quick Actions
2. Fill form:
   - Name: Test Driver E2E
   - Address, City, State, ZIP, Country
   - Phone Number
3. Click "Add Driver"
4. **Verify**: Driver appears in Drivers list with phone icon

#### ✅ Create Dispatcher
1. Click "Add Dispatcher" in Quick Actions
2. Fill form:
   - Name: Test Dispatcher E2E
   - Email, Contact Number
3. Click "Add Dispatcher"
4. **Verify**: Dispatcher appears in Dispatchers list

#### ✅ Add Vehicle
1. Click "Vehicles" in Navigation
2. Fill "Add New Vehicle" form:
   - Select Customer
   - Nickname, Make, Model
   - Type (Sedan/SUV/Hatchback/MPV/Luxury)
   - Registration Number
   - Automatic toggle
3. Click "Add Vehicle"
4. **Verify**: Vehicle appears in list with "Book Ride" option

---

### Phase 2: Booking Creation

#### ✅ Create New Booking
1. Click "New Booking" in Quick Actions
2. Select:
   - Dispatcher
   - Customer (loads their address)
   - Driver
   - Pickup Location (auto-fills or enter)
   - Destination Location
   - Duration (hours)
3. Click "Create Booking"
4. **Verify**:
   - TXN number generated (TXN-XXXXX)
   - Status: REQUESTED
   - Amount calculated: Duration × ₹400/hr

---

### Phase 3: Trip Lifecycle Management

Click "Trips" → Find your booking → Click "Manage"

| Step | Current Status | Action | Next Status |
|------|---------------|--------|-------------|
| 1 | REQUESTED | Click "🚗 Accept Ride" | DRIVER_ACCEPTED |
| 2 | DRIVER_ACCEPTED | Click "🚗 Start Enroute" | ENROUTE_TO_PICKUP |
| 3 | ENROUTE_TO_PICKUP | Click "👤 Customer Picked Up" | CUSTOMER_PICKED |
| 4 | CUSTOMER_PICKED | Click "📍 Arrived at Destination" | AT_DESTINATION |
| 5 | AT_DESTINATION | Click "✅ Complete Trip" | COMPLETED |

#### ⚠️ Cancellation Flow
- At any status, click "🚫 Cancel Trip"
- Enter cancellation reason
- Status changes to CANCELLED
- Use "Restore Trip" to revert

#### ↩️ Go Back Flow
- Use "← Go Back One Step" to revert status
- Works for any in-progress status

---

### Phase 4: Payment Processing

#### Option A: Cash Payment
1. After trip is COMPLETED
2. Click "💰 Record Cash Payment (₹XXXX)"
3. **Verify**: Status shows "✓ Payment Received - Trip Complete"

#### Option B: Razorpay Payment
1. After trip is COMPLETED
2. Click "Pay with Razorpay (₹XXXX)"
3. Complete Razorpay checkout
4. **Verify**: Payment recorded after successful payment

---

### Phase 5: Summary & Reports Verification

Navigate to "Summary" in Navigation

#### ✅ Transaction Overview
- Total Transactions count
- Completed vs Pending
- Total/Paid/Due amounts

#### ✅ Commission Breakdown (Click for Details)
| Card | Percentage | Description |
|------|------------|-------------|
| Customer | 100% | Total revenue from customers |
| Driver | 75% | Driver earnings |
| Admin | 20% | Admin commission |
| Dispatcher | 2% | Dispatcher commission |
| Super Admin | 3% | Platform fee |

#### ✅ Group By Reports (Click Each Card)
1. **By Customer** - Customer-wise breakdown with trip counts
2. **By Driver** - Driver earnings with paid/due status
3. **By Dispatcher** - Dispatcher commissions
4. **By Admin** - Admin earnings per transaction
5. **By Super Admin** - Platform fees per transaction
6. **By Transaction** - Deep dive with all parties and percentages
7. **By Payment** - Settlement details with method breakdown

---

## 🔧 API Endpoints Reference

### Entities
```bash
# Customers
GET  /api/customers/
POST /api/customers/
GET  /api/customers/{id}
PUT  /api/customers/{id}
DELETE /api/customers/{id}

# Drivers
GET  /api/drivers/
POST /api/drivers/
GET  /api/drivers/{id}
PUT  /api/drivers/{id}
DELETE /api/drivers/{id}

# Dispatchers
GET  /api/dispatchers/
POST /api/dispatchers/
GET  /api/dispatchers/{id}
PUT  /api/dispatchers/{id}
DELETE /api/dispatchers/{id}

# Vehicles
GET  /api/vehicles/
POST /api/vehicles/
GET  /api/vehicles/{id}
PUT  /api/vehicles/{id}
DELETE /api/vehicles/{id}
```

### Transactions
```bash
# Bookings/Transactions
GET  /api/transactions/
POST /api/bookings/
GET  /api/bookings/{id}
PATCH /api/bookings/{id}/status?status=STATUS&description=DESC
PATCH /api/bookings/{id}/payment?paid_amount=AMT&payment_method=CASH
```

### Summary Endpoints
```bash
GET /api/summary/transactions
GET /api/summary/by-customer
GET /api/summary/by-driver
GET /api/summary/by-dispatcher
GET /api/summary/by-transaction
GET /api/summary/by-payment
GET /api/summary/driver-detailed/{driver_id}
GET /api/revenue-summary
```

### Payments
```bash
POST /api/payments/create-order
POST /api/payments/verify
```

---

## 🐛 Troubleshooting Guide

### Frontend Issues

| Problem | Solution |
|---------|----------|
| Blank page | Check console: `docker logs dgds-frontend` |
| API errors | Verify backend: `curl http://localhost:2070/api/health` |
| CORS errors | Restart backend: `docker restart dgds-backend` |
| Stale cache | Hard refresh: Ctrl+Shift+R |

### Backend Issues

| Problem | Solution |
|---------|----------|
| 500 errors | Check logs: `docker logs dgds-backend --tail 100` |
| DB connection | Restart: `docker restart dgds-postgres dgds-backend` |
| Payment fails | Verify env vars in docker-compose.yml |

### Database Issues

| Problem | Solution |
|---------|----------|
| Connection refused | Wait 30s after startup, check: `docker logs dgds-postgres` |
| Data corruption | Reset: `docker-compose down -v && docker-compose up -d` |
| Missing tables | Restart backend (auto-creates tables) |

### Quick Reset Commands
```bash
# Full system reset
docker-compose down -v
docker-compose up -d

# Seed test data (if script exists)
docker exec dgds-backend python seed_data.py

# Clear sessions (if Redis used)
redis-cli FLUSHALL
```

---

## 📊 Test Data Verification Scripts

```bash
# Count entities
curl -s http://localhost:2070/api/customers/ | jq 'length'
curl -s http://localhost:2070/api/drivers/ | jq 'length'
curl -s http://localhost:2070/api/dispatchers/ | jq 'length'
curl -s http://localhost:2070/api/vehicles/ | jq 'length'

# Transaction totals
curl -s http://localhost:2070/api/summary/transactions | jq

# Recent transactions
curl -s http://localhost:2070/api/transactions/ | jq '.[0:3]'

# Payment settlements
curl -s http://localhost:2070/api/summary/by-payment | jq '.total_payments, .total_amount'
```

---

## 📱 Mobile Responsive Testing

### Device Emulation (Chrome DevTools)
1. Press F12 or Ctrl+Shift+I
2. Click device icon (Ctrl+Shift+M)
3. Select device: iPhone 12, Galaxy S20, iPad

### Test Viewports
- Mobile: 375x667, 360x640
- Tablet: 768x1024
- Desktop: 1280x720, 1920x1080

### Critical Mobile Tests
- [ ] Sidebar collapses/expands properly
- [ ] Forms are usable on small screens
- [ ] Modal dialogs scroll correctly
- [ ] Touch interactions work
- [ ] Summary cards stack properly

---

## 🔐 Security Checklist

- [ ] API returns proper error codes (not stack traces)
- [ ] SQL injection protected (SQLAlchemy ORM)
- [ ] XSS protection (React auto-escapes)
- [ ] Razorpay signature verified
- [ ] Environment variables not exposed

---

## 📝 Test Results Template

```
Date: _______________
Tester: _____________
Environment: Dev / Staging / Production

### Entity Tests
- [ ] Customer CRUD: ✅ / ❌
- [ ] Driver CRUD: ✅ / ❌
- [ ] Dispatcher CRUD: ✅ / ❌
- [ ] Vehicle CRUD: ✅ / ❌

### Workflow Tests
- [ ] Booking Creation: ✅ / ❌
- [ ] Trip Lifecycle: ✅ / ❌
- [ ] Cash Payment: ✅ / ❌
- [ ] Razorpay Payment: ✅ / ❌

### Summary Tests
- [ ] Transaction Overview: ✅ / ❌
- [ ] By Customer Modal: ✅ / ❌
- [ ] By Driver Modal: ✅ / ❌
- [ ] By Payment Modal: ✅ / ❌
- [ ] Transaction Deep Dive: ✅ / ❌

### Issues Found:
1. _______________________
2. _______________________

### Blockers: Yes / No
### Ready for Release: Yes / No
```

---

## 📞 Quick Reference

### Service Status Check
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Expected Output
```
NAMES           STATUS          PORTS
dgds-frontend   Up 2 hours      0.0.0.0:2050->2050/tcp
dgds-backend    Up 2 hours      0.0.0.0:2070->2070/tcp
dgds-postgres   Up 2 hours      0.0.0.0:2060->5432/tcp
```

---

**Last Updated:** December 19, 2025
**Version:** 1.0.0

