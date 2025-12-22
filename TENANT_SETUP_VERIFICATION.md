# Tenant Setup Verification Guide

## ✅ Backend Setup Complete

### Tenants Created
1. **DEMO Tenant** (ID: 1, Code: DEMO)
   - 20 Customers
   - 80 Drivers
   - 10 Dispatchers
   - 69 Vehicles
   - 300 Transactions
   - Total Revenue: ₹772,000
   - Date Range: Dec 2023 - Jan 2026

2. **DGDS Tenant** (ID: 2, Code: DGDS)
   - Empty - Ready for production testing

### API Endpoints Verified
- ✅ `/api/tenants/` - Returns list of tenants (ADMIN/SUPER_ADMIN only)
- ✅ Tenant filtering implemented via `X-Tenant-Id` header
- ✅ All data properly isolated by tenant_id

## 🎯 Frontend Tenant Dropdown Location

The tenant dropdown is located in the **sidebar** and is only visible to users with **ADMIN** or **SUPER_ADMIN** roles.

### Code Location
**File:** `frontend/src/App.jsx`
**Lines:** 1512-1538

```javascript
{/* Tenant Selector - Admin/Super Admin Only */}
{['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && (
  <div className="mb-3">
    <label className="block text-xs text-slate-400 mb-2">Select Tenant</label>
    <select
      value={selectedTenant?.id || ''}
      onChange={(e) => {
        const tenant = tenants.find(t => t.id === parseInt(e.target.value));
        handleTenantSelect(tenant);
      }}
      disabled={tenantLoading}
      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
    >
      <option value="">{tenantLoading ? 'Loading...' : 'All Tenants'}</option>
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name} ({tenant.code})
        </option>
      ))}
    </select>
    {selectedTenant && (
      <p className="text-xs text-green-400 mt-1">
        Active: {selectedTenant.name}
      </p>
    )}
  </div>
)}
```

## 📋 Complete Testing Workflow

### Step 1: Access the Application
1. Open browser: `http://localhost:2070`
2. You should see the login page

### Step 2: Create/Login as Admin User
You need a user with **ADMIN** or **SUPER_ADMIN** role to see the tenant dropdown.

**Option A: Create new admin user**
- Click "Register" 
- Fill in details
- Select role: "ADMIN" or "SUPER_ADMIN"
- Register and login

**Option B: Use test admin (if created)**
- Username: `testadmin`
- Password: `admin123`

### Step 3: Verify Tenant Dropdown
After logging in as ADMIN/SUPER_ADMIN:

1. **Check Sidebar** - Look for "Select Tenant" dropdown in the left sidebar
2. **Dropdown should show:**
   - "All Tenants" (default option)
   - "Demo Client (DEMO)"
   - "DGDS Client (DGDS)"

### Step 4: Test DEMO Tenant
1. Select "Demo Client (DEMO)" from dropdown
2. Navigate to **Dashboard**
   - Should show: 20 customers, 80 drivers, 300 transactions
3. Navigate to **Summary**
   - Should show transaction overview with ₹772,000 total
   - Commission breakdowns should be populated
4. Navigate to **Analytics**
   - Should show charts and data for DEMO tenant

### Step 5: Test DGDS Tenant
1. Select "DGDS Client (DGDS)" from dropdown
2. Navigate to **Dashboard**
   - Should show: 0 customers, 0 drivers, 0 transactions
3. Navigate to **Summary**
   - Should show empty state
4. Navigate to **Analytics**
   - Should show no data available

### Step 6: Test Data Isolation
1. Switch between DEMO and DGDS
2. Verify data changes correctly
3. Confirm DEMO data never appears in DGDS view
4. Confirm DGDS remains empty

## 🔍 Troubleshooting

### Tenant Dropdown Not Visible?
**Cause:** User role is not ADMIN or SUPER_ADMIN
**Solution:** 
- Logout and login with admin credentials
- Or register a new user with ADMIN role

### Dropdown Shows "Loading..." Forever?
**Cause:** API call to `/api/tenants/` is failing
**Solution:**
- Check browser console for errors
- Verify backend is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`

### Tenants Not Showing in Dropdown?
**Cause:** Tenants not created in database
**Solution:**
```bash
cd backend
docker-compose exec backend python verify_tenants.py
```

### Wrong Data Showing for Tenant?
**Cause:** Tenant filtering not working
**Solution:**
- Check browser Network tab for `X-Tenant-Id` header
- Verify selectedTenant state in React DevTools
- Check backend logs for tenant_id filtering

## 🛠️ Utility Commands

### Verify Tenants in Database
```bash
docker-compose exec backend python verify_tenants.py
```

### Re-seed DEMO Tenant
```bash
docker-compose exec backend python seed_data.py DEMO
```

### Seed DGDS Tenant (when ready)
```bash
docker-compose exec backend python seed_data.py DGDS
```

### Check Backend Logs
```bash
docker-compose logs -f backend
```

### Check Frontend Logs
```bash
docker-compose logs -f frontend
```

## ✅ Success Criteria

- [ ] Tenant dropdown visible in sidebar (ADMIN/SUPER_ADMIN only)
- [ ] Dropdown shows "Demo Client (DEMO)" and "DGDS Client (DGDS)"
- [ ] Selecting DEMO shows populated data (20 customers, 80 drivers, 300 transactions)
- [ ] Selecting DGDS shows empty state (0 for all counts)
- [ ] Dashboard stats update when switching tenants
- [ ] Summary view updates when switching tenants
- [ ] Analytics view updates when switching tenants
- [ ] Data is properly isolated between tenants
- [ ] Selected tenant persists on page refresh (localStorage)

## 📊 Expected Data Counts

| Entity | DEMO Tenant | DGDS Tenant |
|--------|-------------|-------------|
| Customers | 20 | 0 |
| Drivers | 80 | 0 |
| Dispatchers | 10 | 0 |
| Vehicles | 69 | 0 |
| Transactions | 300 | 0 |
| Total Revenue | ₹772,000 | ₹0 |

## 🎉 Next Steps After Verification

1. **Test all CRUD operations with DEMO tenant**
   - Create/Edit/Delete customers, drivers, dispatchers
   - Create new transactions
   - Verify all operations respect tenant isolation

2. **Populate DGDS with real data**
   - Once DEMO testing is complete
   - Use DGDS for production

3. **Test multi-tenant scenarios**
   - Multiple admin users
   - Switching between tenants rapidly
   - Concurrent operations on different tenants
