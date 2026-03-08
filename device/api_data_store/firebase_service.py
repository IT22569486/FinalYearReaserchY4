"""
Firebase Service - Handles all Firebase Firestore operations
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FirebaseService:
    """Firebase Firestore service for bus tracking data"""
    
    def __init__(self, credentials_path: str):
        """Initialize Firebase connection"""
        self.db = None
        self._init_firebase(credentials_path)
        
    def _init_firebase(self, credentials_path: str):
        """Initialize Firebase Admin SDK"""
        try:
            # Resolve relative path
            cred_path = Path(__file__).parent / credentials_path
            if not cred_path.exists():
                cred_path = Path(credentials_path)
            
            if not cred_path.exists():
                raise FileNotFoundError(f"Firebase credentials not found: {cred_path}")
            
            # Check if already initialized
            if not firebase_admin._apps:
                cred = credentials.Certificate(str(cred_path))
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized successfully")
            
            self.db = firestore.client()
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            raise
    
    # ==========================================
    # Bus Document Operations (mirrors Node.js 'buses' collection)
    # ==========================================

    async def ensure_bus_exists(self, bus_id: str, telemetry: dict) -> bool:
        """
        Ensure a document exists in the 'buses' collection for this bus_id.
        Called on every telemetry message; creates the bus on first contact,
        then updates location/occupancy/speed on subsequent messages.
        Returns True if a new bus was created, False if it already existed.
        """
        try:
            # Search by busId field first
            snap = self.db.collection('buses').where('busId', '==', bus_id).limit(1).get()
            lat = telemetry.get('latitude')
            lng = telemetry.get('longitude')
            location = None
            if lat is not None and lng is not None:
                location = {'lat': lat, 'lng': lng, 'latitude': lat, 'longitude': lng}

            if len(list(snap)) > 0:
                # Bus already exists — update live fields only
                doc = list(self.db.collection('buses').where('busId', '==', bus_id).limit(1).get())[0]
                update = {
                    'occupancy': telemetry.get('passenger_count', 0),
                    'speed': telemetry.get('speed', 0),
                    'status': 'active',
                    'updatedAt': datetime.utcnow().isoformat(),
                }
                if location:
                    update['location'] = location
                if telemetry.get('route_id'):
                    update['routeId'] = telemetry['route_id']
                    update['routeNumber'] = telemetry['route_id']
                doc.reference.update(update)
                return False
            else:
                # First telemetry from this bus — create it
                now = datetime.utcnow().isoformat()
                bus_data = {
                    'busId': bus_id,
                    'busNumber': bus_id,
                    'routeId': telemetry.get('route_id'),
                    'routeNumber': telemetry.get('route_id'),
                    'capacity': 60,
                    'occupancy': telemetry.get('passenger_count', 0),
                    'status': 'active',
                    'location': location,
                    'speed': telemetry.get('speed', 0),
                    'createdAt': now,
                    'updatedAt': now,
                }
                self.db.collection('buses').add(bus_data)
                logger.info(f"Auto-created bus document for '{bus_id}' in 'buses' collection")
                return True
        except Exception as e:
            logger.error(f"Error in ensure_bus_exists for {bus_id}: {e}")
            return False

    # ==========================================
    # Bus Live Location Operations
    # ==========================================
    
    async def update_bus_location(self, bus_id: str, location_data: dict) -> dict:
        """Update bus live location"""
        try:
            doc_ref = self.db.collection('bus_live_locations').document(bus_id)
            
            data = {
                'bus_id': bus_id,
                'route_id': location_data.get('route_id'),
                'route_name': location_data.get('route_name', ''),
                'latitude': location_data.get('latitude'),
                'longitude': location_data.get('longitude'),
                'speed': location_data.get('speed', 0),
                'status': 'online',
                'last_updated': firestore.SERVER_TIMESTAMP,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            doc_ref.set(data, merge=True)
            logger.debug(f"Updated location for bus {bus_id}")
            
            return data
            
        except Exception as e:
            logger.error(f"Error updating bus location: {e}")
            raise
    
    async def get_bus_location(self, bus_id: str) -> dict | None:
        """Get current bus location"""
        try:
            doc = self.db.collection('bus_live_locations').document(bus_id).get()
            if doc.exists:
                return {'id': doc.id, **doc.to_dict()}
            return None
        except Exception as e:
            logger.error(f"Error getting bus location: {e}")
            return None
    
    async def get_all_bus_locations(self) -> list:
        """Get all active bus locations"""
        try:
            docs = self.db.collection('bus_live_locations').stream()
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error getting all bus locations: {e}")
            return []
    
    # ==========================================
    # GPS History Operations
    # ==========================================
    
    async def store_gps_history(self, bus_id: str, gps_data: dict) -> str:
        """Store GPS point in history"""
        try:
            collection_ref = self.db.collection('bus_gps_history')
            
            data = {
                'bus_id': bus_id,
                'route_id': gps_data.get('route_id'),
                'latitude': gps_data.get('latitude'),
                'longitude': gps_data.get('longitude'),
                'speed': gps_data.get('speed', 0),
                'timestamp': firestore.SERVER_TIMESTAMP,
                'device_timestamp': gps_data.get('timestamp')
            }
            
            doc_ref = collection_ref.add(data)
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error storing GPS history: {e}")
            raise
    
    async def get_gps_history(self, bus_id: str, limit: int = 100) -> list:
        """Get GPS history for a bus"""
        try:
            docs = (
                self.db.collection('bus_gps_history')
                .where('bus_id', '==', bus_id)
                .order_by('timestamp', direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error getting GPS history: {e}")
            return []
    
    # ==========================================
    # Passenger Data Operations
    # ==========================================
    
    async def store_passenger_event(self, bus_id: str, passenger_data: dict) -> str:
        """Store passenger boarding/alighting event"""
        try:
            collection_ref = self.db.collection('bus_passenger_events')
            
            data = {
                'bus_id': bus_id,
                'route_id': passenger_data.get('route_id'),
                'route_name': passenger_data.get('route_name', ''),
                'latitude': passenger_data.get('latitude'),
                'longitude': passenger_data.get('longitude'),
                'total_weight': passenger_data.get('total_weight', 0),
                'in_count': passenger_data.get('in_count', 0),
                'out_count': passenger_data.get('out_count', 0),
                'total_passenger_count': passenger_data.get('total_passenger_count', 0),
                'timestamp': firestore.SERVER_TIMESTAMP,
                'device_timestamp': passenger_data.get('timestamp')
            }
            
            doc_ref = collection_ref.add(data)
            logger.info(f"Stored passenger event for bus {bus_id}: +{data['in_count']}/-{data['out_count']}")
            
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error storing passenger event: {e}")
            raise
    
    async def update_bus_passenger_count(self, bus_id: str, passenger_data: dict) -> dict:
        """Update current passenger count for bus"""
        try:
            doc_ref = self.db.collection('bus_live_locations').document(bus_id)
            
            update_data = {
                'passenger_count': passenger_data.get('total_passenger_count', 0),
                'total_weight': passenger_data.get('total_weight', 0),
                'last_passenger_update': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref.update(update_data)
            return update_data
            
        except Exception as e:
            logger.error(f"Error updating passenger count: {e}")
            raise
    
    async def get_passenger_events(self, bus_id: str, limit: int = 50) -> list:
        """Get passenger events for a bus"""
        try:
            docs = (
                self.db.collection('bus_passenger_events')
                .where('bus_id', '==', bus_id)
                .order_by('timestamp', direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error getting passenger events: {e}")
            return []
    
    # ==========================================
    # Route Operations
    # ==========================================
    
    async def get_route_by_id(self, route_id: int | str) -> dict | None:
        """Get route by ID"""
        try:
            # Try direct document lookup first
            doc = self.db.collection('routes').document(str(route_id)).get()
            if doc.exists:
                return {'id': doc.id, **doc.to_dict()}
            
            # Fallback: search by route_id field
            docs = (
                self.db.collection('routes')
                .where('route_id', '==', int(route_id))
                .limit(1)
                .stream()
            )
            
            for doc in docs:
                return {'id': doc.id, **doc.to_dict()}
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting route: {e}")
            return None
    
    async def get_all_routes(self) -> list:
        """Get all routes"""
        try:
            docs = self.db.collection('routes').stream()
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error getting routes: {e}")
            return []
    
    # ==========================================
    # Bus Status Operations
    # ==========================================
    
    async def set_bus_offline(self, bus_id: str):
        """Mark bus as offline"""
        try:
            doc_ref = self.db.collection('bus_live_locations').document(bus_id)
            doc_ref.update({
                'status': 'offline',
                'last_updated': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Bus {bus_id} marked as offline")
        except Exception as e:
            logger.error(f"Error setting bus offline: {e}")
    
    # ==========================================
    # Telemetry Operations (ESP32 v8)
    # ==========================================
    
    async def store_telemetry(self, bus_id: str, telemetry: dict) -> dict:
        """
        Store combined telemetry data from ESP32
        Updates bus_live_locations with current state
        """
        try:
            doc_ref = self.db.collection('bus_live_locations').document(bus_id)
            
            data = {
                'bus_id': bus_id,
                'route_id': telemetry.get('route_id'),
                'latitude': telemetry.get('latitude'),
                'longitude': telemetry.get('longitude'),
                'speed': telemetry.get('speed', 0),
                'passenger_in_count': telemetry.get('passenger_in_count', 0),
                'passenger_out_count': telemetry.get('passenger_out_count', 0),
                'total_passenger_count': telemetry.get('total_passenger_count', telemetry.get('passenger_count', 0)),
                'total_weight': telemetry.get('total_weight', 0),
                'gps_valid': telemetry.get('gps_valid', True),
                'status': 'online',
                'last_updated': firestore.SERVER_TIMESTAMP,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            doc_ref.set(data, merge=True)
            logger.debug(f"Stored telemetry for bus {bus_id}")
            
            return data
            
        except Exception as e:
            logger.error(f"Error storing telemetry: {e}")
            raise
    
    async def store_speed_violation(self, violation_data: dict) -> str:
        """Store speed violation record"""
        try:
            collection_ref = self.db.collection('speed_violations')
            
            data = {
                'bus_id': violation_data.get('bus_id'),
                'route_id': violation_data.get('route_id'),
                'latitude': violation_data.get('latitude'),
                'longitude': violation_data.get('longitude'),
                'location_name': violation_data.get('location_name', ''),
                'actual_speed': violation_data.get('actual_speed'),
                'safe_speed': violation_data.get('safe_speed'),
                'speed_limit': violation_data.get('speed_limit', 60),
                'violation_type': violation_data.get('violation_type', 'overspeed'),
                'severity': violation_data.get('severity', 'medium'),
                'passenger_count': violation_data.get('passenger_count', 0),
                'driver_id': violation_data.get('driver_id'),
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = collection_ref.add(data)
            logger.warning(f"Speed violation recorded for bus {data['bus_id']}: {data['actual_speed']} km/h")
            
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error storing speed violation: {e}")
            raise
    
    # ==========================================
    # Bus Stop Sensor Data Operations
    # ==========================================
    
    async def store_bus_stop_data(self, bus_id: str, stop_data: dict) -> str:
        """Store bus stop sensor data (collected when bus was stopped, sent when moving again)"""
        try:
            collection_ref = self.db.collection('bus_stop_sensor_data')
            
            data = {
                'bus_id': bus_id,
                'route_id': stop_data.get('route_id'),
                'latitude': stop_data.get('latitude', 0),
                'longitude': stop_data.get('longitude', 0),
                'passenger_in_count': stop_data.get('passenger_in_count', 0),
                'passenger_out_count': stop_data.get('passenger_out_count', 0),
                'total_passenger_count': stop_data.get('total_passenger_count', 0),
                'load_cell_weight': stop_data.get('load_cell_weight', 0),
                'speed': stop_data.get('speed', 0),
                'stop_duration_ms': stop_data.get('stop_duration_ms', 0),
                'timestamp': firestore.SERVER_TIMESTAMP,
                'device_timestamp': stop_data.get('timestamp')
            }
            
            doc_ref = collection_ref.add(data)
            logger.info(
                f"Bus stop data stored for {bus_id}: "
                f"in={data['passenger_in_count']}, out={data['passenger_out_count']}, "
                f"total={data['total_passenger_count']}, weight={data['load_cell_weight']}kg"
            )
            
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error storing bus stop data: {e}")
            raise
    
    async def get_recent_stop_data(self, bus_id: str, limit: int = 20) -> list:
        """Get recent bus stop sensor data for a bus"""
        try:
            docs = (
                self.db.collection('bus_stop_sensor_data')
                .where('bus_id', '==', bus_id)
                .order_by('timestamp', direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error getting bus stop data: {e}")
            return []
