# DGDS Clone - Ride Booking Management System

## Overview
A comprehensive ride booking management system built with FastAPI (backend) and React (frontend). This system manages customers, drivers, dispatchers, vehicles, bookings, payments, and financial reporting.

## Architecture
- **Backend:** FastAPI with SQLAlchemy ORM
- **Frontend:** React with Tailwind CSS
- **Database:** PostgreSQL
- **Payment Gateway:** Razorpay, PhonePe
- **Containerization:** Docker & Docker Compose

## Features

### Core Modules
1. **Customer Management**
   - Customer registration with addresses and contacts
   - CRUD operations for customer data
   - Primary address and contact management

2. **Driver Management**
   - Driver registration with addresses and contacts
   - Driver performance tracking
   - Earnings and commission management

3. **Dispatcher Management**
   - Dispatcher registration and assignment
   - Commission tracking
   - Performance analytics

4. **Vehicle Management**
   - Vehicle registration per customer
   - Vehicle type and transmission details
   - Registration number tracking

5. **Booking System**
   - Create new bookings with customer, driver, dispatcher, vehicle
   - Route management (pickup to destination)
   - Hourly rate calculations

6. **Trip Lifecycle Management**
   - Status flow: REQUESTED → DRIVER_ACCEPTED → ENROUTE_TO_PICKUP → CUSTOMER_PICKED → AT_DESTINATION → COMPLETED
   - Trip status persistence
   - Status reversal capabilities
   - Trip cancellation and restoration

7. **Payment Processing**
   - Multiple payment methods: Razorpay, PhonePe, Cash
   - Payment verification and tracking
   - Payment history and settlements

8. **Financial Reporting**
   - Commission breakdown (Customer 100%, Driver 75%, Admin 20%, Dispatcher 2%, Super Admin 3%)
   - Transaction summaries
   - Payment settlements
   - Filtered reports by date, customer, driver, dispatcher

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd windsurf-project-2
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker ps
   ```

### Access Points
| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:2050 | 2050 |
| Backend API | http://localhost:2070 | 2070 |
| API Documentation | http://localhost:2070/docs | 2070 |
| Database | localhost:2060 | 2060 |

## Configuration

### Environment Variables
Update `docker-compose.yml` with your credentials:

```yaml
# Razorpay Configuration
RAZORPAY_KEY_ID: rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET: YOUR_SECRET_KEY
RAZORPAY_WEBHOOK_SECRET: testingmyrideflow

# PhonePe Configuration
PHONEPE_CLIENT_ID: YOUR_CLIENT_ID
PHONEPE_CLIENT_SECRET: YOUR_SECRET
PHONEPE_MERCHANT_ID: YOUR_MERCHANT_ID
```

### Commission Structure
```yaml
HOURLY_RATE: 400
DRIVER_COMMISSION_PERCENT: 75
ADMIN_COMMISSION_PERCENT: 20
DISPATCHER_COMMISSION_PERCENT: 2
SUPER_ADMIN_COMMISSION_PERCENT: 3
```

## API Documentation

### Key Endpoints

#### Authentication
- `GET /api/health` - System health check

#### Customers
- `GET /api/customers/` - List all customers
- `POST /api/customers/` - Create new customer
- `GET /api/customers/{id}` - Get customer details
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Archive customer

#### Drivers
- `GET /api/drivers/` - List all drivers
- `POST /api/drivers/` - Create new driver
- `GET /api/drivers/{id}` - Get driver details
- `PUT /api/drivers/{id}` - Update driver
- `DELETE /api/drivers/{id}` - Archive driver

#### Dispatchers
- `GET /api/dispatchers/` - List all dispatchers
- `POST /api/dispatchers/` - Create new dispatcher
- `GET /api/dispatchers/{id}` - Get dispatcher details
- `PUT /api/dispatchers/{id}` - Update dispatcher
- `DELETE /api/dispatchers/{id}` - Archive dispatcher

#### Vehicles
- `GET /api/vehicles/` - List all vehicles
- `POST /api/vehicles/` - Add new vehicle
- `GET /api/vehicles/{id}` - Get vehicle details
- `DELETE /api/vehicles/{id}` - Delete vehicle

#### Bookings
- `GET /api/bookings/` - List all bookings
- `POST /api/bookings/` - Create new booking
- `GET /api/transactions/` - List all transactions
- `PATCH /api/bookings/{id}/status` - Update trip status
- `PATCH /api/bookings/{id}/payment` - Record payment

#### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify Razorpay payment
- `GET /api/payments/history/{transaction_id}` - Payment history

#### Reports
- `GET /api/summary/transactions` - Transaction summary
- `GET /api/summary/by-customer` - Customer-wise summary
- `GET /api/summary/by-driver` - Driver-wise summary
- `GET /api/summary/by-dispatcher` - Dispatcher-wise summary
- `GET /api/summary/by-payment` - Payment settlements

## Database Schema

### Core Tables
- `customers` - Customer information
- `customer_addresses` - Customer addresses
- `contact_numbers` - Contact details
- `drivers` - Driver information
- `dispatchers` - Dispatcher information
- `customer_vehicles` - Vehicle details
- `ride_transactions` - Bookings and trips
- `payment_transactions` - Payment records
- `ride_transaction_events` - Trip event logs

## Testing

### Running Tests
1. **Start the application**
   ```bash
   docker-compose up -d
   ```

2. **Follow the E2E Testing Manual**
   - See: `test-results/TS-00002-E2E-WORKFLOW-MANUAL.md`
   - Quick checklist: `test-results/QUICK-START-CHECKLIST.md`

### Test Coverage
- 24 comprehensive test cases
- Complete workflow testing
- Payment gateway integration
- Financial reporting verification

## Development

### Project Structure
```
windsurf-project-2/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── requirements.txt     # Python dependencies
│   └── migrations/          # Database migrations
├── frontend/
│   ├── src/
│   │   └── App.jsx          # React application
│   ├── package.json         # Node dependencies
│   └── Dockerfile          # Frontend container
├── test-results/            # Test documentation
├── docker-compose.yml       # Container orchestration
└── README.md               # This file
```

### Adding New Features
1. Update backend models in `models.py`
2. Create API endpoints in `main.py`
3. Update frontend in `App.jsx`
4. Add test cases in `test-results/`
5. Update documentation

### Code Standards
- Python: Follow PEP 8
- JavaScript: Use ESLint configuration
- Database: Use snake_case for column names
- API: Follow RESTful conventions

## Deployment

### Production Deployment
1. Update environment variables
2. Set up production database
3. Configure SSL certificates
4. Set up monitoring
5. Run database migrations

### Environment Variables
```bash
# Production
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Check if ports 2050, 2060, 2070 are free
   - Update ports in docker-compose.yml if needed

2. **Database connection errors**
   - Restart PostgreSQL container
   - Check DATABASE_URL in docker-compose.yml

3. **Payment failures**
   - Verify Razorpay credentials
   - Check webhook configuration

4. **Frontend not loading**
   - Clear browser cache
   - Check console for errors
   - Restart frontend container

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Update documentation
6. Submit a pull request

## License

This project is proprietary and confidential.

## Support

For technical support:
1. Check the troubleshooting section
2. Review test documentation
3. Check API documentation at `/docs`

## Version History

- **v1.0.0** - Initial release with core features
  - Customer, Driver, Dispatcher management
  - Booking and trip lifecycle
  - Payment integration
  - Financial reporting
  - Left sidebar navigation redesign
  - Trip status persistence fixes
  - Comprehensive testing manual

---

**Last Updated:** December 19, 2025
**Maintainer:** DGDS Development Team
