"""Add multi-tenant support

Revision ID: 001
Revises: 
Create Date: 2025-01-20 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
    op.create_index(op.f('ix_tenants_code'), 'tenants', ['code'], unique=True)
    
    # Add tenant_id columns to existing tables
    op.add_column('users', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('customers', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('drivers', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('dispatchers', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('ride_transactions', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('payment_transactions', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('saved_payment_methods', sa.Column('tenant_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_users_tenant_id', 'users', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_customers_tenant_id', 'customers', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_drivers_tenant_id', 'drivers', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_dispatchers_tenant_id', 'dispatchers', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_ride_transactions_tenant_id', 'ride_transactions', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_payment_transactions_tenant_id', 'payment_transactions', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_saved_payment_methods_tenant_id', 'saved_payment_methods', 'tenants', ['tenant_id'], ['id'])


def downgrade():
    # Remove foreign key constraints
    op.drop_constraint('fk_saved_payment_methods_tenant_id', 'saved_payment_methods', type_='foreignkey')
    op.drop_constraint('fk_payment_transactions_tenant_id', 'payment_transactions', type_='foreignkey')
    op.drop_constraint('fk_ride_transactions_tenant_id', 'ride_transactions', type_='foreignkey')
    op.drop_constraint('fk_dispatchers_tenant_id', 'dispatchers', type_='foreignkey')
    op.drop_constraint('fk_drivers_tenant_id', 'drivers', type_='foreignkey')
    op.drop_constraint('fk_customers_tenant_id', 'customers', type_='foreignkey')
    op.drop_constraint('fk_users_tenant_id', 'users', type_='foreignkey')
    
    # Remove tenant_id columns
    op.drop_column('saved_payment_methods', 'tenant_id')
    op.drop_column('payment_transactions', 'tenant_id')
    op.drop_column('ride_transactions', 'tenant_id')
    op.drop_column('dispatchers', 'tenant_id')
    op.drop_column('drivers', 'tenant_id')
    op.drop_column('customers', 'tenant_id')
    op.drop_column('users', 'tenant_id')
    
    # Drop tenants table
    op.drop_index(op.f('ix_tenants_code'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_id'), table_name='tenants')
    op.drop_table('tenants')
