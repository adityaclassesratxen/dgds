"""
Comprehensive reporting and analytics module
Supports filtering by customer, driver, dispatcher, vehicle, trip, and date ranges
"""

from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
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
from pydantic import BaseModel


# Commission rates configuration
COMMISSION_RATES = {
    'SUPER_ADMIN': 0.01,  # 1%
    'ADMIN': 0.02,        # 2%
    'DISPATCHER': 0.18,   # 18%
    'DRIVER': 0.79,       # 79%
}


class DateRangeFilter(BaseModel):
    """Date range filter options"""
    range_type: str  # '1day', '3days', '7days', '14days', '1month', '3months', '6months', '1year', '2years', etc.
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ReportFilters(BaseModel):
    """Comprehensive report filters"""
    date_range: DateRangeFilter
    customer_id: Optional[int] = None
    driver_id: Optional[int] = None
    dispatcher_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    tenant_id: Optional[int] = None


def get_date_range(range_type: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    """Calculate date range based on range type"""
    now = datetime.utcnow()
    
    if range_type == 'custom' and start_date and end_date:
        return start_date, end_date
    
    range_map = {
        '1day': timedelta(days=1),
        '3days': timedelta(days=3),
        '7days': timedelta(days=7),
        '14days': timedelta(days=14),
        '1month': timedelta(days=30),
        '3months': timedelta(days=90),
        '6months': timedelta(days=180),
        '1year': timedelta(days=365),
        '2years': timedelta(days=730),
        '3years': timedelta(days=1095),
        '4years': timedelta(days=1460),
        '5years': timedelta(days=1825),
        '7years': timedelta(days=2555),
        '8years': timedelta(days=2920),
    }
    
    delta = range_map.get(range_type, timedelta(days=30))
    return now - delta, now


def generate_analytics_report(db: Session, filters: ReportFilters):
    """Generate comprehensive analytics report"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Base query with date filter
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    # Apply tenant filter
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    # Apply additional filters
    if filters.customer_id:
        query = query.filter(RideTransaction.customer_id == filters.customer_id)
    if filters.driver_id:
        query = query.filter(RideTransaction.driver_id == filters.driver_id)
    if filters.dispatcher_id:
        query = query.filter(RideTransaction.dispatcher_id == filters.dispatcher_id)
    if filters.vehicle_id:
        query = query.filter(RideTransaction.vehicle_id == filters.vehicle_id)
    
    trips = query.all()
    
    # Calculate metrics
    total_trips = len(trips)
    completed_trips = len([t for t in trips if t.status == 'COMPLETED'])
    cancelled_trips = len([t for t in trips if t.status == 'CANCELLED'])
    
    total_revenue = sum(float(t.total_amount or 0) for t in trips if t.status == 'COMPLETED')
    paid_amount = sum(float(t.total_amount or 0) for t in trips if t.is_paid)
    unpaid_amount = sum(float(t.total_amount or 0) for t in trips if t.status == 'COMPLETED' and not t.is_paid)
    
    # Get unique customers and drivers
    unique_customers = len(set(t.customer_id for t in trips if t.customer_id))
    unique_drivers = len(set(t.driver_id for t in trips if t.driver_id))
    
    # Average metrics
    avg_trip_amount = total_revenue / completed_trips if completed_trips > 0 else 0
    avg_trip_duration = sum(float(t.ride_duration_hours or 0) for t in trips if t.ride_duration_hours) / total_trips if total_trips > 0 else 0
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_trips': total_trips,
            'completed_trips': completed_trips,
            'cancelled_trips': cancelled_trips,
            'active_customers': unique_customers,
            'active_drivers': unique_drivers,
        },
        'revenue': {
            'total_revenue': round(total_revenue, 2),
            'paid_amount': round(paid_amount, 2),
            'unpaid_amount': round(unpaid_amount, 2),
            'payment_pending': round(total_revenue - paid_amount, 2),
        },
        'averages': {
            'avg_trip_amount': round(avg_trip_amount, 2),
            'avg_trip_duration_hours': round(avg_trip_duration, 2),
        },
        'trips': [
            {
                'id': t.id,
                'transaction_number': t.transaction_number,
                'customer_id': t.customer_id,
                'driver_id': t.driver_id,
                'amount': float(t.total_amount or 0),
                'status': t.status.value if hasattr(t.status, 'value') else str(t.status),
                'is_paid': t.is_paid,
                'created_at': t.created_at.isoformat() if t.created_at else None,
            }
            for t in trips
        ]
    }


def generate_customer_report(db: Session, filters: ReportFilters):
    """Generate report grouped by customer with comprehensive payment and ride info"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Query trips grouped by customer with detailed stats
    query = db.query(
        RideTransaction.customer_id,
        RideTransaction.customer_name,
        func.count(RideTransaction.id).label('total_rides'),
        func.sum(func.case((RideTransaction.status == 'COMPLETED', 1), else_=0)).label('completed_rides'),
        func.sum(func.case((RideTransaction.status == 'REQUESTED', 1), else_=0)).label('active_rides'),
        func.sum(func.case((RideTransaction.status == 'CANCELLED', 1), else_=0)).label('cancelled_rides'),
        func.sum(func.case((RideTransaction.status.in_(['REQUESTED', 'ACCEPTED', 'ENROUTE']), 1), else_=0)).label('pending_rides'),
        func.sum(RideTransaction.total_amount).label('total_spent'),
        func.sum(func.case((RideTransaction.is_paid == True, RideTransaction.total_amount), else_=0)).label('paid_amount'),
    ).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    query = query.group_by(RideTransaction.customer_id, RideTransaction.customer_name)
    
    results = query.all()
    
    customers_data = []
    for r in results:
        # Get last 3 rides for this customer
        last_rides_query = db.query(RideTransaction).filter(
            RideTransaction.customer_id == r.customer_id,
            RideTransaction.created_at.between(start_date, end_date)
        ).order_by(RideTransaction.created_at.desc()).limit(3).all()
        
        last_rides = [
            {
                'id': ride.id,
                'transaction_number': ride.transaction_number,
                'status': ride.status,
                'amount': float(ride.total_amount or 0),
                'is_paid': ride.is_paid,
                'created_at': ride.created_at.isoformat() if ride.created_at else None,
                'pickup_location': ride.pickup_location,
                'destination_location': ride.destination_location,
                'driver_name': ride.driver_name,
            }
            for ride in last_rides_query
        ]
        
        customers_data.append({
            'customer_id': r.customer_id,
            'customer_name': r.customer_name,
            'total_rides': r.total_rides,
            'completed_rides': r.completed_rides,
            'active_rides': r.active_rides,
            'cancelled_rides': r.cancelled_rides,
            'pending_rides': r.pending_rides,
            'total_spent': float(r.total_spent or 0),
            'paid_amount': float(r.paid_amount or 0),
            'unpaid_amount': float((r.total_spent or 0) - (r.paid_amount or 0)),
            'dues': float((r.total_spent or 0) - (r.paid_amount or 0)),
            'last_three_rides': last_rides,
        })
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'customers': customers_data
    }


