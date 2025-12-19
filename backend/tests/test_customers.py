"""
Tests for customer endpoints
"""
import pytest
from fastapi import status


def test_create_customer(client, auth_headers):
    """Test creating a customer"""
    response = client.post(
        "/api/customers/",
        headers=auth_headers,
        json={
            "name": "Test Customer",
            "email": "customer@test.com",
            "addresses": [{
                "address_line": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "India",
                "is_primary": True
            }],
            "contact_numbers": [{
                "label": "Mobile",
                "phone_number": "9876543210",
                "is_primary": True
            }]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Customer"
    assert data["email"] == "customer@test.com"
    assert len(data["addresses"]) == 1
    assert len(data["contact_numbers"]) == 1


def test_get_customers(client, auth_headers):
    """Test getting all customers"""
    response = client.get("/api/customers/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_customer_by_id(client, auth_headers):
    """Test getting a customer by ID"""
    # First create a customer
    create_response = client.post(
        "/api/customers/",
        headers=auth_headers,
        json={
            "name": "Test Customer",
            "email": "customer2@test.com",
            "addresses": [{
                "address_line": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "India",
                "is_primary": True
            }],
            "contact_numbers": [{
                "label": "Mobile",
                "phone_number": "9876543210",
                "is_primary": True
            }]
        }
    )
    customer_id = create_response.json()["id"]
    
    # Then get it
    response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == customer_id


def test_update_customer(client, auth_headers):
    """Test updating a customer"""
    # Create customer
    create_response = client.post(
        "/api/customers/",
        headers=auth_headers,
        json={
            "name": "Test Customer",
            "email": "customer3@test.com",
            "addresses": [{
                "address_line": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "India",
                "is_primary": True
            }],
            "contact_numbers": [{
                "label": "Mobile",
                "phone_number": "9876543210",
                "is_primary": True
            }]
        }
    )
    customer_id = create_response.json()["id"]
    
    # Update customer
    response = client.put(
        f"/api/customers/{customer_id}",
        headers=auth_headers,
        json={
            "name": "Updated Customer",
            "email": "customer3@test.com"
        }
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Customer"


def test_delete_customer(client, auth_headers):
    """Test deleting a customer"""
    # Create customer
    create_response = client.post(
        "/api/customers/",
        headers=auth_headers,
        json={
            "name": "Test Customer",
            "email": "customer4@test.com",
            "addresses": [{
                "address_line": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "India",
                "is_primary": True
            }],
            "contact_numbers": [{
                "label": "Mobile",
                "phone_number": "9876543210",
                "is_primary": True
            }]
        }
    )
    customer_id = create_response.json()["id"]
    
    # Delete customer
    response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)
    assert response.status_code == 200
    
    # Verify deleted
    get_response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)
    assert get_response.status_code == 404

