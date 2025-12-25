"""
WebSocket Connection Manager for Real-Time Driver GPS Tracking

This module manages WebSocket connections for live driver location updates.
Each trip has its own room where the driver broadcasts GPS coordinates
and dispatchers receive real-time updates.

Architecture:
- Driver opens /driver/live page → sends GPS via WebSocket
- Dispatcher opens trip tracker → receives GPS via WebSocket
- No polling, no REST API spam, pure real-time streaming

Production notes:
- Later add JWT authentication in WebSocket handshake
- Later add Redis for multi-instance horizontal scaling
- Later add trip-based permission checks
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by trip ID.
    
    Each trip can have multiple listeners (dispatchers, admins)
    and one broadcaster (driver).
    """
    
    def __init__(self):
        # Dictionary mapping trip_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, trip_id: str, websocket: WebSocket):
        """
        Accept a new WebSocket connection and add it to the trip room.
        
        Args:
            trip_id: Transaction number (e.g., "TXN-SEED-0011")
            websocket: FastAPI WebSocket instance
        """
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)
        logger.info(f"WebSocket connected to trip {trip_id}. Total connections: {len(self.active_connections[trip_id])}")
    
    def disconnect(self, trip_id: str, websocket: WebSocket):
        """
        Remove a WebSocket connection from the trip room.
        
        Args:
            trip_id: Transaction number
            websocket: FastAPI WebSocket instance to remove
        """
        if trip_id in self.active_connections:
            try:
                self.active_connections[trip_id].remove(websocket)
                logger.info(f"WebSocket disconnected from trip {trip_id}. Remaining: {len(self.active_connections[trip_id])}")
                
                # Clean up empty rooms
                if not self.active_connections[trip_id]:
                    del self.active_connections[trip_id]
                    logger.info(f"Trip room {trip_id} cleaned up (no connections)")
            except ValueError:
                logger.warning(f"Attempted to disconnect non-existent WebSocket from trip {trip_id}")
    
    async def broadcast(self, trip_id: str, message: dict):
        """
        Broadcast a message to all connections in a trip room.
        
        Typically used to send driver GPS updates to all dispatchers
        watching this trip.
        
        Args:
            trip_id: Transaction number
            message: JSON-serializable dict (e.g., {"lat": 28.6, "lng": 77.2})
        """
        if trip_id not in self.active_connections:
            logger.debug(f"No connections for trip {trip_id}, skipping broadcast")
            return
        
        # Send to all connections, handle disconnects gracefully
        dead_connections = []
        for connection in self.active_connections[trip_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to connection in trip {trip_id}: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for dead in dead_connections:
            self.disconnect(trip_id, dead)


# Global singleton instance
manager = ConnectionManager()
