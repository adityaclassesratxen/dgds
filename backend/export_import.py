"""
Export/Import utilities for CSV and Excel data migration
"""
import csv
import io
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from models import (
    Customer,
    Driver,
    Dispatcher,
    CustomerVehicle,
    RideTransaction,
    User
)


def export_customers_to_csv(db: Session, tenant_id: int = None) -> str:
    """Export customers to CSV format"""
    query = db.query(Customer)
    if tenant_id:
        query = query.filter(Customer.tenant_id == tenant_id)
    
    customers = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'State', 
        'Postal Code', 'Country', 'Created At', 'Tenant ID'
    ])
    
    # Data
    for customer in customers:
        writer.writerow([
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            customer.address,
            customer.city,
            customer.state,
            customer.postal_code,
            customer.country,
            customer.created_at.isoformat() if customer.created_at else '',
            customer.tenant_id
        ])
    
    return output.getvalue()


def export_drivers_to_csv(db: Session, tenant_id: int = None) -> str:
    """Export drivers to CSV format"""
    query = db.query(Driver)
    if tenant_id:
        query = query.filter(Driver.tenant_id == tenant_id)
    
    drivers = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Name', 'Email', 'Phone', 'License Number', 'Vehicle Type',
        'Vehicle Number', 'Status', 'Rating', 'Total Rides', 'Created At', 'Tenant ID'
    ])
    
    # Data
    for driver in drivers:
        writer.writerow([
            driver.id,
            driver.name,
            driver.email,
            driver.phone,
            driver.license_number,
            driver.vehicle_type,
            driver.vehicle_number,
            driver.status,
            driver.rating,
            driver.total_rides,
            driver.created_at.isoformat() if driver.created_at else '',
            driver.tenant_id
        ])
    
    return output.getvalue()


def export_vehicles_to_csv(db: Session, tenant_id: int = None) -> str:
    """Export vehicles to CSV format"""
    query = db.query(CustomerVehicle)
    if tenant_id:
        query = query.filter(CustomerVehicle.tenant_id == tenant_id)
    
    vehicles = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Customer ID', 'Make', 'Model', 'Year', 'Color',
        'License Plate', 'VIN', 'Created At', 'Tenant ID'
    ])
    
    # Data
    for vehicle in vehicles:
        writer.writerow([
            vehicle.id,
            vehicle.customer_id,
            vehicle.make,
            vehicle.model,
            vehicle.year,
            vehicle.color,
            vehicle.license_plate,
            vehicle.vin,
            vehicle.created_at.isoformat() if vehicle.created_at else '',
            vehicle.tenant_id
        ])
    
    return output.getvalue()


def export_dispatchers_to_csv(db: Session, tenant_id: int = None) -> str:
    """Export dispatchers to CSV format"""
    query = db.query(Dispatcher)
    if tenant_id:
        query = query.filter(Dispatcher.tenant_id == tenant_id)
    
    dispatchers = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'User ID', 'Name', 'Phone', 'Email', 'Status',
        'Total Bookings', 'Created At', 'Tenant ID'
    ])
    
    # Data
    for dispatcher in dispatchers:
        writer.writerow([
            dispatcher.id,
            dispatcher.user_id,
            dispatcher.name,
            dispatcher.phone,
            dispatcher.email,
            dispatcher.status,
            dispatcher.total_bookings,
            dispatcher.created_at.isoformat() if dispatcher.created_at else '',
            dispatcher.tenant_id
        ])
    
    return output.getvalue()


