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
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(null);

  /* ============================
     CORE LOGIC (FIXED)
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

            <Polyline positions={[pickupCoords, destCoords]} color="#64748b" />
            <Polyline positions={routePath} color="#3b82f6" />

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
