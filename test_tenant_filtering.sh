#!/bin/bash

# Test tenant filtering for all roles
echo "=========================================="
echo "TENANT FILTERING TEST SUITE"
echo "=========================================="
echo ""

# Get tokens for different roles
echo "Getting authentication tokens..."
CUSTOMER_TOKEN=$(curl -s -X POST http://localhost:30100/api/auth/quick-login/customer | jq -r '.access_token')
ADMIN_TOKEN=$(curl -s -X POST http://localhost:30100/api/auth/quick-login/admin | jq -r '.access_token')
SUPER_ADMIN_TOKEN=$(curl -s -X POST http://localhost:30100/api/auth/quick-login/super_admin | jq -r '.access_token')

# Get tenant IDs
DEMO_ID=$(curl -s http://localhost:30100/api/tenants/ -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | jq -r '.[] | select(.code == "DEMO") | .id')
DGDS_ID=$(curl -s http://localhost:30100/api/tenants/ -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | jq -r '.[] | select(.code == "DGDS") | .id')

echo "Demo Tenant ID: $DEMO_ID"
echo "DGDS Tenant ID: $DGDS_ID"
echo ""

# Test function
test_endpoint() {
    local role=$1
    local token=$2
    local tenant_id=$3
    local tenant_name=$4
    local endpoint=$5
    local endpoint_name=$6
    
    result=$(curl -s http://localhost:30100${endpoint} \
        -H "Authorization: Bearer $token" \
        -H "X-Tenant-Id: $tenant_id" | jq 'length // "error"')
    
    echo "  $endpoint_name: $result records"
}

# Test Customer with Demo tenant
echo "=========================================="
echo "TEST 1: Customer + Demo Tenant"
echo "=========================================="
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DEMO_ID" "Demo" "/api/customers/" "Customers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DEMO_ID" "Demo" "/api/drivers/" "Drivers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DEMO_ID" "Demo" "/api/dispatchers/" "Dispatchers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DEMO_ID" "Demo" "/api/vehicles/" "Vehicles"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DEMO_ID" "Demo" "/api/transactions/" "Transactions"
echo ""

# Test Customer with DGDS tenant
echo "=========================================="
echo "TEST 2: Customer + DGDS Tenant"
echo "=========================================="
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DGDS_ID" "DGDS" "/api/customers/" "Customers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DGDS_ID" "DGDS" "/api/drivers/" "Drivers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DGDS_ID" "DGDS" "/api/dispatchers/" "Dispatchers"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DGDS_ID" "DGDS" "/api/vehicles/" "Vehicles"
test_endpoint "Customer" "$CUSTOMER_TOKEN" "$DGDS_ID" "DGDS" "/api/transactions/" "Transactions"
echo ""

# Test Admin with Demo tenant
echo "=========================================="
echo "TEST 3: Admin + Demo Tenant"
echo "=========================================="
test_endpoint "Admin" "$ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/customers/" "Customers"
test_endpoint "Admin" "$ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/drivers/" "Drivers"
test_endpoint "Admin" "$ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/dispatchers/" "Dispatchers"
test_endpoint "Admin" "$ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/vehicles/" "Vehicles"
test_endpoint "Admin" "$ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/transactions/" "Transactions"
echo ""

# Test Super Admin with Demo tenant
echo "=========================================="
echo "TEST 4: Super Admin + Demo Tenant"
echo "=========================================="
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/customers/" "Customers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/drivers/" "Drivers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/dispatchers/" "Dispatchers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/vehicles/" "Vehicles"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DEMO_ID" "Demo" "/api/transactions/" "Transactions"
echo ""

# Test Super Admin with DGDS tenant
echo "=========================================="
echo "TEST 5: Super Admin + DGDS Tenant"
echo "=========================================="
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DGDS_ID" "DGDS" "/api/customers/" "Customers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DGDS_ID" "DGDS" "/api/drivers/" "Drivers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DGDS_ID" "DGDS" "/api/dispatchers/" "Dispatchers"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DGDS_ID" "DGDS" "/api/vehicles/" "Vehicles"
test_endpoint "Super Admin" "$SUPER_ADMIN_TOKEN" "$DGDS_ID" "DGDS" "/api/transactions/" "Transactions"
echo ""

echo "=========================================="
echo "TEST SUITE COMPLETE"
echo "=========================================="
echo ""
echo "Expected Results:"
echo "  - Demo tenant should show 10 customers, 30 drivers, 5 dispatchers, 20 vehicles, 100 transactions"
echo "  - DGDS tenant should show 0 records (no data)"
echo ""
