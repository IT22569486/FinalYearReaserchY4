"""
Bus Tracking Backend Service - Main Application
MQTT to Firebase Bridge with Socket.IO real-time updates
"""
import asyncio
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import config
from firebase_service import FirebaseService
from mqtt_service import MQTTService
from socket_service import SocketService
from route_service import RouteService

# Import models
from models import Bus, BusTelemetry, BusLocation, PassengerEvent, SafeSpeedPrediction

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize services
firebase_service: FirebaseService = None
mqtt_service: MQTTService = None
route_service: RouteService = None

# Socket.IO initialized at module level (doesn't depend on Firebase)
socket_service = SocketService(config.SOCKET_CORS_ORIGINS)
logger.info("Socket.IO service initialized")


async def handle_gps_message(bus_id: str, payload: dict):
    """
    Handle incoming GPS/telemetry message from MQTT
    Supports both legacy GPS-only and ESP32 v8 combined telemetry
    """
    try:
        logger.info(f"Telemetry from bus {bus_id}: lat={payload.get('latitude')}, lng={payload.get('longitude')}, speed={payload.get('speed')}")
        
        # Ensure a bus document exists in the 'buses' collection (auto-create on first contact)
        created = await firebase_service.ensure_bus_exists(bus_id, payload)
        if created:
            logger.info(f"New bus '{bus_id}' registered in 'buses' collection from ESP32 telemetry")

        route_id = payload.get('route_id')
        route_name = None
        
        # Get route name if route_id is provided
        if route_id:
            route_name = await route_service.get_route_name(route_id)
            payload['route_name'] = route_name or f"Route {route_id}"
        
        # Store telemetry in Firebase (handles both GPS and passenger data)
        await firebase_service.store_telemetry(bus_id, payload)
        
        # Broadcast location via Socket.IO
        broadcast_data = {
            'bus_id': bus_id,
            'route_id': route_id,
            'route_name': route_name or f"Route {route_id}" if route_id else "Unknown",
            'latitude': payload.get('latitude'),
            'longitude': payload.get('longitude'),
            'speed': payload.get('speed', 0),
            'passenger_count': payload.get('passenger_count', 0),
            'total_weight': payload.get('total_weight', 0),
            'gps_valid': payload.get('gps_valid', True),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await socket_service.emit_bus_location(broadcast_data)
        
    except Exception as e:
        logger.error(f"Error handling telemetry message: {e}")


async def handle_passenger_message(bus_id: str, payload: dict):
    """Handle incoming passenger data message from MQTT"""
    try:
        logger.info(
            f"Passenger update from bus {bus_id}: "
            f"in={payload.get('in_count')}, out={payload.get('out_count')}, "
            f"total={payload.get('total_passenger_count')}"
        )
        
        route_id = payload.get('route_id')
        route_name = None
        
        # Get route name if route_id is provided
        if route_id:
            route_name = await route_service.get_route_name(route_id)
            payload['route_name'] = route_name or f"Route {route_id}"
        
        # Store passenger event in Firebase
        await firebase_service.store_passenger_event(bus_id, payload)
        
        # Update live passenger count
        await firebase_service.update_bus_passenger_count(bus_id, payload)
        
        # Broadcast via Socket.IO
        broadcast_data = {
            'bus_id': bus_id,
            'route_id': route_id,
            'route_name': route_name or f"Route {route_id}" if route_id else "Unknown",
            'latitude': payload.get('latitude'),
            'longitude': payload.get('longitude'),
            'total_weight': payload.get('total_weight', 0),
            'in_count': payload.get('in_count', 0),
            'out_count': payload.get('out_count', 0),
            'total_passenger_count': payload.get('total_passenger_count', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await socket_service.emit_passenger_update(broadcast_data)
        
    except Exception as e:
        logger.error(f"Error handling passenger message: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    global firebase_service, mqtt_service, route_service
    
    logger.info("Starting Bus Tracking Backend Service...")
    
    # Initialize Firebase
    try:
        firebase_service = FirebaseService(config.FIREBASE_CREDENTIALS)
        logger.info("Firebase service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise
    
    # Initialize Route Service
    route_service = RouteService(firebase_service)
    logger.info("Route service initialized")
    
    # Initialize MQTT
    mqtt_service = MQTTService(
        broker=config.MQTT_BROKER,
        port=config.MQTT_PORT,
        username=config.MQTT_USER if config.MQTT_USER else None,
        password=config.MQTT_PASSWORD if config.MQTT_PASSWORD else None,
        client_id=config.MQTT_CLIENT_ID
    )
    
    # Set MQTT message handlers
    mqtt_service.set_handlers(
        on_gps=handle_gps_message,
        on_passenger=handle_passenger_message
    )
    
    # Connect to MQTT broker
    if mqtt_service.connect():
        logger.info("MQTT service connected")
    else:
        logger.warning("MQTT connection failed - service will run without MQTT")
    
    logger.info(f"Bus Tracking Backend running on port {config.API_PORT}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Bus Tracking Backend...")
    if mqtt_service:
        mqtt_service.disconnect()


# Create FastAPI app
app = FastAPI(
    title="Bus Tracking Backend",
    description="MQTT to Firebase Bridge with Socket.IO real-time updates",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO (only if socket_service is available)
if socket_service:
    app.mount("/socket.io", socket_service.get_app())


# ==========================================
# API Endpoints
# ==========================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Bus Tracking Backend",
        "status": "running",
        "mqtt_connected": mqtt_service.connected if mqtt_service else False,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "firebase": firebase_service is not None,
            "mqtt": mqtt_service.connected if mqtt_service else False,
            "socket_io": socket_service is not None
        },
        "config": {
            "mqtt_broker": config.MQTT_BROKER,
            "mqtt_port": config.MQTT_PORT,
            "api_port": config.API_PORT
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/buses")
async def get_all_buses():
    """Get all active bus locations"""
    try:
        buses = await firebase_service.get_all_bus_locations()
        return buses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/bus/{bus_id}")
async def get_bus(bus_id: str):
    """Get specific bus location and data"""
    try:
        bus = await firebase_service.get_bus_location(bus_id)
        if not bus:
            raise HTTPException(status_code=404, detail="Bus not found")
        return bus
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/bus/{bus_id}/history")
async def get_bus_history(bus_id: str, limit: int = 100):
    """Get GPS history for a bus"""
    try:
        history = await firebase_service.get_gps_history(bus_id, limit)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/bus/{bus_id}/passengers")
async def get_bus_passengers(bus_id: str, limit: int = 50):
    """Get passenger events for a bus"""
    try:
        events = await firebase_service.get_passenger_events(bus_id, limit)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/routes")
async def get_routes():
    """Get all routes"""
    try:
        routes = await route_service.get_all_routes()
        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/routes/{route_id}")
async def get_route(route_id: str):
    """Get specific route"""
    try:
        route = await route_service.get_route(route_id)
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")
        return route
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bus/{bus_id}/command")
async def send_bus_command(bus_id: str, command: dict):
    """Send command to a bus via MQTT"""
    try:
        if not mqtt_service or not mqtt_service.connected:
            raise HTTPException(status_code=503, detail="MQTT service not available")
        
        success = mqtt_service.send_command(bus_id, command)
        if success:
            return {"status": "sent", "bus_id": bus_id, "command": command}
        else:
            raise HTTPException(status_code=500, detail="Failed to send command")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bus/{bus_id}/safe-speed")
async def update_safe_speed(bus_id: str, safe_speed: float, location_name: str = None):
    """Send safe speed update to a bus"""
    try:
        if not mqtt_service or not mqtt_service.connected:
            raise HTTPException(status_code=503, detail="MQTT service not available")
        
        success = mqtt_service.send_safe_speed_update(bus_id, safe_speed, location_name)
        if success:
            return {
                "status": "sent",
                "bus_id": bus_id,
                "safe_speed": safe_speed,
                "location_name": location_name
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send safe speed update")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Main entry point
# ==========================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
        log_level="info"
    )
