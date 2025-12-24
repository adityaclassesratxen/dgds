"""
Add Stripe payment fields and PAYTM payment method

This migration adds:
1. STRIPE and PAYTM to PaymentMethod enum
2. Stripe-specific fields to payment_transactions table
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Add new payment methods to enum
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'STRIPE'")
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'PAYTM'")
    
    # Add Stripe-specific columns to payment_transactions table
    op.add_column('payment_transactions', 
        sa.Column('stripe_payment_intent_id', sa.String(100), nullable=True))
    op.add_column('payment_transactions', 
        sa.Column('stripe_payment_method_id', sa.String(100), nullable=True))
    op.add_column('payment_transactions', 
        sa.Column('stripe_charge_id', sa.String(100), nullable=True))


def downgrade():
    # Remove Stripe columns
    op.drop_column('payment_transactions', 'stripe_charge_id')
    op.drop_column('payment_transactions', 'stripe_payment_method_id')
    op.drop_column('payment_transactions', 'stripe_payment_intent_id')
    
    # Note: PostgreSQL doesn't support removing enum values easily
    # You would need to recreate the enum type to remove values
