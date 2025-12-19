# TS-00002: End-to-End Workflow Testing Manual

## Test Suite: Complete DGDS Clone Application Workflow
**Version:** 1.0.0  
**Created:** December 19, 2025  
**Environment:** Development (localhost)  
**Database:** uber-clone-test-db (PostgreSQL)

---

## Table of Contents
1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [System Health Check](#2-system-health-check)
3. [User Journey 1: Customer Registration](#3-user-journey-1-customer-registration)
4. [User Journey 2: Driver Registration](#4-user-journey-2-driver-registration)
5. [User Journey 3: Dispatcher Registration](#5-user-journey-3-dispatcher-registration)
6. [User Journey 4: Vehicle Registration](#6-user-journey-4-vehicle-registration)
7. [User Journey 5: Booking Creation](#7-user-journey-5-booking-creation)
8. [User Journey 6: Trip Lifecycle Management](#8-user-journey-6-trip-lifecycle-management)
9. [User Journey 7: Payment Processing](#9-user-journey-7-payment-processing)
10. [User Journey 8: Financial Summary & Reports](#10-user-journey-8-financial-summary--reports)
11. [Data Flow Verification](#11-data-flow-verification)
12. [Test Results Template](#12-test-results-template)

---

## 1. Prerequisites & Setup

### 1.1 System Requirements
- Docker & Docker Compose installed
- Node.js (for frontend development)
- Web browser (Chrome recommended)
- Terminal access

### 1.2 Start the Application

```bash
# Navigate to project directory
cd /Users/ratxensolutionspvtltd/CascadeProjects/windsurf-project-2

# Start all services
docker-compose up -d

# Verify all containers are running
docker ps
```

**Expected Output:**
| Container | Port | Status |
|-----------|------|--------|
| dgds-postgres | 2060 | Running |
| rideflow-postgres | 5460 | Running |
| dgds-backend | 2070 | Running |
| dgds-frontend | 2050 | Running |

### 1.3 Access Points
- **Frontend UI:** http://localhost:2050
- **Backend API:** http://localhost:2070
- **API Docs:** http://localhost:2070/docs
- **Database:** localhost:2060 (uber-clone-test-db)
- **Additional Database:** localhost:5460 (rideflow)

### 1.4 Razorpay Configuration (For Payment Testing)
Update `docker-compose.yml` with real Razorpay test credentials:
```yaml
RAZORPAY_KEY_ID: rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET: YOUR_SECRET_KEY
```

Then restart backend:
```bash
docker-compose up -d --force-recreate backend
```

---

## 2. System Health Check

### TC-00001: API Health Verification

**Steps:**
1. Open terminal
2. Run: `curl http://localhost:2070/api/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "razorpay_configured": true,
  "phonepe_configured": true
}
```

**Pass Criteria:** All fields show healthy/connected/true

---

## 3. User Journey 1: Customer Registration

### TC-00002: Create New Customer

**Pre-condition:** Application is running, user is on http://localhost:2050

**Steps:**
1. Click **"Add Customer"** in the left sidebar (Quick Actions)
2. Fill in Customer Information:
   - Name: `Test Customer 001`
   - Email: `testcustomer001@example.com`
3. Add Primary Address:
   - Label: `Home`
   - Address Line: `123 Test Street`
   - City: `Bangalore`
   - State: `Karnataka`
   - Pincode: `560001`
   - Check "Primary Address"
4. Add Contact Number:
   - Label: `Mobile`
   - Phone: `9876543210`
   - Check "Primary Contact"
5. Click **"Register Customer"**

**Expected Result:**
- Success message: "Customer registered successfully!"
- Customer appears in Customers list

**Verification Query:**
```bash
curl http://localhost:2070/api/customers/ | jq '.[] | select(.email == "testcustomer001@example.com")'
```

---

### TC-00003: View Customer Details

**Steps:**
1. Navigate to **Customers** in sidebar
2. Find "Test Customer 001"
3. Click **"View"** button

**Expected Result:**
- Modal opens showing customer details
- Name, email, addresses, and contacts displayed correctly

---

### TC-00004: Edit Customer

**Steps:**
1. From Customers list, click **"Edit"** on Test Customer 001
2. Change name to `Test Customer Updated`
3. Click **"Save Changes"**

**Expected Result:**
- Customer name updated in list
- Changes persisted in database

---

## 4. User Journey 2: Driver Registration

### TC-00005: Create New Driver

**Steps:**
1. Click **"Add Driver"** in Quick Actions
2. Fill in Driver Information:
   - Name: `Test Driver 001`
   - Address: `456 Driver Lane, Bangalore, Karnataka, 560002`
   - Contact: `9876543211`
3. Click **"Register Driver"**

**Expected Result:**
- Success message displayed
- Driver appears in Drivers list

**Verification:**
```bash
curl http://localhost:2070/api/drivers/ | jq '.[] | select(.name == "Test Driver 001")'
```

---

### TC-00006: View Driver List

**Steps:**
1. Navigate to **Drivers** in sidebar
2. Verify driver list loads

**Expected Result:**
- All registered drivers displayed
- Phone numbers clickable (tel: links)
- View/Edit/Archive buttons visible

---

## 5. User Journey 3: Dispatcher Registration

### TC-00007: Create New Dispatcher

**Steps:**
1. Click **"Add Dispatcher"** in Quick Actions
2. Fill in Dispatcher Information:
   - Name: `Test Dispatcher 001`
   - Email: `dispatcher001@example.com`
   - Contact: `9876543212`
3. Click **"Create Dispatcher"**

**Expected Result:**
- Dispatcher created successfully
- Appears in Dispatchers list

**Verification:**
```bash
curl http://localhost:2070/api/dispatchers/ | jq '.[] | select(.name == "Test Dispatcher 001")'
```

---

## 6. User Journey 4: Vehicle Registration

### TC-00008: Add Customer Vehicle

**Steps:**
1. Navigate to **Vehicles** in sidebar
2. Fill in Add Vehicle form:
   - Customer: Select "Test Customer 001"
   - Nickname: `My Sedan`
   - Make: `Toyota`
   - Model: `Camry`
   - Type: `Sedan`
   - Registration: `KA01AB1234`
   - Check "Automatic Transmission"
3. Click **"Add Vehicle"**

**Expected Result:**
- Vehicle added successfully
- Appears in vehicles grid
- Shows transmission type badge

**Verification:**
```bash
curl http://localhost:2070/api/vehicles/ | jq '.[] | select(.registration_number == "KA01AB1234")'
```

---

### TC-00009: Quick Book from Vehicle

**Steps:**
1. From Vehicles list, find "My Sedan"
2. Click **"Book Ride"** button

**Expected Result:**
- Redirected to Booking form
- Customer and Vehicle pre-selected

---

## 7. User Journey 5: Booking Creation

### TC-00010: Create New Booking

**Pre-condition:** Customer, Driver, Dispatcher, and Vehicle exist

**Steps:**
1. Click **"New Booking"** in Quick Actions
2. Fill in Booking Form:
   - Dispatcher: Select "Test Dispatcher 001"
   - Customer: Select "Test Customer 001"
   - Driver: Select "Test Driver 001"
   - Vehicle: Select "My Sedan (KA01AB1234)"
   - Pickup Location: `Tech Park, Whitefield`
   - Destination: `MG Road, Bangalore`
   - Ride Duration: `4` hours
3. Click **"Create Booking"**

**Expected Result:**
- Booking created with transaction number (e.g., TXN-00001)
- Total amount calculated: 4 hours × ₹400/hr = ₹1600
- Commission split displayed:
  - Driver (75%): ₹1200
  - Admin (20%): ₹320
  - Dispatcher (2%): ₹32
  - Super Admin (3%): ₹48

**Verification:**
```bash
curl http://localhost:2070/api/transactions/ | jq '.[-1]'
```

---

## 8. User Journey 6: Trip Lifecycle Management

### TC-00011: Complete Trip Status Flow

**Pre-condition:** Booking created (TXN exists)

**Status Flow:**
```
REQUESTED → DRIVER_ACCEPTED → ENROUTE_TO_PICKUP → CUSTOMER_PICKED → AT_DESTINATION → COMPLETED
```

**Steps:**

#### Step 1: Accept Ride
1. Navigate to **Managed Trips**
2. Click **"Manage"** on the new booking
3. Verify status shows "REQUESTED"
4. Click **"✓ Accept Ride"**

**Expected:** Status changes to DRIVER_ACCEPTED

#### Step 2: Start Enroute
1. Click **"🚗 Start - Enroute to Pickup"**

**Expected:** Status changes to ENROUTE_TO_PICKUP

#### Step 3: Pick Up Customer
1. Click **"👤 Customer Picked Up"**

**Expected:** Status changes to CUSTOMER_PICKED

#### Step 4: Arrive at Destination
1. Click **"📍 Arrived at Destination"**

**Expected:** Status changes to AT_DESTINATION

#### Step 5: Complete Trip
1. Click **"✅ Complete Trip"**

**Expected:** Status changes to COMPLETED

**Verification:**
```bash
curl http://localhost:2070/api/transactions/ | jq '.[-1] | {transaction_number, status}'
```

---

### TC-00012: Status Persistence Test

**Steps:**
1. Change trip status to DRIVER_ACCEPTED
2. Close the modal
3. Navigate to another view (e.g., Customers)
4. Return to Managed Trips
5. Open the same trip

**Expected Result:**
- Status remains DRIVER_ACCEPTED
- Status persisted in database

---

### TC-00013: Go Back (Revert Status)

**Steps:**
1. With trip at ENROUTE_TO_PICKUP status
2. Click **"↩ Go Back"** button
3. Confirm the revert

**Expected Result:**
- Status reverts to DRIVER_ACCEPTED
- Event logged in transaction history

---

### TC-00014: Cancel Trip

**Steps:**
1. Open a trip that is NOT completed
2. Click **"❌ Cancel Trip"**
3. Enter reason: "Customer requested cancellation"
4. Confirm

**Expected Result:**
- Trip status changes to CANCELLED
- Red "CANCELLED" badge displayed
- "Restore Trip" option available

---

### TC-00015: Restore Cancelled Trip

**Steps:**
1. Open a cancelled trip
2. Click **"↩ Restore Trip"**
3. Confirm restoration

**Expected Result:**
- Trip status reverts to REQUESTED
- Can proceed with normal flow

---

## 9. User Journey 7: Payment Processing

### TC-00016: Cash Payment

**Pre-condition:** Trip status is COMPLETED, is_paid = false

**Steps:**
1. Open completed trip modal
2. Click **"💰 Record Cash Payment (₹XXXX)"**

**Expected Result:**
- Payment recorded
- Trip marked as PAID
- Modal closes
- Trip list shows updated payment status

**Verification:**
```bash
curl http://localhost:2070/api/transactions/ | jq '.[-1] | {transaction_number, is_paid, paid_amount}'
```

---

### TC-00017: Razorpay Payment (Requires Real Credentials)

**Pre-condition:** 
- Trip COMPLETED, is_paid = false
- Razorpay credentials configured

**Steps:**
1. Open completed trip modal
2. Click **"💳 Pay with Razorpay (₹XXXX)"**
3. Razorpay modal opens with options:
   - Credit/Debit Cards
   - UPI (Google Pay, PhonePe, etc.)
   - Net Banking
   - Wallets
4. Select payment method
5. Complete test payment (use Razorpay test card: 4111 1111 1111 1111)
6. Enter OTP: 123456

**Expected Result:**
- Payment successful message
- Trip marked as PAID
- Payment recorded in database

**Test Card Details:**
| Card Number | Expiry | CVV | OTP |
|-------------|--------|-----|-----|
| 4111 1111 1111 1111 | Any future date | Any 3 digits | 123456 |

---

### TC-00018: Payment Failure Handling

**Steps:**
1. Initiate Razorpay payment
2. Close the modal without completing
3. OR use failing test card

**Expected Result:**
- Error message displayed
- Trip remains UNPAID
- Can retry payment

---

## 10. User Journey 8: Financial Summary & Reports

### TC-00019: View Summary Dashboard

**Steps:**
1. Navigate to **Summary** in sidebar
2. View overall statistics

**Expected Result:**
- Total Revenue displayed
- Paid vs Due amounts shown
- Commission breakdown visible (Customer 100%, Driver 75%, Admin 20%, Dispatcher 2%, Super Admin 3%)

---

### TC-00020: Filter Summary by Date

**Steps:**
1. On Summary page, set Date From and Date To
2. Click **"Apply Filters"**

**Expected Result:**
- Summary updates to show only transactions within date range
- All calculations reflect filtered data

---

### TC-00021: View Customer Bifurcation

**Steps:**
1. Click on **"By Customer"** card (or Customer commission card)
2. Modal opens with detailed breakdown

**Expected Result:**
- List of customers with their total amounts
- Commission split per customer shown
- Paid/Due amounts displayed

---

### TC-00022: View Driver Bifurcation

**Steps:**
1. Click on **"By Driver"** card
2. Review driver earnings breakdown

**Expected Result:**
- Each driver's 75% share displayed
- Total trips, paid, and due amounts shown

---

### TC-00023: View Transaction Deep Dive

**Steps:**
1. Click on **"By Transaction"** card
2. Review all transactions

**Expected Result:**
- Full list of all bookings
- Each transaction shows:
  - Customer, Driver, Dispatcher details
  - Pickup → Drop locations
  - Duration
  - Total amount with commission split
  - Payment progress bar

---

### TC-00024: View Payment Settlements

**Steps:**
1. Click on **"By Payment"** card
2. Review payment history

**Expected Result:**
- All payment transactions listed
- Grouped by payment method (Cash, Razorpay, PhonePe)
- Grouped by payer type (Customer, Driver, Admin)
- Success/Pending/Failed counts

---

## 11. Data Flow Verification

### Complete Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CUSTOMER   │     │   DRIVER    │     │ DISPATCHER  │
│  Register   │     │  Register   │     │  Register   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   VEHICLE   │
                    │  Register   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   BOOKING   │
                    │   Create    │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     TRIP LIFECYCLE     │
              │  REQUESTED             │
              │  → DRIVER_ACCEPTED     │
              │  → ENROUTE_TO_PICKUP   │
              │  → CUSTOMER_PICKED     │
              │  → AT_DESTINATION      │
              │  → COMPLETED           │
              └────────────┬───────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   PAYMENT   │
                    │ Cash/Razorpay│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SUMMARY   │
                    │  & Reports  │
                    └─────────────┘
```

### Database Verification Queries

```bash
# Count all entities
echo "=== Entity Counts ==="
curl -s http://localhost:2070/api/customers/ | jq 'length'
curl -s http://localhost:2070/api/drivers/ | jq 'length'
curl -s http://localhost:2070/api/dispatchers/ | jq 'length'
curl -s http://localhost:2070/api/vehicles/ | jq 'length'
curl -s http://localhost:2070/api/transactions/ | jq 'length'

# Check transaction summary
echo "=== Transaction Summary ==="
curl -s http://localhost:2070/api/summary/transactions | jq

# Check payment summary
echo "=== Payment Summary ==="
curl -s http://localhost:2070/api/summary/by-payment | jq '.total_payments, .total_amount'
```

---

## 12. Test Results Template

### Test Run Record: TR-XXXXX

| Field | Value |
|-------|-------|
| **Test Run ID** | TR-XXXXX |
| **Date** | YYYY-MM-DD |
| **Tester** | Name |
| **Environment** | Dev/Staging/Prod |
| **Browser** | Chrome/Firefox/Safari |

### Test Case Results

| TC ID | Test Case | Status | Notes |
|-------|-----------|--------|-------|
| TC-00001 | API Health Check | ✅ PASS / ❌ FAIL | |
| TC-00002 | Create Customer | ✅ PASS / ❌ FAIL | |
| TC-00003 | View Customer | ✅ PASS / ❌ FAIL | |
| TC-00004 | Edit Customer | ✅ PASS / ❌ FAIL | |
| TC-00005 | Create Driver | ✅ PASS / ❌ FAIL | |
| TC-00006 | View Drivers | ✅ PASS / ❌ FAIL | |
| TC-00007 | Create Dispatcher | ✅ PASS / ❌ FAIL | |
| TC-00008 | Add Vehicle | ✅ PASS / ❌ FAIL | |
| TC-00009 | Quick Book | ✅ PASS / ❌ FAIL | |
| TC-00010 | Create Booking | ✅ PASS / ❌ FAIL | |
| TC-00011 | Trip Status Flow | ✅ PASS / ❌ FAIL | |
| TC-00012 | Status Persistence | ✅ PASS / ❌ FAIL | |
| TC-00013 | Revert Status | ✅ PASS / ❌ FAIL | |
| TC-00014 | Cancel Trip | ✅ PASS / ❌ FAIL | |
| TC-00015 | Restore Trip | ✅ PASS / ❌ FAIL | |
| TC-00016 | Cash Payment | ✅ PASS / ❌ FAIL | |
| TC-00017 | Razorpay Payment | ✅ PASS / ❌ FAIL | |
| TC-00018 | Payment Failure | ✅ PASS / ❌ FAIL | |
| TC-00019 | Summary Dashboard | ✅ PASS / ❌ FAIL | |
| TC-00020 | Filter Summary | ✅ PASS / ❌ FAIL | |
| TC-00021 | Customer Bifurcation | ✅ PASS / ❌ FAIL | |
| TC-00022 | Driver Bifurcation | ✅ PASS / ❌ FAIL | |
| TC-00023 | Transaction Deep Dive | ✅ PASS / ❌ FAIL | |
| TC-00024 | Payment Settlements | ✅ PASS / ❌ FAIL | |

### Summary

| Metric | Count |
|--------|-------|
| Total Test Cases | 24 |
| Passed | |
| Failed | |
| Blocked | |
| Pass Rate | % |

### Issues Found

| Issue ID | TC ID | Severity | Description | Status |
|----------|-------|----------|-------------|--------|
| | | High/Medium/Low | | Open/Fixed |

### Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |

---

## Quick Reference Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker logs dgds-backend -f
docker logs dgds-frontend -f

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Stop all services
docker-compose down

# Reset database (CAUTION: Deletes all data)
docker-compose down -v
docker-compose up -d
```

---

**End of Test Manual**