def generate_driver_report(db: Session, filters: ReportFilters):
    """Generate comprehensive driver report with detailed transaction and commission breakdown"""
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
    
    # Group by driver with detailed breakdown
    driver_stats = {}
    
    for transaction in transactions:
        driver_id = transaction.driver_id
        if driver_id not in driver_stats:
            driver = db.query(Driver).filter(Driver.id == driver_id).first()
            driver_stats[driver_id] = {
                'driver_id': driver_id,
                'driver_name': driver.name if driver else transaction.driver_name,
                'driver_email': driver.email if driver else 'N/A',
                'driver_phone': driver.phone if driver else 'N/A',
                'driver_rating': float(driver.rating) if driver and driver.rating else 0,
                'total_bookings': 0,
                'completed_bookings': 0,
                'pending_bookings': 0,
                'cancelled_bookings': 0,
                'total_transactions': 0,
                'total_revenue': 0,
                'total_paid': 0,
                'total_pending': 0,
                'commission_breakdown': {
                    'driver_earnings': 0,           # 79%
                    'dispatcher_commission': 0,      # 18%
                    'admin_commission': 0,           # 2%
                    'super_admin_commission': 0      # 1%
                },
                'payment_status': {
                    'paid_amount': 0,
                    'pending_amount': 0,
                    'paid_count': 0,
                    'pending_count': 0
                },
                'transactions': []
            }
        
        # Count bookings by status
        driver_stats[driver_id]['total_bookings'] += 1
        driver_stats[driver_id]['total_transactions'] += 1
        
        if transaction.status.value == 'COMPLETED':
            driver_stats[driver_id]['completed_bookings'] += 1
        elif transaction.status.value == 'CANCELLED':
            driver_stats[driver_id]['cancelled_bookings'] += 1
        else:
            driver_stats[driver_id]['pending_bookings'] += 1
        
        # Revenue tracking
        driver_stats[driver_id]['total_revenue'] += float(transaction.total_amount)
        
        # Payment tracking
        if transaction.is_paid:
            driver_stats[driver_id]['total_paid'] += float(transaction.paid_amount or 0)
            driver_stats[driver_id]['payment_status']['paid_amount'] += float(transaction.paid_amount or 0)
            driver_stats[driver_id]['payment_status']['paid_count'] += 1
        else:
            pending_amount = float(transaction.total_amount) - float(transaction.paid_amount or 0)
            driver_stats[driver_id]['total_pending'] += pending_amount
            driver_stats[driver_id]['payment_status']['pending_amount'] += pending_amount
            driver_stats[driver_id]['payment_status']['pending_count'] += 1
        
        # Commission breakdown
        driver_stats[driver_id]['commission_breakdown']['driver_earnings'] += float(transaction.driver_share)
        driver_stats[driver_id]['commission_breakdown']['dispatcher_commission'] += float(transaction.dispatcher_share)
        driver_stats[driver_id]['commission_breakdown']['admin_commission'] += float(transaction.admin_share)
        driver_stats[driver_id]['commission_breakdown']['super_admin_commission'] += float(transaction.super_admin_share)
        
        # Get customer and dispatcher details
        customer = db.query(Customer).filter(Customer.id == transaction.customer_id).first()
        dispatcher = db.query(Dispatcher).filter(Dispatcher.id == transaction.dispatcher_id).first()
        
        # Detailed transaction record
        driver_stats[driver_id]['transactions'].append({
            'transaction_id': transaction.id,
            'transaction_number': transaction.transaction_number,
            'friendly_booking_id': transaction.friendly_booking_id,
            'date': transaction.created_at.isoformat(),
            'customer_id': transaction.customer_id,
            'customer_name': customer.name if customer else 'N/A',
            'customer_phone': customer.phone if customer else 'N/A',
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
            'commission_split': {
                'driver_share': float(transaction.driver_share),
                'driver_percentage': 79,
                'dispatcher_share': float(transaction.dispatcher_share),
                'dispatcher_percentage': 18,
                'admin_share': float(transaction.admin_share),
                'admin_percentage': 2,
                'super_admin_share': float(transaction.super_admin_share),
                'super_admin_percentage': 1
            }
        })
    
    return {
        'report_type': 'by_driver',
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'range_type': filters.date_range.range_type
        },
        'summary': {
            'total_drivers': len(driver_stats),
            'total_bookings': sum(d['total_bookings'] for d in driver_stats.values()),
            'total_revenue': sum(d['total_revenue'] for d in driver_stats.values()),
            'total_driver_earnings': sum(d['commission_breakdown']['driver_earnings'] for d in driver_stats.values()),
            'total_paid': sum(d['total_paid'] for d in driver_stats.values()),
            'total_pending': sum(d['total_pending'] for d in driver_stats.values())
        },
        'drivers': list(driver_stats.values())
    }


