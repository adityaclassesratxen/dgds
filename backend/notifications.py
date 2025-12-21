"""
Booking notification templates for Email and WhatsApp
"""
from datetime import datetime
from typing import Dict, Any
import random
import string


def generate_friendly_booking_id() -> str:
    """Generate a friendly booking ID like BK-1612254066655"""
    timestamp = int(datetime.now().timestamp() * 1000)
    return f"BK-{timestamp}"


def format_email_booking_notification(booking_data: Dict[str, Any]) -> str:
    """
    Generate email booking notification with detailed policies
    """
    template = f"""Hello,

Here are your RideFlow booking details:

═══════════════════════════════════════
          BOOKING DETAILS
═══════════════════════════════════════

Booking Code: {booking_data.get('friendly_booking_id', 'N/A')}
System ID: {booking_data.get('transaction_number', 'N/A')}
Status: {booking_data.get('status', 'PENDING').upper()}

Pickup Location: {booking_data.get('pickup_location', 'N/A')}
Drop-off Location: {booking_data.get('destination_location', 'N/A')}

Passenger: {booking_data.get('customer_name', 'N/A')}
Number of Passengers: {booking_data.get('passenger_count', 1)}
Phone: {booking_data.get('customer_phone', 'N/A')}

Vehicle Type: {booking_data.get('vehicle_type', 'N/A')}
Scheduled Time: {booking_data.get('pickup_time', 'N/A')}

Estimated Fare: ₹{booking_data.get('min_fare', 0):.2f} - ₹{booking_data.get('max_fare', 0):.2f}
Estimated Distance: {booking_data.get('distance_km', 0)} km
Estimated Duration: {booking_data.get('duration_minutes', 0)} min

═══════════════════════════════════════
          KEY POLICIES
═══════════════════════════════════════

CUSTOMER RESPONSIBILITIES:
• Confirm pickup location before ride begins
• Free cancellation within 5 minutes of booking
• Payment due upon ride completion
• Wear seatbelts and treat vehicle with respect

DRIVER RESPONSIBILITIES:
• Arrive at pickup within estimated time
• Maintain clean and well-maintained vehicle
• Follow optimal route unless requested otherwise
• Ensure passenger safety at all times

EMERGENCY INFORMATION:
• Emergency Helpline: +91-1800-XXX-XXXX (24/7)
• All rides covered by insurance up to ₹10,00,000
• In case of accident: Ensure safety, call 112, report via app

PRICING STRUCTURE:
• Base Fare + Per KM Rate + Per Minute Rate
• Waiting charges: ₹2/min after 5 min at pickup
• Night surcharge: 1.25x (11 PM - 5 AM)
• Tolls charged as per actual route

═══════════════════════════════════════

Track your booking: {booking_data.get('tracking_url', 'N/A')}

For full terms and conditions, visit the ride details page.

Thank you for choosing RideFlow!
Safe travels!

RideFlow Team
Support: support@rideflow.com
"""
    return template


def format_whatsapp_booking_notification(booking_data: Dict[str, Any]) -> str:
    """
    Generate WhatsApp booking notification with emojis and compact format
    """
    template = f"""🚗 *RideFlow Booking Details*

📋 *Booking Code:* {booking_data.get('friendly_booking_id', 'N/A')}
🔢 *System ID:* {booking_data.get('transaction_number', 'N/A')}
📊 *Status:* {booking_data.get('status', 'PENDING').upper()}

📍 *Pickup:* {booking_data.get('pickup_location', 'N/A')}
🎯 *Drop-off:* {booking_data.get('destination_location', 'N/A')}

👤 *Passenger:* {booking_data.get('customer_name', 'N/A')}
👥 *Passengers:* {booking_data.get('passenger_count', 1)}
📞 *Phone:* {booking_data.get('customer_phone', 'N/A')}

🚙 *Vehicle:* {booking_data.get('vehicle_type', 'N/A')}
🕐 *Scheduled:* {booking_data.get('pickup_time', 'N/A')}

💰 *Estimated Fare:* ₹{booking_data.get('min_fare', 0):.2f} - ₹{booking_data.get('max_fare', 0):.2f}
📏 *Distance:* {booking_data.get('distance_km', 0)} km
⏱️ *Duration:* {booking_data.get('duration_minutes', 0)} min

━━━━━━━━━━━━━━━━━━━━━
📌 *Key Policies:*
✓ Free cancellation within 5 mins
✓ Waiting charges after 5 min at pickup
✓ All rides are insured
━━━━━━━━━━━━━━━━━━━━━

🆘 *Emergency:* +91-1800-XXX-XXXX

🔗 *Track your booking:*
{booking_data.get('tracking_url', 'N/A')}

_Thank you for choosing RideFlow!_
_Safe travels!_ 🛡️
"""
    return template


