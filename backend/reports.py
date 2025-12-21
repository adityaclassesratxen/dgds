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
                'customer_name': t.customer_name,
                'driver_name': t.driver_name,
                'amount': float(t.total_amount or 0),
                'status': t.status,
                'is_paid': t.is_paid,
                'created_at': t.created_at.isoformat() if t.created_at else None,
            }
            for t in trips
        ]
    }


def generate_customer_report(db: Session, filters: ReportFilters):
    """Generate report grouped by customer"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    # Query trips grouped by customer
    query = db.query(
        RideTransaction.customer_id,
        RideTransaction.customer_name,
        func.count(RideTransaction.id).label('trip_count'),
        func.sum(RideTransaction.total_amount).label('total_spent'),
        func.sum(func.case((RideTransaction.is_paid == True, RideTransaction.total_amount), else_=0)).label('paid_amount'),
    ).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    query = query.group_by(RideTransaction.customer_id, RideTransaction.customer_name)
    
    results = query.all()
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'customers': [
            {
                'customer_id': r.customer_id,
                'customer_name': r.customer_name,
                'trip_count': r.trip_count,
                'total_spent': float(r.total_spent or 0),
                'paid_amount': float(r.paid_amount or 0),
                'unpaid_amount': float((r.total_spent or 0) - (r.paid_amount or 0)),
            }
            for r in results
        ]
    }


def generate_driver_report(db: Session, filters: ReportFilters):
    """Generate report grouped by driver"""
    start_date, end_date = get_date_range(
        filters.date_range.range_type,
        filters.date_range.start_date,
        filters.date_range.end_date
    )
    
    query = db.query(
        RideTransaction.driver_id,
        RideTransaction.driver_name,
        func.count(RideTransaction.id).label('trip_count'),
        func.sum(RideTransaction.total_amount).label('total_earnings'),
        func.sum(func.case((RideTransaction.status == 'COMPLETED', 1), else_=0)).label('completed_trips'),
    ).filter(
        RideTransaction.created_at.between(start_date, end_date)
    )
    
    if filters.tenant_id:
        query = query.filter(RideTransaction.tenant_id == filters.tenant_id)
    
    query = query.group_by(RideTransaction.driver_id, RideTransaction.driver_name)
    
    results = query.all()
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'drivers': [
            {
                'driver_id': r.driver_id,
                'driver_name': r.driver_name,
                'trip_count': r.trip_count,
                'completed_trips': r.completed_trips,
                'total_earnings': float(r.total_earnings or 0),
                'completion_rate': round((r.completed_trips / r.trip_count * 100) if r.trip_count > 0 else 0, 2),
            }
            for r in results
        ]
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
