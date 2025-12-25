import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, DollarSign, Car } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Ensure default Leaflet icons load inside bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Custom car icon for driver
const carIcon = new L.DivIcon({
  className: 'custom-car-icon',
  html: `<div style="
    background: #10b981;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    animation: pulse 1.5s infinite;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/>
      <path d="M9 17h6"/>
      <circle cx="17" cy="17" r="2"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Pickup marker icon
const pickupIcon = new L.DivIcon({
  className: 'custom-pickup-icon',
  html: `<div style="
    background: #22c55e;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <span style="color: white; font-weight: bold; font-size: 14px;">P</span>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Destination marker icon
const destIcon = new L.DivIcon({
  className: 'custom-dest-icon',
  html: `<div style="
    background: #ef4444;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <span style="color: white; font-weight: bold; font-size: 14px;">D</span>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Component to update map view when driver moves
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const MapSizeInvalidator = ({ active }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !active) return;
    const invalidate = () => map.invalidateSize({ animate: true });
    invalidate();
    const timeout = setTimeout(invalidate, 300);
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', invalidate);
    };
  }, [map, active]);
  return null;
};

const TripMapTracker = ({ trip, onClose }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [eta, setEta] = useState(null);
  const [progress, setProgress] = useState(0);

  const isMovingStatus = (status) => ['ENROUTE_TO_PICKUP', 'CUSTOMER_PICKED'].includes(status);

  // India coordinates - example route in Delhi/NCR area
  const pickupCoords = [28.6139, 77.2090]; // Delhi center
  const destCoords = [28.4595, 77.0266]; // Gurgaon

  // Simulate driver location updates based on trip status
  useEffect(() => {
    if (!trip) return;

    // Set initial position based on status
    let startProgress = 0;
    switch (trip.status) {
      case 'REQUESTED':
        startProgress = 0;
        break;
      case 'DRIVER_ACCEPTED':
        startProgress = 10;
        break;
      case 'ENROUTE_TO_PICKUP':
        startProgress = 25;
        break;
      case 'CUSTOMER_PICKED':
        startProgress = 50;
        break;
      case 'AT_DESTINATION':
        startProgress = 90;
        break;
      case 'COMPLETED':
        startProgress = 100;
        break;
      default:
        startProgress = 0;
    }

    setProgress(startProgress);
    
    // Build route path
    const initialLat = pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * (startProgress / 100);
    const initialLng = pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * (startProgress / 100);
    setRoutePath([[initialLat, initialLng]]);

    // Set initial driver location
    setDriverLocation([initialLat, initialLng]);

    // Calculate ETA
    const remainingMinutes = Math.max(0, Math.round((100 - startProgress) * 0.5));
    setEta(remainingMinutes);

    if (!isMovingStatus(trip.status)) {
      return;
    }

    // Animate driver movement
    let currentProgress = startProgress;
    const interval = setInterval(() => {
      currentProgress += 1;
      if (currentProgress > 100) {
        clearInterval(interval);
        return;
      }

      const lat = pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * (currentProgress / 100);
      const lng = pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * (currentProgress / 100);
      
      setDriverLocation([lat, lng]);
      setRoutePath(prev => [...prev, [lat, lng]]);
      setProgress(currentProgress);
      
      const remaining = Math.max(0, Math.round((100 - currentProgress) * 0.5));
      setEta(remaining);
    }, 1500);

    return () => clearInterval(interval);
  }, [trip?.status]);

  if (!trip) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-500';
      case 'DRIVER_ACCEPTED': return 'bg-blue-500';
      case 'ENROUTE_TO_PICKUP': return 'bg-purple-500';
      case 'CUSTOMER_PICKED': return 'bg-indigo-500';
      case 'AT_DESTINATION': return 'bg-green-500';
      case 'COMPLETED': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'REQUESTED': return '🔔 Waiting for Driver';
      case 'DRIVER_ACCEPTED': return '✓ Driver Accepted';
      case 'ENROUTE_TO_PICKUP': return '🚗 Driver On The Way';
      case 'CUSTOMER_PICKED': return '👤 Customer Picked Up';
      case 'AT_DESTINATION': return '📍 Arrived at Destination';
      case 'COMPLETED': return '✅ Trip Completed';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-400" />
                Live Trip Tracking
              </h2>
              <p className="text-sm text-slate-400 mt-1">{trip.transaction_number}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-sm"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(trip.status)} animate-pulse`}></div>
              <span className="text-white font-semibold">{getStatusLabel(trip.status)}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {eta !== null && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-medium">{eta} min ETA</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium">₹{trip.total_amount}</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer
            center={driverLocation || pickupCoords}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            whenReady={(map) => {
              setTimeout(() => {
                map.target.invalidateSize();
              }, 300);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Route line */}
            {routePath.length > 1 && (
              <Polyline
                positions={routePath}
                color="#3b82f6"
                weight={4}
                opacity={0.8}
                dashArray="10, 10"
              />
            )}

            {/* Full route preview (faded) */}
            <Polyline
              positions={[pickupCoords, destCoords]}
              color="#64748b"
              weight={2}
              opacity={0.4}
              dashArray="5, 10"
            />

            {/* Pickup marker */}
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup>
                <strong>📍 Pickup</strong><br />
                {trip.pickup_location}
              </Popup>
            </Marker>

            {/* Destination marker */}
            <Marker position={destCoords} icon={destIcon}>
              <Popup>
                <strong>🏁 Destination</strong><br />
                {trip.destination_location}
              </Popup>
            </Marker>

            {/* Driver marker */}
            {driverLocation && (
              <Marker position={driverLocation} icon={carIcon}>
                <Popup>
                  <strong>🚗 {trip.driver?.name || 'Driver'}</strong><br />
                  Status: {trip.status.replace(/_/g, ' ')}
                </Popup>
              </Marker>
            )}

            <MapUpdater center={driverLocation} />
            <MapSizeInvalidator active={Boolean(trip)} />
          </MapContainer>
        </div>

        {/* Trip Details Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <span className="text-slate-400 text-xs">Pickup</span>
                <p className="text-white text-sm">{trip.pickup_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <span className="text-slate-400 text-xs">Destination</span>
                <p className="text-white text-sm">{trip.destination_location}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">Driver:</span>
              <span className="text-white font-medium">{trip.driver?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Customer:</span>
              <span className="text-white font-medium">{trip.customer?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.6); }
        }
        .leaflet-container {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default TripMapTracker;