def export_trips_to_csv(db: Session, tenant_id: int = None) -> str:
    """Export trips/transactions to CSV format"""
    query = db.query(RideTransaction)
    if tenant_id:
        query = query.filter(RideTransaction.tenant_id == tenant_id)
    
    trips = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Transaction Number', 'Friendly Booking ID', 'Customer ID', 'Customer Name',
        'Driver ID', 'Driver Name', 'Dispatcher ID', 'Vehicle Type',
        'Pickup Location', 'Destination Location', 'Pickup Time', 'Drop Time',
        'Status', 'Distance KM', 'Duration Minutes', 'Base Fare', 'Per KM Rate',
        'Per Minute Rate', 'Total Amount', 'Is Paid', 'Payment Method',
        'Created At', 'Tenant ID'
    ])
    
    # Data
    for trip in trips:
        writer.writerow([
            trip.id,
            trip.transaction_number,
            trip.friendly_booking_id if hasattr(trip, 'friendly_booking_id') else '',
            trip.customer_id,
            trip.customer_name,
            trip.driver_id,
            trip.driver_name,
            trip.dispatcher_id,
            trip.vehicle_type,
            trip.pickup_location,
            trip.destination_location,
            trip.pickup_time.isoformat() if trip.pickup_time else '',
            trip.drop_time.isoformat() if trip.drop_time else '',
            trip.status,
            trip.distance_km,
            trip.duration_minutes,
            trip.base_fare,
            trip.per_km_rate,
            trip.per_minute_rate,
            trip.total_amount,
            trip.is_paid,
            trip.payment_method,
            trip.created_at.isoformat() if trip.created_at else '',
            trip.tenant_id
        ])
    
    return output.getvalue()


def import_customers_from_csv(db: Session, csv_content: str, tenant_id: int) -> Dict[str, Any]:
    """Import customers from CSV format"""
    reader = csv.DictReader(io.StringIO(csv_content))
    imported = 0
    errors = []
    
    for row in reader:
        try:
            customer = Customer(
                name=row['Name'],
                email=row.get('Email'),
                phone=row['Phone'],
                address=row.get('Address'),
                city=row.get('City'),
                state=row.get('State'),
                postal_code=row.get('Postal Code'),
                country=row.get('Country', 'India'),
                tenant_id=tenant_id
            )
            db.add(customer)
            imported += 1
        except Exception as e:
            errors.append(f"Row {imported + 1}: {str(e)}")
    
    try:
        db.commit()
        return {'success': True, 'imported': imported, 'errors': errors}
    except Exception as e:
        db.rollback()
        return {'success': False, 'imported': 0, 'errors': [str(e)]}


def import_drivers_from_csv(db: Session, csv_content: str, tenant_id: int) -> Dict[str, Any]:
    """Import drivers from CSV format"""
    reader = csv.DictReader(io.StringIO(csv_content))
    imported = 0
    errors = []
    
    for row in reader:
        try:
            driver = Driver(
                name=row['Name'],
                email=row.get('Email'),
                phone=row['Phone'],
                license_number=row.get('License Number'),
                vehicle_type=row.get('Vehicle Type'),
                vehicle_number=row.get('Vehicle Number'),
                status=row.get('Status', 'AVAILABLE'),
                tenant_id=tenant_id
            )
            db.add(driver)
            imported += 1
        except Exception as e:
            errors.append(f"Row {imported + 1}: {str(e)}")
    
    try:
        db.commit()
        return {'success': True, 'imported': imported, 'errors': errors}
    except Exception as e:
        db.rollback()
        return {'success': False, 'imported': 0, 'errors': [str(e)]}


def import_vehicles_from_csv(db: Session, csv_content: str, tenant_id: int) -> Dict[str, Any]:
    """Import vehicles from CSV format"""
    reader = csv.DictReader(io.StringIO(csv_content))
    imported = 0
    errors = []
    
    for row in reader:
        try:
            vehicle = CustomerVehicle(
                customer_id=int(row['Customer ID']),
                make=row['Make'],
                model=row['Model'],
                year=int(row.get('Year', 2020)),
                color=row.get('Color'),
                license_plate=row['License Plate'],
                vin=row.get('VIN'),
                tenant_id=tenant_id
            )
            db.add(vehicle)
            imported += 1
        except Exception as e:
            errors.append(f"Row {imported + 1}: {str(e)}")
    
    try:
        db.commit()
        return {'success': True, 'imported': imported, 'errors': errors}
    except Exception as e:
        db.rollback()
        return {'success': False, 'imported': 0, 'errors': [str(e)]}
