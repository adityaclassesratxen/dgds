"""
Tests for rate limiting
"""
import pytest
from fastapi import status


def test_rate_limit_login(client):
    """Test rate limiting on login endpoint"""
    # Make 11 requests (limit is 10/minute)
    responses = []
    for i in range(11):
        response = client.post(
            "/api/auth/login",
            json={
                "email": f"test{i}@example.com",
                "password": "WrongPassword123!"
            }
        )
        responses.append(response)
    
    # Last request should be rate limited
    assert responses[-1].status_code == 429


def test_rate_limit_register(client):
    """Test rate limiting on register endpoint"""
    # Make 6 requests (limit is 5/minute)
    responses = []
    for i in range(6):
        response = client.post(
            "/api/auth/register",
            json={
                "email": f"user{i}@test.com",
                "password": "SecurePass123!",
                "role": "CUSTOMER"
            }
        )
        responses.append(response)
    
    # Last request should be rate limited
    assert responses[-1].status_code == 429

