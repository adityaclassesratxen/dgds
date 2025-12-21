"""
Comprehensive drill-down reports with detailed commission breakdowns
Shows transaction details, payment status, and commission splits for all roles
Includes registration charges, payment tracking, and transaction completion status
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from decimal import Decimal
from models import (
    RideTransaction,
    PaymentTransaction,
    Customer,
    Driver,
    Dispatcher,
    CustomerVehicle,
    User,
    UserRole
)
from reports import get_date_range, ReportFilters


def generate_detailed_customer_report(db: Session, filters: ReportFilters):
    """
    Comprehensive customer report showing:
    - Total bookings and transactions
    - Payment breakdown (paid/pending)
    - Transaction history with details
    - Commission impact on pricing
    """
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    if filters.customer_id:
        query = query.filter(RideTransaction.customer_id == filters.customer_id)
    
    transactions = query.all()
    
    customer_stats = {}
    
    for transaction in transactions:
        customer_id = transaction.customer_id
        if customer_id not in customer_stats:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            # Get primary phone from contact_numbers relationship
            customer_phone = 'N/A'
            if customer and customer.contact_numbers:
                primary_contact = next((c for c in customer.contact_numbers if c.is_primary), None)
                customer_phone = primary_contact.phone_number if primary_contact else (customer.contact_numbers[0].phone_number if customer.contact_numbers else 'N/A')
            
            customer_stats[customer_id] = {
                'customer_id': customer_id,
                'customer_name': customer.name if customer else 'N/A',
                'customer_email': customer.email if customer else 'N/A',
                'customer_phone': customer_phone,
                'total_bookings': 0,
                'completed_bookings': 0,
                'pending_bookings': 0,
                'cancelled_bookings': 0,
                'total_spent': 0,
                'total_paid': 0,
                'total_pending': 0,
                'payment_breakdown': {
                    'paid_transactions': 0,
                    'pending_transactions': 0,
                    'paid_amount': 0,
                    'pending_amount': 0
                },
                'transactions': []
            }
        
        customer_stats[customer_id]['total_bookings'] += 1
        
        if transaction.status.value == 'COMPLETED':
            customer_stats[customer_id]['completed_bookings'] += 1
        elif transaction.status.value == 'CANCELLED':
            customer_stats[customer_id]['cancelled_bookings'] += 1
        else:
            customer_stats[customer_id]['pending_bookings'] += 1
        
        customer_stats[customer_id]['total_spent'] += float(transaction.total_amount)
        
        if transaction.is_paid:
            customer_stats[customer_id]['total_paid'] += float(transaction.paid_amount or 0)
            customer_stats[customer_id]['payment_breakdown']['paid_transactions'] += 1
            customer_stats[customer_id]['payment_breakdown']['paid_amount'] += float(transaction.paid_amount or 0)
        else:
            pending = float(transaction.total_amount) - float(transaction.paid_amount or 0)
            customer_stats[customer_id]['total_pending'] += pending
            customer_stats[customer_id]['payment_breakdown']['pending_transactions'] += 1
            customer_stats[customer_id]['payment_breakdown']['pending_amount'] += pending
        
        driver = db.query(Driver).filter(Driver.id == transaction.driver_id).first()
        dispatcher = db.query(Dispatcher).filter(Dispatcher.id == transaction.dispatcher_id).first()
        
        customer_stats[customer_id]['transactions'].append({
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'driver_id': transaction.driver_id,
            'driver_name': driver.name if driver else 'N/A',
            'dispatcher_id': transaction.dispatcher_id,
            'dispatcher_name': dispatcher.name if dispatcher else 'N/A',
            'pickup_location': transaction.pickup_location,
            'destination_location': transaction.destination_location,
            'ride_duration_hours': transaction.ride_duration_hours,
            'status': transaction.status.value,
            'payment_method': transaction.payment_method.value,
            'is_paid': transaction.is_paid,
            'total_amount': float(transaction.total_amount),
            'paid_amount': float(transaction.paid_amount or 0),
            'pending_amount': float(transaction.total_amount) - float(transaction.paid_amount or 0),
            'commission_breakdown': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': float(transaction.dispatcher_share),
                'dispatcher_percentage': 18,
                'admin_share': float(transaction.admin_share),
                'admin_percentage': 2,
                'super_admin_share': float(transaction.super_admin_share),
                'super_admin_percentage': 1,
                'note': 'Customer pays full amount which is distributed among stakeholders'
            }
        })
    
    return {
        'report_type': 'detailed_customer',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_customers': len(customer_stats),
            'total_bookings': sum(c['total_bookings'] for c in customer_stats.values()),
            'total_spent': sum(c['total_spent'] for c in customer_stats.values()),
            'total_paid': sum(c['total_paid'] for c in customer_stats.values()),
            'total_pending': sum(c['total_pending'] for c in customer_stats.values())
        },
        'customers': list(customer_stats.values())
    }


def generate_detailed_dispatcher_report(db: Session, filters: ReportFilters):
    """
    Comprehensive dispatcher report showing:
    - Total bookings coordinated
    - Commission earnings (18% of each transaction)
    - Transaction details with commission breakdown
    """
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    if filters.dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == filters.dispatcher_id)
    
    transactions = query.all()
    
    dispatcher_stats = {}
    
    for transaction in transactions:
        dispatcher_id = transaction.dispatcher_id
        if dispatcher_id not in dispatcher_stats:
            dispatcher = db.query(Dispatcher).filter(Dispatcher.id == dispatcher_id).first()
            dispatcher_stats[dispatcher_id] = {
                'dispatcher_id': dispatcher_id,
                'dispatcher_name': dispatcher.name if dispatcher else 'N/A',
                'dispatcher_email': dispatcher.email if dispatcher else 'N/A',
                'dispatcher_phone': dispatcher.contact_number if dispatcher else 'N/A',
                'total_bookings_coordinated': 0,
                'completed_bookings': 0,
                'pending_bookings': 0,
                'cancelled_bookings': 0,
                'total_commission_earned': 0,
                'commission_paid': 0,
                'commission_pending': 0,
                'transactions': []
            }
        
        dispatcher_stats[dispatcher_id]['total_bookings_coordinated'] += 1
        
        if transaction.status.value == 'COMPLETED':
            dispatcher_stats[dispatcher_id]['completed_bookings'] += 1
        elif transaction.status.value == 'CANCELLED':
            dispatcher_stats[dispatcher_id]['cancelled_bookings'] += 1
        else:
            dispatcher_stats[dispatcher_id]['pending_bookings'] += 1
        
        dispatcher_commission = float(transaction.dispatcher_share)
        dispatcher_stats[dispatcher_id]['total_commission_earned'] += dispatcher_commission
        
        if transaction.is_paid:
            dispatcher_stats[dispatcher_id]['commission_paid'] += dispatcher_commission
        else:
            dispatcher_stats[dispatcher_id]['commission_pending'] += dispatcher_commission
        
        customer = db.query(Customer).filter(Customer.id == transaction.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == transaction.driver_id).first()
        
        dispatcher_stats[dispatcher_id]['transactions'].append({
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'customer_id': transaction.customer_id,
            'customer_name': customer.name if customer else 'N/A',
            'driver_id': transaction.driver_id,
            'driver_name': driver.name if driver else 'N/A',
            'pickup_location': transaction.pickup_location,
            'destination_location': transaction.destination_location,
            'ride_duration_hours': transaction.ride_duration_hours,
            'status': transaction.status.value,
            'payment_method': transaction.payment_method.value,
            'is_paid': transaction.is_paid,
            'total_transaction_amount': float(transaction.total_amount),
            'dispatcher_commission': dispatcher_commission,
            'dispatcher_percentage': 18,
            'commission_status': 'Paid' if transaction.is_paid else 'Pending',
            'full_commission_breakdown': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': dispatcher_commission,
                'dispatcher_percentage': 18,
                'admin_share': float(transaction.admin_share),
                'admin_percentage': 2,
                'super_admin_share': float(transaction.super_admin_share),
                'super_admin_percentage': 1
            }
        })
    
    return {
        'report_type': 'detailed_dispatcher',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_dispatchers': len(dispatcher_stats),
            'total_bookings': sum(d['total_bookings_coordinated'] for d in dispatcher_stats.values()),
            'total_commission_earned': sum(d['total_commission_earned'] for d in dispatcher_stats.values()),
            'total_commission_paid': sum(d['commission_paid'] for d in dispatcher_stats.values()),
            'total_commission_pending': sum(d['commission_pending'] for d in dispatcher_stats.values())
        },
        'dispatchers': list(dispatcher_stats.values())
    }


def generate_detailed_admin_report(db: Session, filters: ReportFilters):
    """
    Comprehensive admin report showing:
    - Total transactions managed
    - Commission earnings (2% of each transaction)
    - Transaction details with commission breakdown
    """
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    transactions = query.all()
    
    admin_stats = {
        'total_transactions': 0,
        'completed_transactions': 0,
        'pending_transactions': 0,
        'cancelled_transactions': 0,
        'total_revenue': 0,
        'total_admin_commission': 0,
        'commission_paid': 0,
        'commission_pending': 0,
        'transactions': []
    }
    
    for transaction in transactions:
        admin_stats['total_transactions'] += 1
        
        if transaction.status.value == 'COMPLETED':
            admin_stats['completed_transactions'] += 1
        elif transaction.status.value == 'CANCELLED':
            admin_stats['cancelled_transactions'] += 1
        else:
            admin_stats['pending_transactions'] += 1
        
        admin_stats['total_revenue'] += float(transaction.total_amount)
        admin_commission = float(transaction.admin_share)
        admin_stats['total_admin_commission'] += admin_commission
        
        if transaction.is_paid:
            admin_stats['commission_paid'] += admin_commission
        else:
            admin_stats['commission_pending'] += admin_commission
        
        customer = db.query(Customer).filter(Customer.id == transaction.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == transaction.driver_id).first()
        dispatcher = db.query(Dispatcher).filter(Dispatcher.id == transaction.dispatcher_id).first()
        
        admin_stats['transactions'].append({
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'customer_name': customer.name if customer else 'N/A',
            'driver_name': driver.name if driver else 'N/A',
            'dispatcher_name': dispatcher.name if dispatcher else 'N/A',
            'pickup_location': transaction.pickup_location,
            'destination_location': transaction.destination_location,
            'ride_duration_hours': transaction.ride_duration_hours,
            'status': transaction.status.value,
            'payment_method': transaction.payment_method.value,
            'is_paid': transaction.is_paid,
            'total_transaction_amount': float(transaction.total_amount),
            'admin_commission': admin_commission,
            'admin_percentage': 2,
            'commission_status': 'Paid' if transaction.is_paid else 'Pending',
            'full_commission_breakdown': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': float(transaction.dispatcher_share),
                'dispatcher_percentage': 18,
                'admin_share': admin_commission,
                'admin_percentage': 2,
                'super_admin_share': float(transaction.super_admin_share),
                'super_admin_percentage': 1
            }
        })
    
    return {
        'report_type': 'detailed_admin',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_transactions': admin_stats['total_transactions'],
            'total_revenue': admin_stats['total_revenue'],
            'total_admin_commission': admin_stats['total_admin_commission'],
            'commission_paid': admin_stats['commission_paid'],
            'commission_pending': admin_stats['commission_pending'],
            'commission_percentage': 2
        },
        'admin_data': admin_stats
    }


def generate_detailed_super_admin_report(db: Session, filters: ReportFilters):
    """
    Comprehensive super admin report showing:
    - Total platform transactions
    - Commission earnings (1% of each transaction)
    - Complete transaction details with commission breakdown
    - Platform-wide statistics
    """
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    transactions = query.all()
    
    super_admin_stats = {
        'total_transactions': 0,
        'completed_transactions': 0,
        'pending_transactions': 0,
        'cancelled_transactions': 0,
        'total_platform_revenue': 0,
        'total_super_admin_commission': 0,
        'commission_paid': 0,
        'commission_pending': 0,
        'platform_statistics': {
            'total_drivers': 0,
            'total_customers': 0,
            'total_dispatchers': 0,
            'total_paid_amount': 0,
            'total_pending_amount': 0
        },
        'transactions': []
    }
    
    unique_drivers = set()
    unique_customers = set()
    unique_dispatchers = set()
    
    for transaction in transactions:
        super_admin_stats['total_transactions'] += 1
        
        unique_drivers.add(transaction.driver_id)
        unique_customers.add(transaction.customer_id)
        unique_dispatchers.add(transaction.dispatcher_id)
        
        if transaction.status.value == 'COMPLETED':
            super_admin_stats['completed_transactions'] += 1
        elif transaction.status.value == 'CANCELLED':
            super_admin_stats['cancelled_transactions'] += 1
        else:
            super_admin_stats['pending_transactions'] += 1
        
        super_admin_stats['total_platform_revenue'] += float(transaction.total_amount)
        super_admin_commission = float(transaction.super_admin_share)
        super_admin_stats['total_super_admin_commission'] += super_admin_commission
        
        if transaction.is_paid:
            super_admin_stats['commission_paid'] += super_admin_commission
            super_admin_stats['platform_statistics']['total_paid_amount'] += float(transaction.paid_amount or 0)
        else:
            super_admin_stats['commission_pending'] += super_admin_commission
            pending = float(transaction.total_amount) - float(transaction.paid_amount or 0)
            super_admin_stats['platform_statistics']['total_pending_amount'] += pending
        
        customer = db.query(Customer).filter(Customer.id == transaction.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == transaction.driver_id).first()
        dispatcher = db.query(Dispatcher).filter(Dispatcher.id == transaction.dispatcher_id).first()
        
        super_admin_stats['transactions'].append({
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'customer_name': customer.name if customer else 'N/A',
            'driver_name': driver.name if driver else 'N/A',
            'dispatcher_name': dispatcher.name if dispatcher else 'N/A',
            'pickup_location': transaction.pickup_location,
            'destination_location': transaction.destination_location,
            'ride_duration_hours': transaction.ride_duration_hours,
            'status': transaction.status.value,
            'payment_method': transaction.payment_method.value,
            'is_paid': transaction.is_paid,
            'total_transaction_amount': float(transaction.total_amount),
            'super_admin_commission': super_admin_commission,
            'super_admin_percentage': 1,
            'commission_status': 'Paid' if transaction.is_paid else 'Pending',
            'full_commission_breakdown': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': float(transaction.dispatcher_share),
                'dispatcher_percentage': 18,
                'admin_share': float(transaction.admin_share),
                'admin_percentage': 2,
                'super_admin_share': super_admin_commission,
                'super_admin_percentage': 1
            }
        })
    
    super_admin_stats['platform_statistics']['total_drivers'] = len(unique_drivers)
    super_admin_stats['platform_statistics']['total_customers'] = len(unique_customers)
    super_admin_stats['platform_statistics']['total_dispatchers'] = len(unique_dispatchers)
    
    return {
        'report_type': 'detailed_super_admin',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_transactions': super_admin_stats['total_transactions'],
            'total_platform_revenue': super_admin_stats['total_platform_revenue'],
            'total_super_admin_commission': super_admin_stats['total_super_admin_commission'],
            'commission_paid': super_admin_stats['commission_paid'],
            'commission_pending': super_admin_stats['commission_pending'],
            'commission_percentage': 1
        },
        'super_admin_data': super_admin_stats
    }
