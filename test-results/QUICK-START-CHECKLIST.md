# Quick Start Testing Checklist

## 🚀 Start Application
```bash
cd /Users/ratxensolutionspvtltd/CascadeProjects/windsurf-project-2
docker-compose up -d
```

## ✅ Pre-Test Verification
- [ ] http://localhost:2050 loads (Frontend)
- [ ] http://localhost:2070/api/health returns healthy
- [ ] All 3 containers running: `docker ps`

## 📋 Complete Workflow Checklist

### Phase 1: Entity Setup
- [ ] **Create Customer** → Add Customer → Fill form → Register
- [ ] **Create Driver** → Add Driver → Fill form → Register  
- [ ] **Create Dispatcher** → Add Dispatcher → Fill form → Create
- [ ] **Add Vehicle** → Vehicles → Fill form → Add Vehicle

### Phase 2: Booking
- [ ] **Create Booking** → New Booking → Select all entities → Create
- [ ] **Verify** → Check TXN number generated, amounts calculated

### Phase 3: Trip Lifecycle
- [ ] **REQUESTED** → Manage trip → Accept Ride
- [ ] **DRIVER_ACCEPTED** → Start Enroute
- [ ] **ENROUTE_TO_PICKUP** → Customer Picked Up
- [ ] **CUSTOMER_PICKED** → Arrived at Destination
- [ ] **AT_DESTINATION** → Complete Trip
- [ ] **COMPLETED** → Ready for payment

### Phase 4: Payment
- [ ] **Cash Payment** → Record Cash Payment button
- [ ] **OR Razorpay** → Pay with Razorpay (needs real keys)

### Phase 5: Verification
- [ ] **Summary** → Check totals match
- [ ] **By Customer** → Click for breakdown
- [ ] **By Driver** → Verify 75% share
- [ ] **By Transaction** → Deep dive view

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend not loading | `docker restart dgds-frontend` |
| API errors | `docker logs dgds-backend` |
| Database issues | `docker restart dgds-postgres` |
| Razorpay fails | Check credentials in docker-compose.yml |

## 📊 Test Data Verification
```bash
# Quick counts
curl -s http://localhost:2070/api/customers/ | jq 'length'
curl -s http://localhost:2070/api/transactions/ | jq 'length'
curl -s http://localhost:2070/api/summary/transactions | jq '.total_amount'
```

---
**Full Manual:** See `TS-00002-E2E-WORKFLOW-MANUAL.md`
