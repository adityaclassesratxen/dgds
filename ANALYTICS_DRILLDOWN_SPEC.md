# Analytics Hierarchical Drill-Down Specification

## Overview
All analytics cards should provide deep, hierarchical drill-down with multiple levels of detail.

## Drill-Down Hierarchy Structure

### 1. **By Driver Analytics**
```
Level 1: Driver Summary Cards
  ├─ Total Revenue, Bookings, Commission
  ├─ Charts: Commission Distribution, Payment Status
  │
Level 2: Individual Driver Details (Expandable)
  ├─ Driver Profile (Name, ID, Registration Date)
  ├─ Performance Metrics
  │   ├─ Total Revenue Generated
  │   ├─ Commission Earned/Paid/Pending
  │   ├─ Booking Counts (Completed/Pending/Cancelled)
  │   └─ Payment Status Breakdown
  │
Level 3: Transaction List per Driver (Expandable)
  ├─ Transaction Details
  │   ├─ Transaction Number, Date
  │   ├─ Customer, Vehicle, Dispatcher
  │   ├─ Route (Pickup → Destination)
  │   ├─ Amount, Commission, Status
  │   └─ Payment Details
  │
Level 4: Payment History per Transaction (Expandable)
  └─ Payment Records
      ├─ Payment Method, Amount
      ├─ Payment Date, Status
      └─ Notes
```

### 2. **By Customer Analytics**
```
Level 1: Customer Summary Cards
  ├─ Total Customers, Spending, Bookings
  ├─ Charts: Top Customers, Spending Trends
  │
Level 2: Individual Customer Details (Expandable)
  ├─ Customer Profile (Name, Email, Phone)
  ├─ Spending Metrics
  │   ├─ Total Amount Spent
  │   ├─ Total Bookings
  │   ├─ Average Trip Value
  │   └─ Payment Status
  │
Level 3: Booking History per Customer (Expandable)
  ├─ Trip Details
  │   ├─ Date, Transaction Number
  │   ├─ Driver, Vehicle, Dispatcher
  │   ├─ Route, Duration
  │   ├─ Amount, Payment Status
  │   └─ Trip Status
  │
Level 4: Payment Details per Booking (Expandable)
  └─ Payment Information
      ├─ Payment Method, Amount Paid
      ├─ Pending Amount
      └─ Payment History
```

### 3. **By Transaction Analytics**
```
Level 1: Transaction Summary Cards
  ├─ Total Transactions, Revenue, Status Distribution
  ├─ Charts: Status Breakdown, Revenue Trends
  │
Level 2: Transaction List (Filterable/Sortable)
  ├─ Transaction Details
  │   ├─ Transaction Number, Date
  │   ├─ Customer, Driver, Dispatcher
  │   ├─ Vehicle, Route
  │   ├─ Amount Breakdown
  │   └─ Status
  │
Level 3: Commission Breakdown per Transaction (Expandable)
  ├─ Commission Distribution
  │   ├─ Driver Share (79%)
  │   ├─ Dispatcher Share (18%)
  │   ├─ Admin Share (2%)
  │   └─ Super Admin Share (1%)
  │
Level 4: Payment Timeline per Transaction (Expandable)
  └─ Payment Events
      ├─ Payment Date, Method
      ├─ Amount, Status
      └─ Payer Information
```

### 4. **By Dispatcher Analytics**
```
Level 1: Dispatcher Summary Cards
  ├─ Total Dispatchers, Commission, Assignments
  ├─ Charts: Commission Distribution, Performance
  │
Level 2: Individual Dispatcher Details (Expandable)
  ├─ Dispatcher Profile (Name, Contact)
  ├─ Performance Metrics
  │   ├─ Total Commission Earned
  │   ├─ Total Assignments
  │   ├─ Success Rate
  │   └─ Payment Status
  │
Level 3: Assignment List per Dispatcher (Expandable)
  ├─ Trip Assignments
  │   ├─ Transaction Number, Date
  │   ├─ Customer, Driver, Vehicle
  │   ├─ Commission Amount
  │   └─ Status
  │
Level 4: Driver Performance under Dispatcher (Expandable)
  └─ Driver Metrics
      ├─ Driver Name, Total Trips
      ├─ Revenue Generated
      └─ Success Rate
```

