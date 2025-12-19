# DGDS (Driver-Dispatcher System) - Complete User Guide

## Overview
DGDS is a comprehensive ride-booking and transaction management system with the following commission split:
- **Driver**: 75%
- **Admin**: 20%
- **Dispatcher**: 2%
- **Super Admin**: 3%

## Access URLs
- **Frontend**: http://localhost:2050
- **Backend API**: http://localhost:2070

## 1. Customer Registration & Management

### Create Customer
1. Click **Register** in navigation
2. Fill in:
   - Name
   - Email
   - Address (address line, city, state, postal code, country)
   - Contact number (label like Mobile/Home, phone number)
3. Click **Register Customer**

### Manage Customers
1. Click **Customers** in navigation
2. For each customer, you can:
   - **View** (blue) - See full details including addresses and contacts
   - **Edit** (amber) - Update name and email
   - **Archive** (red) - Soft delete (can be restored via API)

## 2. Driver Registration & Management

### Create Driver
1. Click **+ Add Driver** in navigation
2. Fill in:
   - Name
   - Address details
   - Contact number
3. Click **Register Driver**

### Manage Drivers
1. Click **Drivers** in navigation
2. For each driver, you can:
   - **View** (blue) - See full details
   - **Edit** (amber) - Update name
   - **Archive** (red) - Soft delete

## 3. Dispatcher Management

### Create Dispatcher
1. Go to **Dispatchers** view
2. Click **Create Booking** on any dispatcher (this creates a new dispatcher if needed)

### Manage Dispatchers
1. Click **Dispatchers** in navigation
2. For each dispatcher, you can:
   - **View** (blue) - See full details
   - **Edit** (amber) - Update name, email, phone
   - **Archive** (red) - Soft delete
   - **Create Booking** (green) - Start new booking flow

## 4. Booking Flow (Dispatcher)

