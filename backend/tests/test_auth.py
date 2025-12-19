"""
Tests for authentication endpoints
"""
import pytest
from fastapi import status


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "role": "CUSTOMER"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "CUSTOMER"
    assert "password_hash" not in data


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "AnotherPass123!",
            "role": "CUSTOMER"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_register_weak_password(client):
    """Test registration with weak password"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "weak@test.com",
            "password": "weak",
            "role": "CUSTOMER"
        }
    )
    assert response.status_code == 422  # Validation error


def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"


def test_login_wrong_password(client, test_user):
    """Test login with wrong password"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123!"
        }
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@test.com",
            "password": "SomePassword123!"
        }
    )
    assert response.status_code == 401


def test_get_current_user(client, auth_headers):
    """Test getting current user info"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "ADMIN"


def test_get_current_user_unauthorized(client):
    """Test getting current user without token"""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_change_password(client, auth_headers):
    """Test password change"""
    response = client.post(
        "/api/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "TestPassword123!",
            "new_password": "NewSecurePass123!"
        }
    )
    assert response.status_code == 200
    
    # Verify new password works
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "NewSecurePass123!"
        }
    )
    assert login_response.status_code == 200


def test_change_password_wrong_current(client, auth_headers):
    """Test password change with wrong current password"""
    response = client.post(
        "/api/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "WrongPassword123!",
            "new_password": "NewSecurePass123!"
        }
    )
    assert response.status_code == 400


def test_logout(client, auth_headers):
    """Test logout endpoint"""
    response = client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    assert "Logged out successfully" in response.json()["message"]

