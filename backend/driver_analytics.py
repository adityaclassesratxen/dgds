"""
Comprehensive Driver Analytics Module
Provides detailed driver performance metrics including:
- Revenue tracking
- Commission breakdown (earned, paid, pending)
- Registration charges over time periods
- Transaction completion status
- Payment tracking
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case
from decimal import Decimal
from models import (
    RideTransaction,
    PaymentTransaction,
    Customer,
    Driver,
    Dispatcher,
    TransactionStatus
)
from reports import get_date_range, ReportFilters


def generate_comprehensive_driver_analytics(db: Session, filters: ReportFilters):
    """
    Generate comprehensive driver analytics with:
    1. Total revenue generated
    2. Commission breakdown (earned, paid, pending)
    3. Registration charges by time period
    4. Transaction completion status
    5. Payment tracking details
    """
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Base query for transactions
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    if filters.driver_id:
        query = query.filter(RideTransaction.driver_id == filters.driver_id)
    
    transactions = query.all()
    
    # Group by driver with comprehensive analytics
    driver_analytics = {}
    
    for transaction in transactions:
        driver_id = transaction.driver_id
        if driver_id not in driver_analytics:
            driver = db.query(Driver).filter(Driver.id == driver_id).first()
            driver_analytics[driver_id] = {
                'driver_id': driver_id,
                'driver_name': driver.name if driver else 'Unknown',
                'driver_created_at': driver.created_at.isoformat() if driver and driver.created_at else None,
                
                # Revenue Metrics
                'total_revenue_generated': 0,
                'total_bookings': 0,
                'completed_bookings': 0,
                'pending_bookings': 0,
                'cancelled_bookings': 0,
                
                # Commission Breakdown
                'commission_earned': 0,  # Total commission earned (79%)
                'commission_paid': 0,     # Commission already paid out
                'commission_pending': 0,  # Commission yet to be paid
                
                # Payment Status
                'total_amount_collected': 0,  # Total money collected from customers
                'total_amount_pending': 0,    # Total money yet to be collected
                
                # Transaction Completion Status
                'fully_paid_transactions': 0,
                'partially_paid_transactions': 0,
                'unpaid_transactions': 0,
                'fully_paid_transaction_ids': [],
                'partially_paid_transaction_ids': [],
                'unpaid_transaction_ids': [],
                
                # Registration Charges (if applicable)
                'registration_charges': {
                    'total': 0,
                    'by_day': {},
                    'by_month': {},
                    'by_year': {}
                },
                
                # Detailed Transaction List
                'transactions': []
            }
        
        # Update booking counts
        driver_analytics[driver_id]['total_bookings'] += 1
        
        if transaction.status.value == 'COMPLETED':
            driver_analytics[driver_id]['completed_bookings'] += 1
        elif transaction.status.value == 'CANCELLED':
            driver_analytics[driver_id]['cancelled_bookings'] += 1
        else:
            driver_analytics[driver_id]['pending_bookings'] += 1
        
        # Revenue tracking
        total_amount = float(transaction.total_amount)
        paid_amount = float(transaction.paid_amount or 0)
        pending_amount = total_amount - paid_amount
        
        driver_analytics[driver_id]['total_revenue_generated'] += total_amount
        driver_analytics[driver_id]['total_amount_collected'] += paid_amount
        driver_analytics[driver_id]['total_amount_pending'] += pending_amount
        
        # Commission tracking (79% of transaction amount)
        driver_commission = float(transaction.driver_share)
        driver_analytics[driver_id]['commission_earned'] += driver_commission
        
        # Calculate commission paid/pending based on transaction payment status
        if transaction.is_paid:
            # If transaction is fully paid, driver commission is paid
            driver_analytics[driver_id]['commission_paid'] += driver_commission
        else:
            # If transaction is not fully paid, calculate proportional commission
            if total_amount > 0:
                payment_percentage = paid_amount / total_amount
                commission_paid = driver_commission * payment_percentage
                commission_pending = driver_commission * (1 - payment_percentage)
            else:
                commission_paid = 0
                commission_pending = driver_commission
            
            driver_analytics[driver_id]['commission_paid'] += commission_paid
            driver_analytics[driver_id]['commission_pending'] += commission_pending
        
        # Transaction completion status
        if paid_amount >= total_amount:
            driver_analytics[driver_id]['fully_paid_transactions'] += 1
            driver_analytics[driver_id]['fully_paid_transaction_ids'].append(transaction.transaction_number)
        elif paid_amount > 0:
            driver_analytics[driver_id]['partially_paid_transactions'] += 1
            driver_analytics[driver_id]['partially_paid_transaction_ids'].append(transaction.transaction_number)
        else:
            driver_analytics[driver_id]['unpaid_transactions'] += 1
            driver_analytics[driver_id]['unpaid_transaction_ids'].append(transaction.transaction_number)
        
        # Registration charges tracking (if this is a new driver registration transaction)
        # Assuming registration charge is a fixed amount or percentage
        # You can customize this logic based on your business rules
        if hasattr(transaction, 'registration_charge') and transaction.registration_charge:
            reg_charge = float(transaction.registration_charge)
            driver_analytics[driver_id]['registration_charges']['total'] += reg_charge
            
            # Track by day
            day_key = transaction.created_at.strftime('%Y-%m-%d')
            driver_analytics[driver_id]['registration_charges']['by_day'][day_key] = \
                driver_analytics[driver_id]['registration_charges']['by_day'].get(day_key, 0) + reg_charge
            
            # Track by month
            month_key = transaction.created_at.strftime('%Y-%m')
            driver_analytics[driver_id]['registration_charges']['by_month'][month_key] = \
                driver_analytics[driver_id]['registration_charges']['by_month'].get(month_key, 0) + reg_charge
            
            # Track by year
            year_key = transaction.created_at.strftime('%Y')
            driver_analytics[driver_id]['registration_charges']['by_year'][year_key] = \
                driver_analytics[driver_id]['registration_charges']['by_year'].get(year_key, 0) + reg_charge
        
        # Get related entities
        customer = db.query(Customer).filter(Customer.id == transaction.customer_id).first()
        dispatcher = db.query(Dispatcher).filter(Dispatcher.id == transaction.dispatcher_id).first()
        
        # Build detailed transaction record
        transaction_detail = {
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'customer_id': transaction.customer_id,
            'customer_name': customer.name if customer else 'N/A',
            'dispatcher_id': transaction.dispatcher_id,
            'dispatcher_name': dispatcher.name if dispatcher else 'N/A',
            'pickup_location': transaction.pickup_location,
            'destination_location': transaction.destination_location,
            'ride_duration_hours': transaction.ride_duration_hours,
            'status': transaction.status.value,
            'payment_method': transaction.payment_method.value,
            
            # Payment Details
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'is_fully_paid': paid_amount >= total_amount,
            'payment_completion_percentage': (paid_amount / total_amount * 100) if total_amount > 0 else 0,
            
            # Commission Details
            'driver_commission_earned': driver_commission,
            'driver_commission_paid': driver_commission if transaction.is_paid else (driver_commission * (paid_amount / total_amount) if total_amount > 0 else 0),
            'driver_commission_pending': 0 if transaction.is_paid else (driver_commission * (pending_amount / total_amount) if total_amount > 0 else driver_commission),
            
            # Full Commission Breakdown
            'commission_breakdown': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': float(transaction.dispatcher_share),
                'dispatcher_percentage': 18,
                'admin_share': float(transaction.admin_share),
                'admin_percentage': 2,
                'super_admin_share': float(transaction.super_admin_share),
                'super_admin_percentage': 1
            }
        }
        
        driver_analytics[driver_id]['transactions'].append(transaction_detail)
    
    # Calculate summary statistics
    summary = {
        'total_drivers': len(driver_analytics),
        'total_bookings': sum(d['total_bookings'] for d in driver_analytics.values()),
        'total_revenue': sum(d['total_revenue_generated'] for d in driver_analytics.values()),
        'total_commission_earned': sum(d['commission_earned'] for d in driver_analytics.values()),
        'total_commission_paid': sum(d['commission_paid'] for d in driver_analytics.values()),
        'total_commission_pending': sum(d['commission_pending'] for d in driver_analytics.values()),
        'total_fully_paid_transactions': sum(d['fully_paid_transactions'] for d in driver_analytics.values()),
        'total_partially_paid_transactions': sum(d['partially_paid_transactions'] for d in driver_analytics.values()),
        'total_unpaid_transactions': sum(d['unpaid_transactions'] for d in driver_analytics.values()),
        'total_registration_charges': sum(d['registration_charges']['total'] for d in driver_analytics.values())
    }
    
    return {
        'report_type': 'comprehensive_driver_analytics',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': summary,
        'drivers': list(driver_analytics.values())
    }


def get_driver_registration_charges_timeline(db: Session, driver_id: Optional[int] = None, tenant_id: Optional[int] = None):
    """
    Get registration charges timeline for drivers
    Breaks down by day, month, and year
    """
    query = db.query(Driver)
    
    if driver_id:
        query = query.filter(Driver.id == driver_id)
    
    if tenant_id:
        query = query.filter(Driver.tenant_id == tenant_id)
    
    drivers = query.all()
    
    timeline = {
        'by_day': {},
        'by_month': {},
        'by_year': {},
        'total': 0
    }
    
    # Assuming a fixed registration charge per driver
    # You can customize this based on your business model
    REGISTRATION_CHARGE = 500  # Example: ₹500 per driver registration
    
    for driver in drivers:
        if driver.created_at:
            charge = REGISTRATION_CHARGE
            timeline['total'] += charge
            
            # By day
            day_key = driver.created_at.strftime('%Y-%m-%d')
            timeline['by_day'][day_key] = timeline['by_day'].get(day_key, 0) + charge
            
            # By month
            month_key = driver.created_at.strftime('%Y-%m')
            timeline['by_month'][month_key] = timeline['by_month'].get(month_key, 0) + charge
            
            # By year
            year_key = driver.created_at.strftime('%Y')
            timeline['by_year'][year_key] = timeline['by_year'].get(year_key, 0) + charge
    
    return timeline
