import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine(os.getenv('DATABASE_URL'))
Session = sessionmaker(bind=engine)
session = Session()

# Create the payment_transactions table
try:
    # Check if enums exist first
    result = session.execute(text("""
        SELECT typname FROM pg_type WHERE typname = 'paymentpayertype';
    """)).fetchone()
    
    if not result:
        session.execute(text("""
            CREATE TYPE paymentpayertype AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN');
        """))
        print('Created paymentpayertype enum')
    
    result = session.execute(text("""
        SELECT typname FROM pg_type WHERE typname = 'paymentstatus';
    """)).fetchone()
    
    if not result:
        session.execute(text("""
            CREATE TYPE paymentstatus AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
        """))
        print('Created paymentstatus enum')
    
    # Create table
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id SERIAL PRIMARY KEY,
            ride_transaction_id INTEGER NOT NULL REFERENCES ride_transactions(id) ON DELETE CASCADE,
            payment_method paymentmethod NOT NULL,
            amount NUMERIC(10,2) NOT NULL,
            payer_type paymentpayertype NOT NULL,
            razorpay_order_id VARCHAR(100),
            razorpay_payment_id VARCHAR(100),
            razorpay_signature VARCHAR(255),
            status paymentstatus NOT NULL DEFAULT 'PENDING',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))
    
    # Create index
    session.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_payment_transactions_id ON payment_transactions(id);
    """))
    
    session.commit()
    print('Payment transactions table created successfully')
except Exception as e:
    print(f'Error: {e}')
    session.rollback()
finally:
    session.close()
