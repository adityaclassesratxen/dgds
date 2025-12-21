# Comprehensive Driver Analytics Guide

## Overview
This module provides in-depth analytics for driver performance, earnings, and payment tracking with complete transparency on revenue, commissions, and transaction status.

## Features

### 1. Revenue Tracking
- **Total Revenue Generated**: Complete sum of all transactions handled by the driver
- **Revenue by Status**: Breakdown of completed, pending, and cancelled bookings
- **Time-based Analysis**: Revenue trends over selected time periods

### 2. Commission Breakdown
The system tracks driver commission (79% of each transaction) with three key metrics:

#### Commission Earned
- Total commission earned from all transactions
- Calculated as 79% of transaction amount
- Includes all bookings regardless of payment status

#### Commission Paid
- Amount already paid out to the driver
- For fully paid transactions: Full 79% commission
- For partially paid transactions: Proportional commission based on payment received
- Example: If customer paid 60% of ₹1000, driver gets 79% of ₹600 = ₹474

#### Commission Pending
- Amount yet to be paid to the driver
- Calculated based on unpaid portion of transactions
- Helps track outstanding payables to drivers

### 3. Registration Charges
Track driver registration fees over different time periods:

#### By Day
- Daily registration charge totals
- Useful for tracking daily onboarding activity
- Format: `{"2025-12-21": 500, "2025-12-20": 1000}`

#### By Month
- Monthly registration charge aggregates
- Track seasonal onboarding trends
- Format: `{"2025-12": 5000, "2025-11": 3500}`

#### By Year
- Yearly registration totals
- Long-term growth analysis
- Format: `{"2025": 50000, "2024": 35000}`

### 4. Transaction Completion Status
Detailed tracking of payment completion for each transaction:

#### Fully Paid Transactions
- Transactions where `paid_amount >= total_amount`
- Driver receives full 79% commission
- List of transaction numbers provided

#### Partially Paid Transactions
- Transactions where `0 < paid_amount < total_amount`
- Driver receives proportional commission
- Tracks partial payment percentage
- List of transaction numbers provided

#### Unpaid Transactions
- Transactions where `paid_amount = 0`
- No commission paid yet
- Full commission pending
- List of transaction numbers provided

### 5. Payment Tracking
Comprehensive payment status for each driver:

- **Total Amount Collected**: Money received from customers
- **Total Amount Pending**: Outstanding payments from customers
- **Payment Completion Percentage**: Overall collection rate

## API Endpoints

### 1. Comprehensive Driver Analytics
**Endpoint**: `POST /api/analytics/drivers/comprehensive`

**Request Body**:
```json
{
  "date_range": {
    "range_type": "7days",
    "start_date": null,
    "end_date": null
  },
  "driver_id": null,
  "tenant_id": null
}
```

