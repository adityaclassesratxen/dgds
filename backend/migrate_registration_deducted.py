#!/usr/bin/env python3.11
"""Script to add registration_fee_deducted column to drivers table"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dgds_user:dgds_password@localhost:5432/dgds_clone_db",
)

def add_registration_deducted_column():
    """Add registration_fee_deducted column to drivers table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # SQL statement to add column
        sql = "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS registration_fee_deducted BOOLEAN DEFAULT FALSE"
        
        try:
            connection.execute(text(sql))
            print(f"✓ Executed: {sql}")
        except Exception as e:
            print(f"✗ Error executing {sql}: {e}")
        
        connection.commit()
        print("\nRegistration fee deducted migration completed!")

if __name__ == "__main__":
    add_registration_deducted_column()
