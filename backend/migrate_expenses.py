#!/usr/bin/env python3.11
"""Script to add expense columns to ride_transactions table"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dgds_user:dgds_password@localhost:5432/dgds_clone_db",
)

def add_expense_columns():
    """Add expense columns to ride_transactions table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # SQL statements to add columns
        sql_statements = [
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS food_bill NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS outstation_bill NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS toll_fees NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS accommodation_bill NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS late_fine NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS pickup_location_fare NUMERIC(10, 2) DEFAULT 0",
            "ALTER TABLE ride_transactions ADD COLUMN IF NOT EXISTS accommodation_included BOOLEAN DEFAULT FALSE"
        ]
        
        for sql in sql_statements:
            try:
                connection.execute(text(sql))
                print(f"✓ Executed: {sql}")
            except Exception as e:
                print(f"✗ Error executing {sql}: {e}")
        
        connection.commit()
        print("\nMigration completed!")

if __name__ == "__main__":
    add_expense_columns()