**Response Structure**:
```json
{
  "report_type": "comprehensive_driver_analytics",
  "period": {
    "start_date": "2025-12-14T00:00:00",
    "end_date": "2025-12-21T00:00:00",
    "range_type": "7days"
  },
  "summary": {
    "total_drivers": 5,
    "total_bookings": 50,
    "total_revenue": 100000.00,
    "total_commission_earned": 79000.00,
    "total_commission_paid": 60000.00,
    "total_commission_pending": 19000.00,
    "total_fully_paid_transactions": 35,
    "total_partially_paid_transactions": 10,
    "total_unpaid_transactions": 5,
    "total_registration_charges": 2500.00
  },
  "drivers": [
    {
      "driver_id": 1,
      "driver_name": "Rajesh Kumar",
      "driver_created_at": "2025-01-15T10:30:00",
      
      "total_revenue_generated": 25000.00,
      "total_bookings": 12,
      "completed_bookings": 10,
      "pending_bookings": 1,
      "cancelled_bookings": 1,
      
      "commission_earned": 19750.00,
      "commission_paid": 15800.00,
      "commission_pending": 3950.00,
      
      "total_amount_collected": 20000.00,
      "total_amount_pending": 5000.00,
      
      "fully_paid_transactions": 8,
      "partially_paid_transactions": 2,
      "unpaid_transactions": 2,
      "fully_paid_transaction_ids": ["TXN-001", "TXN-002", ...],
      "partially_paid_transaction_ids": ["TXN-010", "TXN-011"],
      "unpaid_transaction_ids": ["TXN-015", "TXN-016"],
      
      "registration_charges": {
        "total": 500.00,
        "by_day": {
          "2025-01-15": 500.00
        },
        "by_month": {
          "2025-01": 500.00
        },
        "by_year": {
          "2025": 500.00
        }
      },
      
      "transactions": [
        {
          "transaction_id": 101,
          "transaction_number": "TXN-001",
          "friendly_booking_id": "DGDS-A1B2C3",
          "date": "2025-12-20T10:30:00",
          "customer_name": "John Doe",
          "dispatcher_name": "Priya Sharma",
          "pickup_location": "MG Road",
          "destination_location": "Electronic City",
          "ride_duration_hours": 4,
          "status": "COMPLETED",
          "payment_method": "UPI",
          
          "total_amount": 2000.00,
          "paid_amount": 2000.00,
          "pending_amount": 0.00,
          "is_fully_paid": true,
          "payment_completion_percentage": 100.0,
          
          "driver_commission_earned": 1580.00,
          "driver_commission_paid": 1580.00,
          "driver_commission_pending": 0.00,
          
          "commission_breakdown": {
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

### 2. Registration Charges Timeline
**Endpoint**: `GET /api/analytics/drivers/registration-charges?driver_id=1`

**Response**:
```json
{
  "by_day": {
    "2025-12-21": 500,
    "2025-12-20": 1000,
    "2025-12-19": 500
  },
  "by_month": {
    "2025-12": 5000,
    "2025-11": 3500
  },
  "by_year": {
    "2025": 50000,
    "2024": 35000
  },
  "total": 85000
}
```

## Use Cases

### 1. Driver Payment Processing
**Scenario**: Process monthly driver payouts

**Steps**:
1. Call comprehensive analytics API with monthly date range
2. Review `commission_paid` vs `commission_pending` for each driver
3. Process payments for `commission_pending` amounts
4. Update transaction payment status

### 2. Performance Review
**Scenario**: Evaluate driver performance

**Metrics to Review**:
- Total revenue generated
- Completion rate (completed / total bookings)
- Average transaction value
- Payment collection efficiency

### 3. Financial Reconciliation
**Scenario**: Reconcile driver commissions

**Process**:
1. Get fully paid transactions list
2. Verify commission paid matches expected amount
3. Identify partially paid transactions
4. Calculate pending commission accurately

### 4. Registration Revenue Tracking
**Scenario**: Track onboarding revenue

**Analysis**:
- Daily registration trends
- Monthly onboarding patterns
- Yearly growth in driver base
- Registration revenue contribution

## Commission Calculation Examples

### Example 1: Fully Paid Transaction
```
Transaction Amount: ₹2000
Payment Status: Fully Paid (₹2000)
Driver Commission: 79% × ₹2000 = ₹1580
Commission Paid: ₹1580
Commission Pending: ₹0
```

### Example 2: Partially Paid Transaction
```
Transaction Amount: ₹2000
Payment Status: Partially Paid (₹1200)
Driver Commission Earned: 79% × ₹2000 = ₹1580
Payment Percentage: ₹1200 / ₹2000 = 60%
Commission Paid: ₹1580 × 60% = ₹948
Commission Pending: ₹1580 × 40% = ₹632
```

### Example 3: Unpaid Transaction
```
Transaction Amount: ₹2000
Payment Status: Unpaid (₹0)
Driver Commission Earned: 79% × ₹2000 = ₹1580
Commission Paid: ₹0
Commission Pending: ₹1580
```

## Integration with Frontend

### Display Driver Analytics Dashboard
```javascript
// Fetch comprehensive driver analytics
const response = await api.post('/api/analytics/drivers/comprehensive', {
  date_range: {
    range_type: '7days'
  },
  driver_id: selectedDriverId
});

const analytics = response.data;

// Display key metrics
console.log('Revenue:', analytics.drivers[0].total_revenue_generated);
console.log('Commission Earned:', analytics.drivers[0].commission_earned);
console.log('Commission Paid:', analytics.drivers[0].commission_paid);
console.log('Commission Pending:', analytics.drivers[0].commission_pending);

// Show transaction completion status
console.log('Fully Paid:', analytics.drivers[0].fully_paid_transactions);
console.log('Partially Paid:', analytics.drivers[0].partially_paid_transactions);
console.log('Unpaid:', analytics.drivers[0].unpaid_transactions);
```

### Display Registration Charges
```javascript
// Fetch registration charges timeline
const regCharges = await api.get('/api/analytics/drivers/registration-charges');

// Display by month
Object.entries(regCharges.by_month).forEach(([month, amount]) => {
  console.log(`${month}: ₹${amount}`);
});
```

## Business Rules

### Registration Charges
- Default: ₹500 per driver registration
- Configurable in system settings
- Tracked from driver creation date
- Non-refundable

### Commission Payment Schedule
- **Immediate**: For fully paid transactions
- **Proportional**: For partially paid transactions
- **Deferred**: For unpaid transactions until payment received

### Payment Tracking
- Real-time updates on transaction payment status
- Automatic commission calculation
- Transparent breakdown for drivers

## Reports Available

1. **Driver Performance Report**: Revenue, bookings, completion rate
2. **Commission Statement**: Earned, paid, pending breakdown
3. **Payment Status Report**: Transaction-level payment tracking
4. **Registration Revenue Report**: Time-based registration charges
5. **Outstanding Payables**: Pending commission summary

## Notes

- All monetary values are in INR (₹)
- Dates are in ISO 8601 format
- Commission percentages are fixed: Driver 79%, Dispatcher 18%, Admin 2%, Super Admin 1%
- Registration charges can be customized per business requirements
- Payment tracking is real-time and automatically updated

## Future Enhancements

1. **Automated Payout Integration**: Direct bank transfers
2. **Commission Advance**: Allow drivers to request advance on pending commission
3. **Performance Bonuses**: Additional incentives based on metrics
4. **Dynamic Commission Rates**: Adjust rates based on performance
5. **Detailed Expense Tracking**: Fuel, maintenance, etc.