def generate_vehicle_report(db: Session, filters: ReportFilters):
    """Generate report grouped by vehicle"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(
        RideTransaction.vehicle_id,
        CustomerVehicle.registration_number,
        CustomerVehicle.vehicle_type,
        func.count(RideTransaction.id).label('trip_count'),
        func.sum(RideTransaction.total_amount).label('total_revenue'),
    ).join(
        CustomerVehicle, RideTransaction.vehicle_id == CustomerVehicle.id, isouter=True
    ).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    query = query.group_by(
        RideTransaction.vehicle_id,
        CustomerVehicle.registration_number,
        CustomerVehicle.vehicle_type
    )
    
    results = query.all()
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'vehicles': [
            {
                'vehicle_id': r.vehicle_id,
                'registration_number': r.registration_number,
                'vehicle_type': r.vehicle_type,
                'trip_count': r.trip_count,
                'total_revenue': float(r.total_revenue or 0),
            }
            for r in results
        ]
    }


def generate_payment_release_report(db: Session, filters: ReportFilters):
    """Generate payment release tracking report"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Get all completed trips with payment status
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date),
        RideTransaction.status == 'COMPLETED'
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    trips = query.all()
    
    # Categorize by payment status
    paid_trips = [t for t in trips if t.is_paid]
    unpaid_trips = [t for t in trips if not t.is_paid]
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'summary': {
            'total_completed_trips': len(trips),
            'paid_trips_count': len(paid_trips),
            'unpaid_trips_count': len(unpaid_trips),
            'total_amount_due': sum(float(t.total_amount or 0) for t in trips),
            'amount_paid': sum(float(t.total_amount or 0) for t in paid_trips),
            'amount_pending': sum(float(t.total_amount or 0) for t in unpaid_trips),
        },
        'pending_payments': [
            {
                'trip_id': t.id,
                'transaction_number': t.transaction_number,
                'customer_name': t.customer_name,
                'driver_name': t.driver_name,
                'amount': float(t.total_amount or 0),
                'completed_at': t.created_at.isoformat() if t.created_at else None,
                'days_pending': (datetime.utcnow() - t.created_at).days if t.created_at else 0,
            }
            for t in unpaid_trips
        ],
        'paid_trips': [
            {
                'trip_id': t.id,
                'transaction_number': t.transaction_number,
                'customer_name': t.customer_name,
                'driver_name': t.driver_name,
                'amount': float(t.total_amount or 0),
                'paid_at': t.created_at.isoformat() if t.created_at else None,
            }
            for t in paid_trips
        ]
    }


