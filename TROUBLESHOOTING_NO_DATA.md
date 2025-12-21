# Troubleshooting: No Records Showing in Analytics

## Issue
When clicking on analytics cards (By Driver, By Customer, etc.), no records are displayed.

## Common Causes

### 1. **Empty Database** (Most Common)
The database doesn't have any transaction data yet.

**Solution:** Create some test bookings first

#### Steps to Create Test Bookings:
1. Login to the application (use Quick Login if available)
2. Navigate to **"New Booking"** in the sidebar
3. Fill in the booking form:
   - Select a dispatcher
   - Select a customer (create one first if needed via "Add Customer")
   - Select a driver (create one first if needed via "Add Driver")
   - Select a vehicle
   - Enter pickup and destination locations
   - Set ride duration
4. Submit the booking
5. Repeat to create multiple bookings for better analytics

### 2. **Time Period Filter Too Narrow**
You selected a time period (e.g., "1 Day") but all your data is older.

**Solution:** Try selecting **"All Time"** filter

### 3. **No Data for Selected Report Type**
You're viewing "By Driver" but there are no drivers with completed transactions.

**Solution:** 
- Try different report types
- Ensure transactions are marked as "COMPLETED"
- Check that drivers are assigned to transactions

### 4. **API Connection Issues**
The frontend can't connect to the backend API.

**Solution:**
1. Open browser console (F12)
2. Check for error messages
3. Verify backend is running: `docker ps` should show `dgds-backend` as healthy
4. Check backend logs: `docker logs dgds-backend`

## Quick Test Data Setup

### Option 1: Using the UI (Recommended)
1. **Create a Customer:**
   - Go to "Add Customer"
   - Fill in name, email, address, contact
   - Submit

2. **Create a Driver:**
   - Go to "Add Driver"
   - Fill in driver details
   - Submit

3. **Create a Dispatcher:**
   - Go to "Add Dispatcher"
   - Fill in dispatcher details
   - Submit

4. **Create a Vehicle:**
   - Go to "Vehicles"
   - Add a new vehicle for the customer
   - Submit

5. **Create Bookings:**
   - Go to "New Booking"
   - Select all the entities you just created
   - Submit multiple bookings

### Option 2: Using Quick Login Test Accounts
If `ENABLE_DEV_AUTH=true` is set in backend `.env`:

1. Use Quick Login buttons on login page
2. Login as different roles to test
3. Create bookings as needed

### Option 3: Database Seeding (Advanced)
Create a seed script to populate test data:

```python
# seed_data.py
from database import SessionLocal
from models import Customer, Driver, Dispatcher, RideTransaction
from datetime import datetime, timedelta
import random

db = SessionLocal()

# Create test customers
customers = []
for i in range(5):
    customer = Customer(
        name=f"Test Customer {i+1}",
        email=f"customer{i+1}@test.com"
    )
    db.add(customer)
    customers.append(customer)

# Create test drivers
drivers = []
for i in range(3):
    driver = Driver(
        name=f"Test Driver {i+1}"
    )
    db.add(driver)
    drivers.append(driver)

# Create test dispatchers
dispatchers = []
for i in range(2):
    dispatcher = Dispatcher(
        name=f"Test Dispatcher {i+1}",
        email=f"dispatcher{i+1}@test.com",
        contact_number=f"555-000{i+1}"
    )
    db.add(dispatcher)
    dispatchers.append(dispatcher)

db.commit()

# Create test transactions
for i in range(20):
    days_ago = random.randint(0, 30)
    transaction = RideTransaction(
        customer_id=random.choice(customers).id,
        driver_id=random.choice(drivers).id,
        dispatcher_id=random.choice(dispatchers).id,
        pickup_location="Location A",
        destination_location="Location B",
        ride_duration_hours=random.randint(2, 8),
        total_amount=random.randint(1000, 5000),
        paid_amount=random.randint(500, 5000),
        status="COMPLETED",
        payment_method="UPI",
        created_at=datetime.now() - timedelta(days=days_ago)
    )
    db.add(transaction)

db.commit()
db.close()

print("Test data created successfully!")
```

Run it:
```bash
docker exec dgds-backend python seed_data.py
```

## Debugging Steps

### 1. Check Browser Console
Open Developer Tools (F12) and look for:
- Network errors (red entries in Network tab)
- Console errors (red messages in Console tab)
- API response data (click on network requests to see responses)

### 2. Check Backend Logs
```bash
docker logs dgds-backend --tail 100
```

Look for:
- API endpoint errors
- Database connection issues
- Authentication problems

### 3. Verify Database Connection
```bash
docker exec dgds-backend python -c "from database import SessionLocal; from models import RideTransaction; db = SessionLocal(); print(f'Transactions: {db.query(RideTransaction).count()}'); db.close()"
```

### 4. Test API Directly
Use curl or Postman to test the analytics endpoint:

```bash
curl -X POST http://localhost:2060/api/analytics/drivers/comprehensive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_range": {
      "range_type": "all",
      "start_date": null,
      "end_date": null
    },
    "tenant_id": null,
    "driver_id": null,
    "customer_id": null,
    "dispatcher_id": null
  }'
```

## Expected Behavior

### When Data Exists:
- Summary cards show totals
- Driver list displays with detailed metrics
- Commission breakdowns are visible
- Transaction counts are shown

### When No Data:
- Friendly "No Data Available" message
- Helpful tips for creating data
- Suggestion to try "All Time" filter

## Still Having Issues?

1. **Check Environment Variables:**
   - Verify `DATABASE_URL` in backend `.env`
   - Ensure `VITE_API_BASE_URL` in frontend `.env`

2. **Restart Containers:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

3. **Check Database:**
   ```bash
   docker exec -it dgds-postgres psql -U postgres -d uber_clone_test_db
   \dt  # List tables
   SELECT COUNT(*) FROM ride_transactions;
   \q   # Exit
   ```

4. **Review Console Logs:**
   - Frontend: Browser console (F12)
   - Backend: `docker logs dgds-backend`
   - Database: `docker logs dgds-postgres`

## Quick Checklist

- [ ] Backend container is running
- [ ] Frontend container is running
- [ ] Database container is healthy
- [ ] Can login successfully
- [ ] At least one customer exists
- [ ] At least one driver exists
- [ ] At least one dispatcher exists
- [ ] At least one booking/transaction exists
- [ ] Selected "All Time" as time filter
- [ ] Checked browser console for errors
- [ ] Checked backend logs for errors

## Contact Support

If you've tried all the above and still see no data, please provide:
1. Browser console logs (F12 → Console tab)
2. Backend logs (`docker logs dgds-backend`)
3. Database transaction count
4. Screenshots of the issue
