import { useEffect, useState } from "react";
import { MapPin, Navigation, Wifi, WifiOff } from "lucide-react";

/**
 * Driver Live GPS Page
 * 
 * This page is opened by the driver on their phone or laptop browser.
 * It streams real-time GPS coordinates via WebSocket to the backend.
 * 
 * Usage:
 * 1. Driver opens: http://YOUR_IP:5173/driver/live?trip=TXN-SEED-0011
 * 2. Browser asks for location permission
 * 3. GPS streams automatically while page is open
 * 4. Dispatcher sees real-time movement on map
 * 
 * Requirements:
 * - HTTPS or localhost (browser GPS security requirement)
 * - User must grant location permission
 * - Keep page open and screen awake for continuous tracking
 * 
 * Production improvements (later):
 * - Add JWT token in URL for authentication
 * - Add trip validation (check if driver is assigned to this trip)
 * - Add battery optimization (reduce GPS frequency when stationary)
 * - Add offline queue (store GPS when connection drops)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2060';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export default function DriverLiveLocation() {
  // Get trip ID from URL query params (e.g., ?trip=TXN-SEED-0011)
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('trip') || 'TXN-SEED-0011'; // Default for testing
  
  const [isConnected, setIsConnected] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Initializing...');
  const [lastLocation, setLastLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('GPS not supported by this browser');
      setGpsStatus('GPS not available');
      return;
    }

    // Connect to WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/location/${tripId}`);

    ws.onopen = () => {
      console.log('GPS WebSocket connected');
      setIsConnected(true);
      setGpsStatus('Connected - Starting GPS...');
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Connection failed. Check if backend is running.');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('GPS WebSocket disconnected');
      setIsConnected(false);
      setGpsStatus('Disconnected');
    };

    // Start watching GPS position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };

        // Send to backend if connected
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(gpsData));
          setLastLocation(gpsData);
          setGpsStatus('Streaming GPS...');
          setError(null);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setError(`GPS Error: ${err.message}`);
        setGpsStatus('GPS permission denied or unavailable');
      },
      {
        enableHighAccuracy: true, // Use GPS instead of network location
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached position
      }
    );

    // Cleanup on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
      ws.close();
    };
  }, [tripId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Navigation className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Driver GPS Tracker</h1>
          <p className="text-slate-400 text-sm">Keep this page open while driving</p>
        </div>

        {/* Trip Info */}
        <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Trip ID</span>
            <span className="text-white font-mono text-sm">{tripId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Connection</span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-white font-medium">{gpsStatus}</span>
          </div>
          
          {lastLocation && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Latitude</span>
                <span className="text-white font-mono">{lastLocation.lat.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Longitude</span>
                <span className="text-white font-mono">{lastLocation.lng.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Accuracy</span>
                <span className="text-white">{Math.round(lastLocation.accuracy)}m</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Important:</p>
              <ul className="space-y-1 text-blue-300/80">
                <li>• Keep this page open</li>
                <li>• Keep screen awake</li>
                <li>• Allow location permission</li>
                <li>• Ensure good GPS signal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
