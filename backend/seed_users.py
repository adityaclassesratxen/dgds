#!/usr/bin/env python3.11
"""Script to create User accounts for quick login"""

from database import SessionLocal
from models import User, UserRole
from auth import get_password_hash

def seed_users():
    db = SessionLocal()
    
    # List of users to create
    users_to_create = [
        {
            "email": "admin@dgds.com",
            "password": "admin123",
            "role": UserRole.ADMIN
        },
        {
            "email": "dispatcher@dgds.com",
            "password": "dispatch123",
            "role": UserRole.DISPATCHER
        },
        {
            "email": "driver@dgds.com",
            "password": "driver123",
            "role": UserRole.DRIVER
        },
        {
            "email": "superadmin@dgds.com",
            "password": "super123",
            "role": UserRole.SUPER_ADMIN
        }
    ]
    
    try:
        for user_data in users_to_create:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                print(f"User {user_data['email']} already exists, skipping...")
                continue
            
            # Create new user
            hashed_password = get_password_hash(user_data["password"])
            user = User(
                email=user_data["email"],
                password_hash=hashed_password,
                role=user_data["role"],
                is_active=True,
                is_verified=True
            )
            
            db.add(user)
            print(f"Created user: {user_data['email']} ({user_data['role']})")
        
        # Commit all changes
        db.commit()
        print("\n✓ User accounts created successfully!")
        
        # Display login credentials
        print("\nQuick Login Credentials:")
        print("-" * 40)
        for user_data in users_to_create:
            print(f"Email: {user_data['email']}")
            print(f"Password: {user_data['password']}")
            print(f"Role: {user_data['role']}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