1. Select a dispatcher and click **Create Booking**
2. Fill in booking details:
   - Customer (from dropdown)
   - Driver (from dropdown)
   - Vehicle (from customer's vehicles)
   - Pickup location
   - Destination location
   - Return location (optional)
   - Ride duration (hours)
   - Payment method
3. Click **Create Booking**
4. System calculates:
   - Total amount (duration × hourly rate)
   - Commission splits (75% driver, 20% admin, 2% dispatcher, 3% super admin)

## 5. Driver Flow (Trip Status Management)

### Status Progression
```
REQUESTED → DRIVER_ACCEPTED → ENROUTE_TO_PICKUP → CUSTOMER_PICKED → AT_DESTINATION → COMPLETED
```

### Managing a Trip
1. Go to **Trips** view
2. Click **Manage** on any trip
3. Follow the driver flow:

| Current Status | Action Required |
|----------------|-----------------|
| REQUESTED | ✓ Accept Ride or ✗ Reject Ride |
| DRIVER_ACCEPTED | 🚗 Start - Enroute to Pickup |
| ENROUTE_TO_PICKUP | 👤 Customer Picked Up |
| CUSTOMER_PICKED | 📍 Arrived at Destination |
| AT_DESTINATION | ✅ Complete Trip |
| COMPLETED | 💰 Record Payment |

### Payment Recording
1. After trip is marked **COMPLETED**
2. Click **Record Payment** button
3. Payment amount is automatically filled (total amount)
4. Trip status updates to PAID

## 6. Reports & Analytics

### Summary View
1. Click **Summary** in navigation
2. View comprehensive reports:
   - Total trips, revenue, commissions
   - Customer-wise summary
   - Driver-wise summary
   - Dispatcher-wise summary
   - Transaction-wise details

### Filters Available
- Date range presets (Today, Yesterday, This Week, Last 7 Days, This Month, Last 30 Days)
- Custom date range
- Filter by dispatcher
- Filter by driver
- Filter by customer
- Search by transaction number

### Commission Breakdown
For each transaction, you can see:
- Total amount
- Driver share (75%)
- Admin share (20%)
- Dispatcher share (2%)
- Super Admin share (3%)
- Payment status (Paid/Unpaid)

## 7. Payment Methods Supported
- **Razorpay** (configured with test keys)
- **PhonePe** (configured with test environment)

## 8. Data Management Features

### Soft Delete (Archive)
- All entities support soft delete
- Archived items are hidden by default
- Can be restored via API endpoints

### CRUD Operations Summary

| Entity | Create | View | Edit | Archive |
|--------|--------|------|------|---------|
| Customer | ✓ | ✓ | ✓ | ✓ |
| Driver | ✓ | ✓ | ✓ | ✓ |
| Dispatcher | ✓ | ✓ | ✓ | ✓ |
| Trip | ✓ | ✓ | ✓ | ✗ (Cancel only) |

## 9. API Endpoints Reference

### Customers
- `GET /api/customers/` - List customers
- `POST /api/customers/` - Create customer
- `GET /api/customers/{id}` - Get customer details
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Archive customer
- `POST /api/customers/{id}/restore` - Restore archived

### Drivers
- `GET /api/drivers/` - List drivers
- `POST /api/drivers/` - Create driver
- `GET /api/drivers/{id}` - Get driver details
- `PUT /api/drivers/{id}` - Update driver
- `DELETE /api/drivers/{id}` - Archive driver
- `POST /api/drivers/{id}/restore` - Restore archived

### Dispatchers
- `GET /api/dispatchers/` - List dispatchers
- `POST /api/dispatchers/` - Create dispatcher
- `GET /api/dispatchers/{id}` - Get dispatcher details
- `PUT /api/dispatchers/{id}` - Update dispatcher
- `DELETE /api/dispatchers/{id}` - Archive dispatcher
- `POST /api/dispatchers/{id}/restore` - Restore archived

### Bookings/Trips
- `GET /api/transactions/` - List all trips
- `POST /api/bookings/` - Create new booking
- `PATCH /api/bookings/{id}/status` - Update trip status
- `PATCH /api/bookings/{id}/payment` - Record payment

### Reports
- `GET /api/summary/` - Get summary statistics
- `GET /api/summary/customers` - Customer-wise summary
- `GET /api/summary/drivers` - Driver-wise summary
- `GET /api/summary/dispatchers` - Dispatcher-wise summary
- `GET /api/summary/transactions` - Transaction details

## 10. Troubleshooting

### Common Issues
1. **Data not loading** - Check if backend is running on port 2070
2. **Payment not recording** - Ensure trip status is COMPLETED before recording payment
3. **Driver CRUD not working** - Verify is_archived field is properly set in database

### Database Tables
- `customers` - Customer information
- `drivers` - Driver information
- `dispatchers` - Dispatcher information
- `ride_transactions` - Trip/booking records
- `customer_addresses` - Customer addresses
- `driver_addresses` - Driver addresses
- `customer_contact_numbers` - Customer contacts
- `driver_contact_numbers` - Driver contacts
- `customer_vehicles` - Vehicle information

## 11. Environment Configuration

### Backend (.env)
```
DATABASE_URL=postgresql+psycopg2://uber:password@localhost:5432/uber-clone-test-db
DRIVER_COMMISSION_PERCENT=75
ADMIN_COMMISSION_PERCENT=20
DISPATCHER_COMMISSION_PERCENT=2
SUPER_ADMIN_COMMISSION_PERCENT=3
HOURLY_RATE=200
PHONEPE_MERCHANT_ID=PGTESTPAYUAT
PHONEPE_SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
RAZORPAY_KEY_SECRET=1234567890abcdef1234567890abcdef
```

### Frontend
- React application running on port 2050
- Uses Axios for API calls
- Tailwind CSS for styling
- Responsive design for mobile and desktop

## 12. Best Practices

1. **Always accept a ride before starting** - Follow the driver flow in sequence
2. **Record payment only after trip completion** - Payment can only be recorded for COMPLETED trips
3. **Use filters for large datasets** - Apply date and entity filters for better performance
4. **Archive instead of delete** - Preserve transaction history by using soft delete
5. **Verify commission splits** - Check the summary reports for accurate commission calculations

## 13. Security Notes
- All API endpoints are currently open (no authentication)
- Payment gateways are in test mode
- Database connection uses local PostgreSQL
- CORS is enabled for all origins (development mode)

## 14. Future Enhancements
- User authentication and role-based access
- Real-time notifications for trip status updates
- Mobile app for drivers
- Advanced analytics dashboard
- Automated payment processing
- GPS tracking integration
