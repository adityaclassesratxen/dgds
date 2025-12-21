# Comprehensive Drill-Down Reports with Commission Breakdown

## Overview
This system provides detailed transaction reports for all stakeholders with complete commission breakdown showing how each transaction amount is distributed among drivers, dispatchers, admin, and super admin.

## Commission Structure
Every transaction is split as follows:
- **Driver**: 79% of transaction amount
- **Dispatcher**: 18% of transaction amount
- **Admin**: 2% of transaction amount
- **Super Admin**: 1% of transaction amount

## Available Reports

### 1. Detailed Driver Report
**Endpoint**: `POST /api/reports/detailed/drivers`

**Shows for each driver**:
- Total bookings (completed, pending, cancelled)
- Total transactions count
- Total revenue generated
- Payment status (paid vs pending amounts)
- Commission breakdown:
  - Driver earnings (79%)
  - Dispatcher commission from their rides (18%)
  - Admin commission (2%)
  - Super Admin commission (1%)
- Individual transaction details with:
  - Customer information
  - Dispatcher information
  - Pickup/destination locations
  - Ride duration
  - Payment status
  - Full commission split per transaction

**Use Case**: Track driver performance, earnings, and pending payments

---

### 2. Detailed Customer Report
**Endpoint**: `POST /api/reports/detailed/customers`

**Shows for each customer**:
- Total bookings (completed, pending, cancelled)
- Total amount spent
- Payment breakdown (paid vs pending)
- Transaction history with:
  - Driver details
  - Dispatcher details
  - Trip details
  - Payment status
  - Commission breakdown showing how their payment is distributed

**Use Case**: Track customer spending, payment history, and outstanding dues

---

### 3. Detailed Dispatcher Report
**Endpoint**: `POST /api/reports/detailed/dispatchers`

**Shows for each dispatcher**:
- Total bookings coordinated
- Booking status breakdown (completed, pending, cancelled)
- Total commission earned (18% of all transactions)
- Commission payment status (paid vs pending)
- Individual transaction details with:
  - Customer and driver information
  - Trip details
  - Dispatcher's commission per transaction
  - Full commission breakdown
  - Payment status

**Use Case**: Track dispatcher performance and commission earnings

---

### 4. Detailed Admin Report
**Endpoint**: `POST /api/reports/detailed/admin`

**Shows platform-wide admin view**:
- Total transactions managed
- Transaction status breakdown
- Total platform revenue
- Admin commission earned (2% of all transactions)
- Commission payment status
- Individual transaction details with:
  - All stakeholder information
  - Trip details
  - Admin commission per transaction
  - Full commission breakdown

**Use Case**: Monitor platform operations and admin commission earnings

---

### 5. Detailed Super Admin Report
**Endpoint**: `POST /api/reports/detailed/super-admin`

**Shows complete platform overview**:
- Total platform transactions
- Platform-wide statistics:
  - Total active drivers
  - Total active customers
  - Total active dispatchers
  - Total revenue
  - Total paid/pending amounts
- Super admin commission (1% of all transactions)
- Commission payment status
- Complete transaction history with full details

**Use Case**: Platform-wide monitoring and super admin commission tracking

---

## API Request Format

All detailed reports use the same request format:

```json
{
  "date_range": {
    "range_type": "7days",
    "start_date": null,
    "end_date": null
  },
  "customer_id": null,
  "driver_id": null,
  "dispatcher_id": null,
  "vehicle_id": null,
  "tenant_id": null
}
```

### Date Range Options:
- `1day`, `3days`, `7days`, `14days`
- `1month`, `3months`, `6months`
- `1year`, `2years`, `3years`, `4years`, `5years`, `7years`, `8years`
- `custom` (requires start_date and end_date)

### Filters:
- Filter by specific customer, driver, dispatcher, or vehicle
- Tenant filtering is automatically applied based on user role

---

## Response Structure