def format_booking_confirmation_sms(booking_data: Dict[str, Any]) -> str:
    """
    Generate SMS booking confirmation (160 characters limit friendly)
    """
    template = f"""RideFlow Booking {booking_data.get('friendly_booking_id', 'N/A')}
From: {booking_data.get('pickup_location', 'N/A')[:30]}
To: {booking_data.get('destination_location', 'N/A')[:30]}
Time: {booking_data.get('pickup_time', 'N/A')}
Fare: ₹{booking_data.get('min_fare', 0):.0f}-{booking_data.get('max_fare', 0):.0f}
Track: {booking_data.get('tracking_url', 'N/A')}
"""
    return template


def format_driver_assignment_notification(booking_data: Dict[str, Any], driver_data: Dict[str, Any]) -> str:
    """
    Generate driver assignment notification for customer
    """
    email_template = f"""Hello {booking_data.get('customer_name', 'Customer')},

Great news! A driver has been assigned to your booking.

═══════════════════════════════════════
          DRIVER DETAILS
═══════════════════════════════════════

Driver Name: {driver_data.get('name', 'N/A')}
Phone: {driver_data.get('phone', 'N/A')}
Vehicle: {driver_data.get('vehicle_type', 'N/A')}
Vehicle Number: {driver_data.get('vehicle_number', 'N/A')}
Rating: {'⭐' * int(driver_data.get('rating', 0))} ({driver_data.get('rating', 0)}/5)

Booking Code: {booking_data.get('friendly_booking_id', 'N/A')}
Pickup Time: {booking_data.get('pickup_time', 'N/A')}
Pickup Location: {booking_data.get('pickup_location', 'N/A')}

═══════════════════════════════════════

Your driver is on the way!

Track your ride: {booking_data.get('tracking_url', 'N/A')}

RideFlow Team
"""
    
    whatsapp_template = f"""🚗 *Driver Assigned!*

👨‍✈️ *Driver:* {driver_data.get('name', 'N/A')}
📞 *Phone:* {driver_data.get('phone', 'N/A')}
🚙 *Vehicle:* {driver_data.get('vehicle_type', 'N/A')} ({driver_data.get('vehicle_number', 'N/A')})
⭐ *Rating:* {driver_data.get('rating', 0)}/5

📋 *Booking:* {booking_data.get('friendly_booking_id', 'N/A')}
🕐 *Pickup:* {booking_data.get('pickup_time', 'N/A')}
📍 *Location:* {booking_data.get('pickup_location', 'N/A')}

🔗 *Track:* {booking_data.get('tracking_url', 'N/A')}

_Your driver is on the way!_ 🚗💨
"""
    
    return {
        'email': email_template,
        'whatsapp': whatsapp_template
    }


