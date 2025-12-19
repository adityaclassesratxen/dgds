"""Add PaymentTransaction model

Revision ID: 001_add_payment_transactions
Revises: 
Create Date: 2025-12-18 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_add_payment_transactions'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create payment_payer_type enum
    op.execute("CREATE TYPE paymentpayertype AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN')")
    
    # Create payment_status enum
    op.execute("CREATE TYPE paymentstatus AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')")
    
    # Create payment_transactions table
    op.create_table('payment_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ride_transaction_id', sa.Integer(), nullable=False),
        sa.Column('payment_method', sa.Enum('RAZORPAY', 'PHONEPE', 'CASH', name='paymentmethod'), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payer_type', sa.Enum('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN', name='paymentpayertype'), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=100), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=100), nullable=True),
        sa.Column('razorpay_signature', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', name='paymentstatus'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['ride_transaction_id'], ['ride_transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_transactions_id'), 'payment_transactions', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_payment_transactions_id'), table_name='payment_transactions')
    op.drop_table('payment_transactions')
    op.execute("DROP TYPE paymentstatus")
    op.execute("DROP TYPE paymentpayertype")
