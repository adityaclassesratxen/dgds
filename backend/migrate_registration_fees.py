#!/usr/bin/env python3.11
"""Script to add registration fee columns to drivers table"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dgds_user:dgds_password@localhost:5432/dgds_clone_db",
)

def add_registration_fee_columns():
    """Add registration fee columns to drivers table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # SQL statements to add columns
        sql_statements = [
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS registration_fee_amount NUMERIC(10, 2) DEFAULT 500",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT FALSE",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS registration_fee_payment_id VARCHAR(100)"
        ]
        
        for sql in sql_statements:
            try:
                connection.execute(text(sql))
                print(f"✓ Executed: {sql}")
            except Exception as e:
                print(f"✗ Error executing {sql}: {e}")
        
        connection.commit()
        print("\nRegistration fee migration completed!")

if __name__ == "__main__":
    add_registration_fee_columns()
