import React, { useState } from 'react';
import { X, Share2, Mail, MessageCircle, Copy, Check, Phone } from 'lucide-react';

const BookingShareModal = ({ booking, onClose, driver, customer, vehicle }) => {
  const [copied, setCopied] = useState(false);

  // Generate booking details text
  const generateBookingText = (forWhatsApp = false) => {
    const separator = forWhatsApp ? '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' : '═══════════════════════════════════════';
    const bullet = forWhatsApp ? '•' : '•';
    const warning = forWhatsApp ? '⚠️' : '⚠️';
    const phone = forWhatsApp ? '📞' : '📞';
    const car = forWhatsApp ? '🚗' : '🚗';
    const location = forWhatsApp ? '📍' : '📍';
    const time = forWhatsApp ? '⏰' : '⏰';
    const money = forWhatsApp ? '💰' : '💰';
    
    return `Hello,

Here are your RideFlow booking details:

${separator}
          BOOKING DETAILS
${separator}

${car} Booking Code: ${booking?.transaction_number || booking?.friendly_booking_id || 'N/A'}
Status: ${booking?.status || 'PENDING'}

${location} Pickup Location: ${booking?.pickup_location || 'N/A'}
${location} Drop-off Location: ${booking?.destination_location || 'N/A'}
${booking?.return_location ? `${location} Return Location: ${booking.return_location}` : ''}

👤 Passenger: ${customer?.name || 'N/A'}
${phone} Phone: ${customer?.contact_numbers?.[0]?.phone_number || 'N/A'}

${car} Vehicle: ${vehicle?.vehicle_make || ''} ${vehicle?.vehicle_model || ''} (${vehicle?.registration_number || 'N/A'})
🚘 Driver: ${driver?.name || 'N/A'}

${time} Duration: ${booking?.ride_duration_hours || 0} hours
${money} Total Amount: ₹${booking?.total_amount || 0}

${separator}
          *KEY POLICIES*
${separator}

*CUSTOMER RESPONSIBILITIES:*
${bullet} Confirm pickup location before ride begins
${bullet} Free cancellation within 5 minutes of booking
${bullet} Payment due upon ride completion
${bullet} Wear seatbelts and treat vehicle with respect

*DRIVER RESPONSIBILITIES:*
${bullet} Arrive at pickup within estimated time
${bullet} Maintain clean and well-maintained vehicle
${bullet} Follow optimal route unless requested otherwise
${bullet} Ensure passenger safety at all times

${warning} *EMERGENCY INFORMATION:*
${bullet} Emergency Helpline: +91-1800-XXX-XXXX (24/7)
${bullet} All rides covered by insurance up to ₹10,00,000
${bullet} In case of accident: Ensure safety, call 112, report via app

${money} *PRICING STRUCTURE:*
${bullet} Base Fare + Per KM Rate + Per Minute Rate
${bullet} Waiting charges: ₹2/min after 5 min at pickup
${bullet} Night surcharge: 1.25x (11 PM - 5 AM)
${bullet} Tolls charged as per actual route

${separator}

*FARE BREAKDOWN:*
${bullet} Driver Share (79%): ₹${(parseFloat(booking?.driver_share) || 0).toFixed(2)}
${bullet} Platform Fee (1%): ₹${(parseFloat(booking?.super_admin_share) || 0).toFixed(2)}
${bullet} Dispatcher Fee (18%): ₹${(parseFloat(booking?.dispatcher_share) || 0).toFixed(2)}
${bullet} Admin Fee (2%): ₹${(parseFloat(booking?.admin_share) || 0).toFixed(2)}

${separator}

Thank you for choosing RideFlow!
Safe travels!

RideFlow Team
Support: support@rideflow.com`;
  };

  // Generate HTML content for email
  const generateEmailHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: bold; color: #1e293b; border-bottom: 2px solid #10b981; padding-bottom: 5px; margin-bottom: 10px; }
    .critical { color: #dc2626; font-weight: bold; }
    .important { color: #db2777; font-weight: bold; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .footer { background: #1e293b; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 RideFlow Booking Details</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">BOOKING INFORMATION</div>
        <div class="detail-row">
          <span class="label">Booking Code:</span>
          <span class="value important">${booking?.transaction_number || booking?.friendly_booking_id || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Status:</span>
          <span class="value">${booking?.status || 'PENDING'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Pickup Location:</span>
          <span class="value critical">${booking?.pickup_location || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Drop-off Location:</span>
          <span class="value critical">${booking?.destination_location || 'N/A'}</span>
        </div>
        ${booking?.return_location ? `
        <div class="detail-row">
          <span class="label">Return Location:</span>
          <span class="value">${booking.return_location}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="label">Duration:</span>
          <span class="value">${booking?.ride_duration_hours || 0} hours</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount:</span>
          <span class="value critical">₹${booking?.total_amount || 0}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">PASSENGER & DRIVER DETAILS</div>
        <div class="detail-row">
          <span class="label">Passenger:</span>
          <span class="value">${customer?.name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Phone:</span>
          <span class="value important">${customer?.contact_numbers?.[0]?.phone_number || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Driver:</span>
          <span class="value">${driver?.name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Vehicle:</span>
          <span class="value">${vehicle?.vehicle_make || ''} ${vehicle?.vehicle_model || ''} (${vehicle?.registration_number || 'N/A'})</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">⚠️ KEY POLICIES</div>
        
        <h4 class="important">CUSTOMER RESPONSIBILITIES:</h4>
        <ul>
          <li><span class="critical">Confirm pickup location before ride begins</span></li>
          <li>Free cancellation within 5 minutes of booking</li>
          <li><span class="critical">Payment due upon ride completion</span></li>
          <li>Wear seatbelts and treat vehicle with respect</li>
        </ul>

        <h4 class="important">DRIVER RESPONSIBILITIES:</h4>
        <ul>
          <li><span class="critical">Arrive at pickup within estimated time</span></li>
          <li>Maintain clean and well-maintained vehicle</li>
          <li>Follow optimal route unless requested otherwise</li>
          <li><span class="critical">Ensure passenger safety at all times</span></li>
        </ul>

        <div class="warning">
          <h4 class="critical">🚨 EMERGENCY INFORMATION:</h4>
          <ul>
            <li><span class="critical">Emergency Helpline: +91-1800-XXX-XXXX (24/7)</span></li>
            <li><span class="critical">All rides covered by insurance up to ₹10,00,000</span></li>
            <li><span class="critical">In case of accident: Ensure safety, call 112, report via app</span></li>
          </ul>
        </div>

        <h4 class="important">PRICING STRUCTURE:</h4>
        <ul>
          <li>Base Fare + Per KM Rate + Per Minute Rate</li>
          <li><span class="important">Waiting charges: ₹2/min after 5 min at pickup</span></li>
          <li><span class="important">Night surcharge: 1.25x (11 PM - 5 AM)</span></li>
          <li>Tolls charged as per actual route</li>
        </ul>
      </div>

      <div class="section">
        <div class="section-title">💰 FARE BREAKDOWN</div>
        <div class="detail-row">
          <span class="label">Driver Share (79%):</span>
          <span class="value">₹${(parseFloat(booking?.driver_share) || 0).toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Platform Fee (1%):</span>
          <span class="value">₹${(parseFloat(booking?.super_admin_share) || 0).toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Dispatcher Fee (18%):</span>
          <span class="value">₹${(parseFloat(booking?.dispatcher_share) || 0).toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Admin Fee (2%):</span>
          <span class="value">₹${(parseFloat(booking?.admin_share) || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for choosing RideFlow!</p>
      <p>Safe travels! 🚗</p>
      <p>Support: support@rideflow.com</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateBookingText(true));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Share via Email
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`RideFlow Booking Details - ${booking?.transaction_number || 'Booking'}`);
    const body = encodeURIComponent(generateBookingText(false));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateBookingText(false));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share via SMS
  const shareViaSMS = () => {
    const text = encodeURIComponent(generateBookingText(true));
    window.open(`sms:?body=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Share2 className="h-6 w-6 text-emerald-400" />
              <h3 className="text-xl font-semibold text-white">Share Booking Details</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Share Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={shareViaWhatsApp}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition"
            >
              <MessageCircle className="h-8 w-8 text-green-400" />
              <span className="text-sm text-green-300 font-medium">WhatsApp</span>
            </button>
            <button
              onClick={shareViaEmail}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition"
            >
              <Mail className="h-8 w-8 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">Email</span>
            </button>
            <button
              onClick={shareViaSMS}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition"
            >
              <Phone className="h-8 w-8 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">SMS</span>
            </button>
            <button
              onClick={copyToClipboard}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-500/20 border border-slate-500/30 hover:bg-slate-500/30 transition"
            >
              {copied ? <Check className="h-8 w-8 text-emerald-400" /> : <Copy className="h-8 w-8 text-slate-400" />}
              <span className="text-sm text-slate-300 font-medium">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* Preview Section */}
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-4 text-center">
              <h4 className="text-xl font-bold text-white">🚗 RideFlow Booking Details</h4>
            </div>
            
            <div className="p-6 bg-slate-800/50 space-y-6">
              {/* Booking Information */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-3 border-b border-emerald-500 pb-2">BOOKING INFORMATION</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking Code:</span>
                    <span className="text-pink-400 font-bold">{booking?.transaction_number || booking?.friendly_booking_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-white">{booking?.status || 'PENDING'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pickup Location:</span>
                    <span className="text-red-400 font-bold">{booking?.pickup_location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drop-off Location:</span>
                    <span className="text-red-400 font-bold">{booking?.destination_location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white">{booking?.ride_duration_hours || 0} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Amount:</span>
                    <span className="text-red-400 font-bold">₹{booking?.total_amount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Passenger & Driver Details */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-3 border-b border-emerald-500 pb-2">PASSENGER & DRIVER DETAILS</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Passenger:</span>
                    <span className="text-white">{customer?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-pink-400 font-bold">{customer?.contact_numbers?.[0]?.phone_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="text-white">{driver?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="text-white">{vehicle?.vehicle_make || ''} {vehicle?.vehicle_model || ''} ({vehicle?.registration_number || 'N/A'})</span>
                  </div>
                </div>
              </div>

              {/* Key Policies */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-3 border-b border-emerald-500 pb-2">⚠️ KEY POLICIES</h5>
                
                <div className="space-y-4">
                  <div>
                    <h6 className="text-pink-400 font-bold text-sm mb-2">CUSTOMER RESPONSIBILITIES:</h6>
                    <ul className="text-sm space-y-1 text-slate-300">
                      <li className="text-red-400 font-bold">• Confirm pickup location before ride begins</li>
                      <li>• Free cancellation within 5 minutes of booking</li>
                      <li className="text-red-400 font-bold">• Payment due upon ride completion</li>
                      <li>• Wear seatbelts and treat vehicle with respect</li>
                    </ul>
                  </div>

                  <div>
                    <h6 className="text-pink-400 font-bold text-sm mb-2">DRIVER RESPONSIBILITIES:</h6>
                    <ul className="text-sm space-y-1 text-slate-300">
                      <li className="text-red-400 font-bold">• Arrive at pickup within estimated time</li>
                      <li>• Maintain clean and well-maintained vehicle</li>
                      <li>• Follow optimal route unless requested otherwise</li>
                      <li className="text-red-400 font-bold">• Ensure passenger safety at all times</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <h6 className="text-red-400 font-bold text-sm mb-2">🚨 EMERGENCY INFORMATION:</h6>
                    <ul className="text-sm space-y-1">
                      <li className="text-red-400 font-bold">• Emergency Helpline: +91-1800-XXX-XXXX (24/7)</li>
                      <li className="text-red-400 font-bold">• All rides covered by insurance up to ₹10,00,000</li>
                      <li className="text-red-400 font-bold">• In case of accident: Ensure safety, call 112, report via app</li>
                    </ul>
                  </div>

                  <div>
                    <h6 className="text-pink-400 font-bold text-sm mb-2">PRICING STRUCTURE:</h6>
                    <ul className="text-sm space-y-1 text-slate-300">
                      <li>• Base Fare + Per KM Rate + Per Minute Rate</li>
                      <li className="text-pink-400 font-bold">• Waiting charges: ₹2/min after 5 min at pickup</li>
                      <li className="text-pink-400 font-bold">• Night surcharge: 1.25x (11 PM - 5 AM)</li>
                      <li>• Tolls charged as per actual route</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-3 border-b border-emerald-500 pb-2">💰 FARE BREAKDOWN</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Share (79%):</span>
                    <span className="text-emerald-400 font-medium">₹{(parseFloat(booking?.driver_share) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform Fee (1%):</span>
                    <span className="text-white">₹{(parseFloat(booking?.super_admin_share) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dispatcher Fee (18%):</span>
                    <span className="text-white">₹{(parseFloat(booking?.dispatcher_share) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admin Fee (2%):</span>
                    <span className="text-white">₹{(parseFloat(booking?.admin_share) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 p-4 text-center border-t border-slate-700">
              <p className="text-emerald-400 font-medium">Thank you for choosing RideFlow!</p>
              <p className="text-slate-400 text-sm">Safe travels! 🚗</p>
              <p className="text-slate-500 text-xs mt-2">Support: support@rideflow.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingShareModal;