### Driver Report Response:
```json
{
  "report_type": "by_driver",
  "period": {
    "start_date": "2025-12-14T00:00:00",
    "end_date": "2025-12-21T00:00:00",
    "range_type": "7days"
  },
  "summary": {
    "total_drivers": 5,
    "total_bookings": 25,
    "total_revenue": 50000.00,
    "total_driver_earnings": 39500.00,
    "total_paid": 30000.00,
    "total_pending": 20000.00
  },
  "drivers": [
    {
      "driver_id": 1,
      "driver_name": "Rajesh Kumar",
      "driver_email": "rajesh@example.com",
      "driver_phone": "+91-9876543210",
      "driver_rating": 4.8,
      "total_bookings": 10,
      "completed_bookings": 8,
      "pending_bookings": 1,
      "cancelled_bookings": 1,
      "total_transactions": 10,
      "total_revenue": 20000.00,
      "total_paid": 15000.00,
      "total_pending": 5000.00,
      "commission_breakdown": {
        "driver_earnings": 15800.00,
        "dispatcher_commission": 3600.00,
        "admin_commission": 400.00,
        "super_admin_commission": 200.00
      },
      "payment_status": {
        "paid_amount": 15000.00,
        "pending_amount": 5000.00,
        "paid_count": 8,
        "pending_count": 2
      },
      "transactions": [
        {
          "transaction_id": 101,
          "transaction_number": "TXN-2025-001",
          "friendly_booking_id": "DGDS-A1B2C3",
          "date": "2025-12-20T10:30:00",
          "customer_id": 5,
          "customer_name": "John Doe",
          "customer_phone": "+91-9876543211",
          "dispatcher_id": 2,
          "dispatcher_name": "Priya Sharma",
          "pickup_location": "MG Road, Bangalore",
          "destination_location": "Electronic City, Bangalore",
          "ride_duration_hours": 4,
          "status": "COMPLETED",
          "payment_method": "UPI",
          "is_paid": true,
          "total_amount": 2000.00,
          "paid_amount": 2000.00,
          "pending_amount": 0.00,
          "commission_split": {
            "driver_share": 1580.00,
            "driver_percentage": 79,
            "dispatcher_share": 360.00,
            "dispatcher_percentage": 18,
            "admin_share": 40.00,
            "admin_percentage": 2,
            "super_admin_share": 20.00,
            "super_admin_percentage": 1
          }
        }
      ]
    }
  ]
}
```

---

## Key Features

### 1. **Complete Transaction Visibility**
Every report shows complete transaction details including all stakeholders involved.

### 2. **Commission Transparency**
Each transaction shows exactly how the amount is split among all parties.

### 3. **Payment Tracking**
Clear visibility of paid vs pending amounts for accurate financial tracking.

### 4. **Performance Metrics**
- Booking counts by status (completed, pending, cancelled)
- Completion rates
- Revenue tracking

### 5. **Drill-Down Capability**
- View summary statistics
- Drill down to individual transactions
- See complete details for each transaction

---

## Use Cases

### For Drivers:
- Track total earnings (79% of all completed rides)
- Monitor pending payments
- View booking history and customer details

### For Customers:
- Track total spending
- View payment history
- Monitor outstanding dues

### For Dispatchers:
- Track commission earnings (18% of coordinated rides)
- Monitor booking coordination performance
- View pending commission payments

### For Admin:
- Monitor platform operations
- Track admin commission (2% of all transactions)
- View platform-wide transaction details

### For Super Admin:
- Complete platform oversight
- Track super admin commission (1% of all transactions)
- Monitor all stakeholders and transactions
- Platform-wide statistics and analytics

---

## Testing the Reports

### 1. Test Driver Report:
```bash
curl -X POST http://localhost:2060/api/reports/detailed/drivers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "7days"
    }
  }'
```

### 2. Test Customer Report:
```bash
curl -X POST http://localhost:2060/api/reports/detailed/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "7days"
    }
  }'
```

### 3. Test Dispatcher Report:
```bash
curl -X POST http://localhost:2060/api/reports/detailed/dispatchers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "7days"
    }
  }'
```

### 4. Test Admin Report:
```bash
curl -X POST http://localhost:2060/api/reports/detailed/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "7days"
    }
  }'
```

### 5. Test Super Admin Report:
```bash
curl -X POST http://localhost:2060/api/reports/detailed/super-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "7days"
    }
  }'
```

---

## Implementation Files

1. **`backend/detailed_reports.py`** - Core report generation logic
2. **`backend/reports.py`** - Enhanced driver report with commission breakdown
3. **`backend/main.py`** - API endpoints for all detailed reports

---

## Next Steps

To integrate these reports into your frontend:

1. Create UI components to display the detailed reports
2. Add drill-down functionality to view individual transactions
3. Implement export functionality (CSV/Excel) for reports
4. Add visualization charts for commission breakdown
5. Create dashboard widgets showing key metrics

---

## Notes

- All reports respect tenant filtering for multi-tenant support
- Rate limiting is applied (20 requests per minute)
- All monetary values are in the base currency (INR)
- Dates are in ISO 8601 format
- Commission percentages are fixed but can be configured in the system