def format_trip_completion_notification(booking_data: Dict[str, Any], trip_summary: Dict[str, Any]) -> str:
    """
    Generate trip completion notification with invoice
    """
    email_template = f"""Hello {booking_data.get('customer_name', 'Customer')},

Thank you for riding with RideFlow!

═══════════════════════════════════════
          TRIP SUMMARY
═══════════════════════════════════════

Booking Code: {booking_data.get('friendly_booking_id', 'N/A')}
Trip Date: {trip_summary.get('completion_time', 'N/A')}

From: {booking_data.get('pickup_location', 'N/A')}
To: {booking_data.get('destination_location', 'N/A')}

Driver: {trip_summary.get('driver_name', 'N/A')}
Vehicle: {trip_summary.get('vehicle_type', 'N/A')} ({trip_summary.get('vehicle_number', 'N/A')})

═══════════════════════════════════════
          FARE BREAKDOWN
═══════════════════════════════════════

Base Fare:              ₹{trip_summary.get('base_fare', 0):.2f}
Distance ({trip_summary.get('distance_km', 0)} km):    ₹{trip_summary.get('distance_charge', 0):.2f}
Time ({trip_summary.get('duration_minutes', 0)} min):      ₹{trip_summary.get('time_charge', 0):.2f}
Waiting Charges:        ₹{trip_summary.get('waiting_charge', 0):.2f}
Night Surcharge:        ₹{trip_summary.get('night_surcharge', 0):.2f}
Tolls:                  ₹{trip_summary.get('tolls', 0):.2f}

─────────────────────────────────────
TOTAL FARE:             ₹{trip_summary.get('total_amount', 0):.2f}
═══════════════════════════════════════

Payment Status: {trip_summary.get('payment_status', 'PENDING')}
Payment Method: {trip_summary.get('payment_method', 'N/A')}

═══════════════════════════════════════

Rate your experience: {booking_data.get('rating_url', 'N/A')}

Thank you for choosing RideFlow!

RideFlow Team
Support: support@rideflow.com
"""
    
    whatsapp_template = f"""✅ *Trip Completed!*

📋 *Booking:* {booking_data.get('friendly_booking_id', 'N/A')}
🕐 *Completed:* {trip_summary.get('completion_time', 'N/A')}

📍 *From:* {booking_data.get('pickup_location', 'N/A')[:40]}
🎯 *To:* {booking_data.get('destination_location', 'N/A')[:40]}

━━━━━━━━━━━━━━━━━━━━━
💰 *Fare Breakdown:*
Base: ₹{trip_summary.get('base_fare', 0):.2f}
Distance ({trip_summary.get('distance_km', 0)} km): ₹{trip_summary.get('distance_charge', 0):.2f}
Time ({trip_summary.get('duration_minutes', 0)} min): ₹{trip_summary.get('time_charge', 0):.2f}

*TOTAL: ₹{trip_summary.get('total_amount', 0):.2f}*
━━━━━━━━━━━━━━━━━━━━━

💳 *Payment:* {trip_summary.get('payment_status', 'PENDING')}

⭐ *Rate your ride:* {booking_data.get('rating_url', 'N/A')}

_Thank you for choosing RideFlow!_ 🙏
"""
    
    return {
        'email': email_template,
        'whatsapp': whatsapp_template
    }


def format_cancellation_notification(booking_data: Dict[str, Any], cancellation_reason: str, cancelled_by: str) -> str:
    """
    Generate cancellation notification
    """
    email_template = f"""Hello {booking_data.get('customer_name', 'Customer')},

Your RideFlow booking has been cancelled.

═══════════════════════════════════════
          CANCELLATION DETAILS
═══════════════════════════════════════

Booking Code: {booking_data.get('friendly_booking_id', 'N/A')}
Cancelled By: {cancelled_by}
Reason: {cancellation_reason}

Original Booking:
From: {booking_data.get('pickup_location', 'N/A')}
To: {booking_data.get('destination_location', 'N/A')}
Scheduled Time: {booking_data.get('pickup_time', 'N/A')}

Cancellation Charges: ₹{booking_data.get('cancellation_fee', 0):.2f}

═══════════════════════════════════════

We're sorry for the inconvenience. 
Book your next ride with us!

RideFlow Team
Support: support@rideflow.com
"""
    
    whatsapp_template = f"""❌ *Booking Cancelled*

📋 *Booking:* {booking_data.get('friendly_booking_id', 'N/A')}
👤 *Cancelled By:* {cancelled_by}
📝 *Reason:* {cancellation_reason}

💰 *Cancellation Fee:* ₹{booking_data.get('cancellation_fee', 0):.2f}

_We're sorry for the inconvenience._
_Book your next ride with us!_ 🚗
"""
    
    return {
        'email': email_template,
        'whatsapp': whatsapp_template
    }
