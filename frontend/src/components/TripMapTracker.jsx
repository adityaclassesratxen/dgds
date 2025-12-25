import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import {
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  Car,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2060';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* ============================
   FIX LEAFLET DEFAULT ICONS
============================ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ============================
   ICONS
============================ */
const carIcon = new L.DivIcon({
  html: `
    <div style="
      background:#10b981;
      width:40px;
      height:40px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
    ">
      🚗
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const pickupIcon = new L.DivIcon({
  html: `<div style="background:#22c55e;width:30px;height:30px;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;">P</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const destIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;width:30px;height:30px;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;">D</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

/* ============================
   HELPERS
============================ */
const isMovingStatus = (status) =>
  status === "ENROUTE_TO_PICKUP" || status === "CUSTOMER_PICKED";

/**
 * Fetch real road route from OSRM (free, no API key needed)
 * Returns array of [lat, lng] coordinates following actual roads
 */
async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );
    }
    return [from, to]; // Fallback to straight line
  } catch (error) {
    console.error('OSRM routing error:', error);
    return [from, to]; // Fallback to straight line
  }
}

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

/* ============================
   MAIN COMPONENT
============================ */
const TripMapTracker = ({ trip, onClose }) => {
  const pickupCoords = [28.6139, 77.2090];
  const destCoords = [28.4595, 77.0266];

  const [driverLocation, setDriverLocation] = useState(pickupCoords);
  const [routePath, setRoutePath] = useState([pickupCoords]);
  const [fullRoute, setFullRoute] = useState([pickupCoords, destCoords]); // Real road path
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(null);

  /* ============================
     LOAD REAL ROAD ROUTE (OSRM)
  ============================ */
  useEffect(() => {
    fetchRoute(pickupCoords, destCoords).then(route => {
      setFullRoute(route);
      console.log('Real road route loaded:', route.length, 'points');
    });
  }, []);

  /* ============================
     WEBSOCKET - REAL-TIME GPS
  ============================ */
  useEffect(() => {
    if (!trip?.transaction_number) return;

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/location/${trip.transaction_number}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected for trip:', trip.transaction_number);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received GPS update:', data);
      
      // Update driver location from real GPS
      setDriverLocation([data.lat, data.lng]);
      setRoutePath((prev) => [...prev, [data.lat, data.lng]]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => ws.close();
  }, [trip?.transaction_number]);

  /* ============================
     SIMULATED MOVEMENT (FALLBACK)
     Only runs if no real GPS data
  ============================ */
  useEffect(() => {
    if (!trip?.status) return;

    let startProgress = 0;

    switch (trip.status) {
      case "REQUESTED":
        startProgress = 0;
        break;
      case "DRIVER_ACCEPTED":
        startProgress = 10;
        break;
      case "ENROUTE_TO_PICKUP":
        startProgress = 25;
        break;
      case "CUSTOMER_PICKED":
        startProgress = 50;
        break;
      case "AT_DESTINATION":
        startProgress = 90;
        break;
      case "COMPLETED":
        startProgress = 100;
        break;
      default:
        startProgress = 0;
    }

    setProgress(startProgress);

    const lat =
      pickupCoords[0] +
      (destCoords[0] - pickupCoords[0]) * (startProgress / 100);
    const lng =
      pickupCoords[1] +
      (destCoords[1] - pickupCoords[1]) * (startProgress / 100);

    setDriverLocation([lat, lng]);
    setRoutePath([[lat, lng]]);
    setEta(Math.max(0, Math.round((100 - startProgress) * 0.5)));

    // ❌ DO NOT MOVE DRIVER FOR WRONG STATUS
    if (!isMovingStatus(trip.status)) return;

    let currentProgress = startProgress;

    const interval = setInterval(() => {
      currentProgress += 1;
      if (currentProgress > 100) {
        clearInterval(interval);
        return;
      }

      const lat =
        pickupCoords[0] +
        (destCoords[0] - pickupCoords[0]) * (currentProgress / 100);
      const lng =
        pickupCoords[1] +
        (destCoords[1] - pickupCoords[1]) * (currentProgress / 100);

      setDriverLocation([lat, lng]);
      setRoutePath((prev) => [...prev, [lat, lng]]);
      setProgress(currentProgress);
      setEta(Math.max(0, Math.round((100 - currentProgress) * 0.5)));
    }, 1500);

    return () => clearInterval(interval);
  }, [trip?.status]);

  if (!trip) return null;

  /* ============================
     UI
  ============================ */
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            Live Trip Tracking
          </h2>
          <button onClick={onClose} className="text-white">✕</button>
        </div>

        {/* STATUS */}
        <div className="p-3 border-b border-slate-800 text-white flex justify-between">
          <span>Status: {trip.status}</span>
          {eta !== null && <span>{eta} min ETA</span>}
        </div>

        {/* MAP */}
        <div className="h-full">
          <MapContainer
            center={driverLocation}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            whenReady={(map) => {
              setTimeout(() => map.target.invalidateSize(), 300);
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Full route preview (real roads, faded) */}
            <Polyline positions={fullRoute} color="#64748b" weight={3} opacity={0.4} />
            
            {/* Driver's traveled path (bright blue) */}
            <Polyline positions={routePath} color="#3b82f6" weight={4} opacity={0.8} />

            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup>Pickup</Popup>
            </Marker>

            <Marker position={destCoords} icon={destIcon}>
              <Popup>Destination</Popup>
            </Marker>

            <Marker position={driverLocation} icon={carIcon}>
              <Popup>Driver</Popup>
            </Marker>

            <MapUpdater center={driverLocation} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default TripMapTracker;