### 5. **By Vehicle Analytics**
```
Level 1: Vehicle Summary Cards
  ├─ Total Vehicles, Revenue, Utilization
  ├─ Charts: Vehicle Type Distribution, Revenue by Vehicle
  ├─ Filter: Transmission Type (Automatic/Manual/All)
  │
Level 2: Individual Vehicle Details (Expandable)
  ├─ Vehicle Profile (Make, Model, Registration)
  ├─ Usage Metrics
  │   ├─ Total Trips
  │   ├─ Total Revenue Generated
  │   ├─ Average Trip Value
  │   └─ Utilization Rate
  │
Level 3: Trip History per Vehicle (Expandable)
  ├─ Trip Details
  │   ├─ Date, Transaction Number
  │   ├─ Customer, Driver
  │   ├─ Route, Duration
  │   ├─ Revenue
  │   └─ Status
  │
Level 4: Maintenance/Service Records (Future Enhancement)
  └─ Service History
      ├─ Service Date, Type
      ├─ Cost
      └─ Notes
```

### 6. **By Admin Analytics**
```
Level 1: Admin Commission Summary
  ├─ Total Commission (2% of all transactions)
  ├─ Charts: Commission Trends, Payment Status
  │
Level 2: Transaction List with Admin Commission (Expandable)
  ├─ Transaction Details
  │   ├─ Transaction Number, Date
  │   ├─ Total Amount
  │   ├─ Admin Share (2%)
  │   └─ Payment Status
  │
Level 3: Monthly/Yearly Breakdown (Expandable)
  └─ Time-based Analysis
      ├─ Month/Year
      ├─ Total Transactions
      ├─ Total Commission
      └─ Payment Status
```

### 7. **By Super Admin Analytics**
```
Level 1: Super Admin Commission Summary
  ├─ Total Commission (1% of all transactions)
  ├─ Charts: Commission Trends, Payment Status
  │
Level 2: Transaction List with Super Admin Commission (Expandable)
  ├─ Transaction Details
  │   ├─ Transaction Number, Date
  │   ├─ Total Amount
  │   ├─ Super Admin Share (1%)
  │   └─ Payment Status
  │
Level 3: Platform-wide Metrics (Expandable)
  └─ System Overview
      ├─ Total Users (All Roles)
      ├─ Total Revenue
      ├─ Commission Distribution
      └─ Growth Metrics
```

### 8. **Analytics Overview**
```
Level 1: Platform Summary Dashboard
  ├─ Key Metrics Cards
  │   ├─ Total Revenue
  │   ├─ Total Transactions
  │   ├─ Active Users (Customers, Drivers, Dispatchers)
  │   └─ Commission Summary
  ├─ Charts: Revenue Trends, User Growth, Transaction Status
  │
Level 2: Entity Breakdown (Tabs/Sections)
  ├─ Customers Summary
  ├─ Drivers Summary
  ├─ Dispatchers Summary
  ├─ Vehicles Summary
  └─ Transactions Summary
  │
Level 3: Quick Links to Detailed Reports
  └─ Navigate to specific entity drill-down
```

## UI/UX Features

### Expandable Sections
- Use accordion/collapsible components
- Show/hide icon indicators
- Smooth animations

### Data Tables
- Sortable columns
- Filterable data
- Pagination for large datasets
- Export functionality (CSV/PDF)

### Charts & Visualizations
- Pie charts for distributions
- Bar charts for comparisons
- Line charts for trends
- Interactive tooltips

### Filters & Controls
- Time period selection
- Entity-specific filters (e.g., transmission type for vehicles)
- Search functionality
- Status filters

### Color Coding
- Green: Completed/Paid
- Yellow: Pending/Partial
- Red: Cancelled/Unpaid
- Blue: In Progress

## Implementation Priority
1. ✅ Driver Analytics (Already has basic implementation)
2. Customer Analytics
3. Transaction Analytics
4. Dispatcher Analytics
5. Vehicle Analytics
6. Admin/Super Admin Analytics
7. Overview Analytics