def calculate_commission_breakdown(amount: float):
    """Calculate commission breakdown for all roles"""
    return {
        'total_amount': round(amount, 2),
        'super_admin_commission': round(amount * COMMISSION_RATES['SUPER_ADMIN'], 2),
        'admin_commission': round(amount * COMMISSION_RATES['ADMIN'], 2),
        'dispatcher_commission': round(amount * COMMISSION_RATES['DISPATCHER'], 2),
        'driver_commission': round(amount * COMMISSION_RATES['DRIVER'], 2),
        'commission_rates': {
            'super_admin': f"{COMMISSION_RATES['SUPER_ADMIN'] * 100}%",
            'admin': f"{COMMISSION_RATES['ADMIN'] * 100}%",
            'dispatcher': f"{COMMISSION_RATES['DISPATCHER'] * 100}%",
            'driver': f"{COMMISSION_RATES['DRIVER'] * 100}%",
        }
    }


def generate_transaction_report(db: Session, filters: ReportFilters):
    """Generate comprehensive transaction-based report with commission breakdown"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Get all transactions
    query = db.query(RideTransaction).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    transactions = query.order_by(RideTransaction.created_at.desc()).all()
    
    # Calculate totals
    total_payment = sum(float(t.total_amount or 0) for t in transactions)
    total_paid = sum(float(t.total_amount or 0) for t in transactions if t.is_paid)
    total_dues = sum(float(t.total_amount or 0) for t in transactions if not t.is_paid and t.status == 'COMPLETED')
    
    # Calculate commission breakdown
    commission_breakdown = calculate_commission_breakdown(total_payment)
    paid_commission_breakdown = calculate_commission_breakdown(total_paid)
    
    # Cache for customer and driver names
    customer_cache = {}
    driver_cache = {}
    
    def get_customer_name(customer_id):
        if customer_id not in customer_cache:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            customer_cache[customer_id] = customer.name if customer else 'N/A'
        return customer_cache[customer_id]
    
    def get_driver_name(driver_id):
        if driver_id not in driver_cache:
            driver = db.query(Driver).filter(Driver.id == driver_id).first()
            driver_cache[driver_id] = driver.name if driver else 'N/A'
        return driver_cache[driver_id]
    
    # Group by customer
    customer_totals = {}
    for t in transactions:
        if t.customer_id not in customer_totals:
            customer_totals[t.customer_id] = {
                'customer_id': t.customer_id,
                'customer_name': get_customer_name(t.customer_id),
                'total_amount': 0,
                'paid_amount': 0,
                'dues': 0,
                'transaction_count': 0,
            }
        customer_totals[t.customer_id]['total_amount'] += float(t.total_amount or 0)
        customer_totals[t.customer_id]['transaction_count'] += 1
        if t.is_paid:
            customer_totals[t.customer_id]['paid_amount'] += float(t.total_amount or 0)
        elif t.status == 'COMPLETED':
            customer_totals[t.customer_id]['dues'] += float(t.total_amount or 0)
    
    # Group by driver
    driver_totals = {}
    for t in transactions:
        if t.driver_id and t.driver_id not in driver_totals:
            driver_totals[t.driver_id] = {
                'driver_id': t.driver_id,
                'driver_name': get_driver_name(t.driver_id),
                'total_amount': 0,
                'paid_amount': 0,
                'dues': 0,
                'transaction_count': 0,
                'driver_commission': 0,
            }
        if t.driver_id:
            driver_totals[t.driver_id]['total_amount'] += float(t.total_amount or 0)
            driver_totals[t.driver_id]['transaction_count'] += 1
            driver_totals[t.driver_id]['driver_commission'] += float(t.total_amount or 0) * COMMISSION_RATES['DRIVER']
            if t.is_paid:
                driver_totals[t.driver_id]['paid_amount'] += float(t.total_amount or 0)
            elif t.status == 'COMPLETED':
                driver_totals[t.driver_id]['dues'] += float(t.total_amount or 0)
    
    # Group by dispatcher
    dispatcher_totals = {}
    for t in transactions:
        if t.dispatcher_id and t.dispatcher_id not in dispatcher_totals:
            dispatcher_totals[t.dispatcher_id] = {
                'dispatcher_id': t.dispatcher_id,
                'total_amount': 0,
                'paid_amount': 0,
                'dues': 0,
                'transaction_count': 0,
                'dispatcher_commission': 0,
            }
        if t.dispatcher_id:
            dispatcher_totals[t.dispatcher_id]['total_amount'] += float(t.total_amount or 0)
            dispatcher_totals[t.dispatcher_id]['transaction_count'] += 1
            dispatcher_totals[t.dispatcher_id]['dispatcher_commission'] += float(t.total_amount or 0) * COMMISSION_RATES['DISPATCHER']
            if t.is_paid:
                dispatcher_totals[t.dispatcher_id]['paid_amount'] += float(t.total_amount or 0)
            elif t.status == 'COMPLETED':
                dispatcher_totals[t.dispatcher_id]['dues'] += float(t.total_amount or 0)
    
    # Build transaction details
    transaction_details = []
    for t in transactions:
        amount = float(t.total_amount or 0)
        trans_commission = calculate_commission_breakdown(amount)
        
        transaction_details.append({
            'id': t.id,
            'transaction_number': t.transaction_number,
            'customer_id': t.customer_id,
            'customer_name': get_customer_name(t.customer_id),
            'driver_id': t.driver_id,
            'driver_name': get_driver_name(t.driver_id) if t.driver_id else 'N/A',
            'dispatcher_id': t.dispatcher_id,
            'status': t.status.value if hasattr(t.status, 'value') else str(t.status),
            'is_paid': t.is_paid,
            'total_amount': amount,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'pickup_location': t.pickup_location,
            'destination_location': t.destination_location,
            'commission_breakdown': trans_commission,
        })
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'summary': {
            'total_transactions': len(transactions),
            'total_payment': round(total_payment, 2),
            'total_paid': round(total_paid, 2),
            'total_dues': round(total_dues, 2),
            'commission_breakdown': commission_breakdown,
            'paid_commission_breakdown': paid_commission_breakdown,
        },
        'by_customer': list(customer_totals.values()),
        'by_driver': [
            {
                **driver,
                'driver_commission': round(driver['driver_commission'], 2),
                'driver_commission_percentage': f"{COMMISSION_RATES['DRIVER'] * 100}%"
            }
            for driver in driver_totals.values()
        ],
        'by_dispatcher': [
            {
                **dispatcher,
                'dispatcher_commission': round(dispatcher['dispatcher_commission'], 2),
                'dispatcher_commission_percentage': f"{COMMISSION_RATES['DISPATCHER'] * 100}%"
            }
            for dispatcher in dispatcher_totals.values()
        ],
        'by_admin': {
            'total_amount': round(total_payment, 2),
            'admin_commission': round(total_payment * COMMISSION_RATES['ADMIN'], 2),
            'admin_commission_percentage': f"{COMMISSION_RATES['ADMIN'] * 100}%",
        },
        'by_super_admin': {
            'total_amount': round(total_payment, 2),
            'super_admin_commission': round(total_payment * COMMISSION_RATES['SUPER_ADMIN'], 2),
            'super_admin_commission_percentage': f"{COMMISSION_RATES['SUPER_ADMIN'] * 100}%",
        },
        'transactions': transaction_details,
    }


def get_driver_revenue_breakdown(db: Session, driver_id: int, time_filter: str = "all", tenant_filter: Optional[int] = None):
    """
    Get detailed revenue breakdown for a specific driver
    Includes all expenses and commission splits
    """
    # Build date filter
    date_filter = None
    if time_filter == "today":
        date_filter = func.date(RideTransaction.created_at) == datetime.now().date()
    elif time_filter == "week":
        date_filter = RideTransaction.created_at >= datetime.now() - timedelta(days=7)
    elif time_filter == "month":
        date_filter = RideTransaction.created_at >= datetime.now() - timedelta(days=30)
    elif time_filter == "year":
        date_filter = RideTransaction.created_at >= datetime.now() - timedelta(days=365)
    
    # Build query
    query = db.query(RideTransaction).filter(RideTransaction.driver_id == driver_id)
    
    if date_filter:
        query = query.filter(date_filter)
    
    if tenant_filter is not None:
        query = query.filter(RideTransaction.tenant_id == tenant_filter)
    
    transactions = query.all()
    
    if not transactions:
        return {
            "driver_id": driver_id,
            "driver_name": "N/A",
            "total_revenue": 0,
            "breakdown": {
                "total_revenue": 0,
                "driver_share": {"amount": 0, "percentage": "79%"},
                "expenses": {
                    "food_bill": 0,
                    "outstation_bill": 0,
                    "toll_fees": 0,
                    "accommodation_bill": 0,
                    "late_fine": 0,
                    "pickup_location_fare": 0,
                    "accommodation_included": False
                },
                "commissions": {
                    "super_admin": {"amount": 0, "percentage": "1%"},
                    "dispatcher": {"amount": 0, "percentage": "18%"},
                    "admin": {"amount": 0, "percentage": "2%"}
                },
                "net_take_home": 0
            },
            "transaction_count": 0
        }
    
    # Get driver name and registration fee info
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    driver_name = driver.name if driver else "N/A"
    registration_fee_amount = float(driver.registration_fee_amount) if driver else 0
    registration_fee_paid = driver.registration_fee_paid if driver else False
    registration_fee_paid_at = driver.registration_fee_paid_at if driver else None
    registration_fee_deducted = driver.registration_fee_deducted if driver else False
    
    # Calculate totals
    total_revenue = sum(float(t.total_amount or 0) for t in transactions)
    total_driver_share = sum(float(t.driver_share or 0) for t in transactions)
    total_food_bill = sum(float(t.food_bill or 0) for t in transactions)
    total_outstation_bill = sum(float(t.outstation_bill or 0) for t in transactions)
    total_toll_fees = sum(float(t.toll_fees or 0) for t in transactions)
    total_accommodation_bill = sum(float(t.accommodation_bill or 0) for t in transactions)
    total_late_fine = sum(float(t.late_fine or 0) for t in transactions)
    total_pickup_fare = sum(float(t.pickup_location_fare or 0) for t in transactions)
    
    # Calculate commissions
    total_super_admin = sum(float(t.super_admin_share or 0) for t in transactions)
    total_dispatcher = sum(float(t.dispatcher_share or 0) for t in transactions)
    total_admin = sum(float(t.admin_share or 0) for t in transactions)
    
    # Check if any transaction has accommodation included
    accommodation_included = any(t.accommodation_included for t in transactions)
    
    # Calculate net take-home (driver share minus expenses and registration fee if not yet deducted)
    total_expenses = total_food_bill + total_outstation_bill + total_toll_fees + total_accommodation_bill + total_late_fine + total_pickup_fare
    registration_fee_deduction = 0 if registration_fee_deducted else registration_fee_amount
    net_take_home = total_driver_share - total_expenses - registration_fee_deduction
    
    return {
        "driver_id": driver_id,
        "driver_name": driver_name,
        "total_revenue": round(total_revenue, 2),
        "breakdown": {
            "total_revenue": round(total_revenue, 2),
            "driver_share": {
                "amount": round(total_driver_share, 2),
                "percentage": "79%"
            },
            "expenses": {
                "food_bill": round(total_food_bill, 2),
                "outstation_bill": round(total_outstation_bill, 2),
                "toll_fees": round(total_toll_fees, 2),
                "accommodation_bill": round(total_accommodation_bill, 2),
                "late_fine": round(total_late_fine, 2),
                "pickup_location_fare": round(total_pickup_fare, 2),
                "accommodation_included": accommodation_included
            },
            "registration_fee": {
                "amount": round(registration_fee_amount, 2),
                "paid": registration_fee_paid,
                "paid_at": registration_fee_paid_at.isoformat() if registration_fee_paid_at else None,
                "deducted": registration_fee_deducted,
                "deduction": round(registration_fee_deduction, 2)
            },
            "commissions": {
                "super_admin": {
                    "amount": round(total_super_admin, 2),
                    "percentage": "1%"
                },
                "dispatcher": {
                    "amount": round(total_dispatcher, 2),
                    "percentage": "18%"
                },
                "admin": {
                    "amount": round(total_admin, 2),
                    "percentage": "2%"
                }
            },
            "net_take_home": round(net_take_home, 2)
        },
        "transaction_count": len(transactions)
    }
