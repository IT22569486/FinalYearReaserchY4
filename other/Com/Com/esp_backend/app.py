"""
Smart Bus Safe Speed Prediction & Fleet Management System
Backend API Server with MongoDB Integration
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta
import pandas as pd
import joblib
import requests
import math
import os
import logging
from functools import lru_cache
from dotenv import load_dotenv
import json

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Firebase Configuration
FIREBASE_CRED_PATH = os.getenv("FIREBASE_CRED_PATH", r"C:\Users\Sachith\Desktop\Com\esp_backend\research-be48a-firebase-adminsdk-fbsvc-2792392e0a.json")
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL", "https://research-be48a-default-rtdb.firebaseio.com/")

try:
    cred = credentials.Certificate(FIREBASE_CRED_PATH)
    firebase_admin.initialize_app(cred, {
        'databaseURL': FIREBASE_DB_URL
    })
    firebase_db = db.reference()
    telemetry_ref = firebase_db.child('telemetry')
    buses_ref = firebase_db.child('buses')
    predictions_ref = firebase_db.child('predictions')
    logger.info("Firebase connected successfully")
except Exception as e:
    logger.error(f"Firebase connection failed: {e}")
    firebase_db = None

# Load ML Model
model_path = "lightgbm_safe_speed_model.pkl"
encoders_path = "label_encoders.pkl"

try:
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(encoders_path):
        raise FileNotFoundError(f"Label encoders file not found: {encoders_path}")
    
    model = joblib.load(model_path)
    label_encoders = joblib.load(encoders_path)
    logger.info("Model and label encoders loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None
    label_encoders = None

# API Keys
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Route Endpoints (for direction calculation)
ROUTE_ENDPOINTS = {
    "177_Kaduwela_Kollupitiya": {
        "start": (6.936372181, 79.98325019),  # Kaduwela
        "end": (6.91145983, 79.86845281)       # Kollupitiya
    }
}

# Store trip start per vehicle (in-memory, could be moved to Redis)
trip_start_location = {}

# ========================
# HELPER FUNCTIONS
# ========================

def haversine_distance(coord1, coord2):
    """Calculate distance between two GPS coordinates in km"""
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def determine_direction(vehicle_id, lat, lon, route_id="177_Kaduwela_Kollupitiya"):
    """Determine travel direction based on trip start location"""
    if vehicle_id not in trip_start_location:
        trip_start_location[vehicle_id] = (lat, lon)
    
    start = trip_start_location[vehicle_id]
    endpoints = ROUTE_ENDPOINTS.get(route_id, ROUTE_ENDPOINTS["177_Kaduwela_Kollupitiya"])
    
    if haversine_distance(start, endpoints["start"]) < haversine_distance(start, endpoints["end"]):
        return "Kaduwela_to_Kollupitiya"
    else:
        return "Kollupitiya_to_Kaduwela"


@lru_cache(maxsize=256)
def reverse_geocode_cached(lat_rounded, lon_rounded):
    """Reverse geocode GPS coordinates to location name (cached)"""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat_rounded}&lon={lon_rounded}&format=json"
        headers = {"User-Agent": "SmartBusFleetSystem/1.0"}
        r = requests.get(url, headers=headers, timeout=5)
        r.raise_for_status()
        data = r.json()
        addr = data.get("address", {})
        location = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("town")
            or addr.get("city")
            or "Unknown"
        )
        return location
    except Exception as e:
        logger.warning(f"Geocoding error: {e}")
        return "Unknown"


def reverse_geocode(lat, lon):
    """Reverse geocode with rounding for cache efficiency"""
    lat_rounded = round(lat, 3)
    lon_rounded = round(lon, 3)
    return reverse_geocode_cached(lat_rounded, lon_rounded)


@lru_cache(maxsize=128)
def get_weather_cached(lat_rounded, lon_rounded):
    """Get weather data from OpenWeatherMap (cached)"""
    if not OPENWEATHER_API_KEY:
        return 30.0, 75.0, 0.0
    
    try:
        url = (
            "https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat_rounded}&lon={lon_rounded}&appid={OPENWEATHER_API_KEY}&units=metric"
        )
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        data = r.json()
        
        temp = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        rain_mm = data.get("rain", {}).get("1h", 0)
        
        return temp, humidity, rain_mm
    except Exception as e:
        logger.warning(f"Weather API error: {e}")
        return 30.0, 75.0, 0.0


def get_weather(lat, lon):
    """Get weather with rounding for cache efficiency"""
    lat_rounded = round(lat, 2)
    lon_rounded = round(lon, 2)
    return get_weather_cached(lat_rounded, lon_rounded)


def map_rain_intensity(rain_mm):
    """Map rain mm to intensity levels"""
    if rain_mm == 0:
        return 0
    elif rain_mm < 2:
        return 1
    else:
        return 2


def infer_road_condition(rain_intensity, humidity):
    """Infer road condition from weather data"""
    return 1 if (rain_intensity > 0 or humidity >= 80) else 0


def get_road_condition_label(condition):
    """Convert road condition code to label"""
    return "Wet" if condition == 1 else "Dry"


def safe_encode(col, value):
    """Safely encode categorical values"""
    if label_encoders is None:
        return 0
    enc = label_encoders.get(col)
    if enc is None:
        return 0
    return int(enc.transform([value])[0]) if value in enc.classes_ else 0


def json_serializer(obj):
    """Custom JSON serializer for datetime"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# ========================
# ESP32 API ENDPOINTS
# ========================

@app.route("/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint for ESP32 devices
    Receives minimal telemetry, derives additional features, and returns safe speed
    """
    try:
        data = request.json
        logger.info(f"Received prediction request: {data}")
        
        # Validate required fields
        required_fields = ["vehicle_id", "route_id", "gps_latitude", "gps_longitude",
                          "passenger_count", "passenger_load_kg"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        vehicle_id = data["vehicle_id"]
        route_id = data["route_id"]
        lat = float(data["gps_latitude"])
        lon = float(data["gps_longitude"])
        passenger_count = int(data["passenger_count"])
        passenger_load_kg = float(data["passenger_load_kg"])
        
        # Derive direction
        direction = determine_direction(vehicle_id, lat, lon, route_id)
        
        # Get location and weather
        location_name = reverse_geocode(lat, lon)
        temp, humidity, rain_mm = get_weather(lat, lon)
        
        rain_intensity = map_rain_intensity(rain_mm)
        road_condition = infer_road_condition(rain_intensity, humidity)
        road_condition_label = get_road_condition_label(road_condition)
        
        # Time features
        now = datetime.now()
        hour = now.hour
        day = now.weekday()
        month = now.month
        
        is_weekend = 1 if day >= 5 else 0
        is_peak = 1 if (7 <= hour <= 9 or 16 <= hour <= 19) else 0
        season = 0 if month in [12, 1, 2] else 1
        
        # Build feature DataFrame
        df = pd.DataFrame([{
            "vehicle_id": vehicle_id,
            "route_id": route_id,
            "direction": direction,
            "location_name": location_name,
            "gps_latitude": lat,
            "gps_longitude": lon,
            "passenger_count": passenger_count,
            "passenger_load_kg": passenger_load_kg,
            "road_condition": road_condition,
            "temperature_c": temp,
            "humidity_percent": humidity,
            "rain_intensity": rain_intensity,
            "hour_of_day": hour,
            "day_of_week": day,
            "is_weekend": is_weekend,
            "is_peak_hours": is_peak,
            "month": month,
            "season": season
        }])
        
        df["is_night"] = ((df["hour_of_day"] < 5) | (df["hour_of_day"] > 20)).astype(int)
        df["load_per_passenger"] = df["passenger_load_kg"] / (df["passenger_count"] + 1)
        
        # Encode categorical features
        for col in ["vehicle_id", "route_id", "direction", "location_name"]:
            df[col] = df[col].apply(lambda x: safe_encode(col, x))
        
        # Predict safe speed
        if model is not None:
            safe_speed = float(model.predict(df)[0])
        else:
            safe_speed = 40.0  # Default fallback
        
        safe_speed = round(safe_speed, 1)
        
        # Prepare response data
        response_data = {
            "safe_speed": safe_speed,
            "location_name": location_name,
            "road_condition": road_condition_label,
            "direction": direction,
            "temperature": temp,
            "humidity": humidity
        }
        
        # Store in database
        if firebase_db is not None:
            try:
                timestamp = now.isoformat()
                
                # Update or insert bus record
                bus_data = {
                    "vehicle_id": str(vehicle_id),
                    "route_id": str(route_id),
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "location_name": str(location_name),
                    "direction": str(direction),
                    "safe_speed": float(safe_speed),
                    "road_condition": str(road_condition_label),
                    "passenger_count": int(passenger_count),
                    "passenger_load_kg": float(passenger_load_kg),
                    "temperature": float(temp),
                    "humidity": float(humidity),
                    "last_update": timestamp,
                    "status": "online"
                }
                
                buses_ref.child(vehicle_id).set(bus_data)
                
                # Store telemetry record
                telemetry_data = {
                    **bus_data,
                    "timestamp": timestamp
                }
                telemetry_ref.push(telemetry_data)
                
                # Emit WebSocket event for real-time updates
                socketio.emit('bus_update', bus_data)
            except Exception as db_error:
                logger.error(f"Database error: {db_error}", exc_info=True)
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/reset-trip/<vehicle_id>", methods=["POST"])
def reset_trip(vehicle_id):
    """Reset trip start location for a vehicle (new trip)"""
    if vehicle_id in trip_start_location:
        del trip_start_location[vehicle_id]
    return jsonify({"message": f"Trip reset for {vehicle_id}"})


# ========================
# FLEET MANAGEMENT API ENDPOINTS
# ========================

@app.route("/api/fleet/overview", methods=["GET"])
def fleet_overview():
    """Get fleet overview statistics"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        # Get all buses
        buses = buses_ref.get() or {}
        total_buses = len(buses)
        
        # Get online buses (updated in last 30 seconds)
        online_threshold = datetime.now() - timedelta(seconds=30)
        online_buses = 0
        total_speed = 0
        wet_roads = 0
        dry_roads = 0
        total_passengers = 0
        
        for bus_id, bus_data in buses.items():
            if bus_data.get('last_update'):
                try:
                    last_update = datetime.fromisoformat(bus_data['last_update'])
                    if last_update >= online_threshold:
                        online_buses += 1
                except:
                    pass
            
            # Aggregate other stats
            if bus_data.get('safe_speed'):
                total_speed += bus_data['safe_speed']
            
            if bus_data.get('road_condition') == 'Wet':
                wet_roads += 1
            elif bus_data.get('road_condition') == 'Dry':
                dry_roads += 1
            
            if bus_data.get('passenger_count'):
                total_passengers += bus_data['passenger_count']
        
        offline_buses = total_buses - online_buses
        avg_speed = round(total_speed / total_buses, 1) if total_buses > 0 else 0
        
        return jsonify({
            "total_buses": total_buses,
            "online_buses": online_buses,
            "offline_buses": offline_buses,
            "average_speed": avg_speed,
            "road_conditions": {
                "wet": wet_roads,
                "dry": dry_roads
            },
            "total_passengers": total_passengers,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Fleet overview error: {e}")
        return jsonify({"error": "Failed to fetch fleet overview"}), 500


@app.route("/api/fleet/buses", methods=["GET"])
def get_all_buses():
    """Get list of all buses with current status"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        buses = buses_ref.get() or {}
        online_threshold = datetime.now() - timedelta(seconds=30)
        
        bus_list = []
        for bus_id, bus in buses.items():
            is_online = False
            if bus.get("last_update"):
                try:
                    last_update = datetime.fromisoformat(bus["last_update"])
                    is_online = last_update >= online_threshold
                except:
                    pass
            
            bus_list.append({
                "id": bus_id,
                "vehicle_id": bus.get("vehicle_id"),
                "route_id": bus.get("route_id"),
                "latitude": bus.get("latitude"),
                "longitude": bus.get("longitude"),
                "location_name": bus.get("location_name"),
                "direction": bus.get("direction"),
                "safe_speed": bus.get("safe_speed"),
                "road_condition": bus.get("road_condition"),
                "passenger_count": bus.get("passenger_count"),
                "passenger_load_kg": bus.get("passenger_load_kg"),
                "temperature": bus.get("temperature"),
                "humidity": bus.get("humidity"),
                "last_update": bus.get("last_update"),
                "status": "online" if is_online else "offline"
            })
        
        # Sort by vehicle_id
        bus_list.sort(key=lambda x: x.get("vehicle_id", ""))
        
        return jsonify({"buses": bus_list, "count": len(bus_list)})
        
    except Exception as e:
        logger.error(f"Get buses error: {e}")
        return jsonify({"error": "Failed to fetch buses"}), 500


@app.route("/api/fleet/buses/<vehicle_id>", methods=["GET"])
def get_bus_details(vehicle_id):
    """Get detailed information about a specific bus"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        bus = buses_ref.child(vehicle_id).get()
        
        if not bus:
            return jsonify({"error": "Bus not found"}), 404
        
        online_threshold = datetime.now() - timedelta(seconds=30)
        is_online = False
        if bus.get("last_update"):
            try:
                last_update = datetime.fromisoformat(bus["last_update"])
                is_online = last_update >= online_threshold
            except:
                pass
        
        return jsonify({
            "id": vehicle_id,
            "vehicle_id": bus.get("vehicle_id"),
            "route_id": bus.get("route_id"),
            "latitude": bus.get("latitude"),
            "longitude": bus.get("longitude"),
            "location_name": bus.get("location_name"),
            "direction": bus.get("direction"),
            "safe_speed": bus.get("safe_speed"),
            "road_condition": bus.get("road_condition"),
            "passenger_count": bus.get("passenger_count"),
            "passenger_load_kg": bus.get("passenger_load_kg"),
            "temperature": bus.get("temperature"),
            "humidity": bus.get("humidity"),
            "last_update": bus.get("last_update"),
            "status": "online" if is_online else "offline"
        })
        
    except Exception as e:
        logger.error(f"Get bus details error: {e}")
        return jsonify({"error": "Failed to fetch bus details"}), 500


@app.route("/api/fleet/buses/<vehicle_id>/history", methods=["GET"])
def get_bus_history(vehicle_id):
    """Get telemetry history for a specific bus"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        # Get query parameters
        limit = int(request.args.get("limit", 100))
        hours = int(request.args.get("hours", 24))
        
        time_threshold = datetime.now() - timedelta(hours=hours)
        
        # Get all telemetry data and filter
        all_telemetry = telemetry_ref.get() or {}
        history_list = []
        
        for telemetry_id, record in all_telemetry.items():
            if record.get('vehicle_id') == vehicle_id:
                if record.get('timestamp'):
                    try:
                        timestamp = datetime.fromisoformat(record['timestamp'])
                        if timestamp >= time_threshold:
                            history_list.append({
                                "timestamp": record.get("timestamp"),
                                "latitude": record.get("latitude"),
                                "longitude": record.get("longitude"),
                                "location_name": record.get("location_name"),
                                "direction": record.get("direction"),
                                "safe_speed": record.get("safe_speed"),
                                "road_condition": record.get("road_condition"),
                                "passenger_count": record.get("passenger_count"),
                                "temperature": record.get("temperature"),
                                "humidity": record.get("humidity")
                            })
                    except:
                        pass
        
        # Sort by timestamp descending and limit
        history_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        history_list = history_list[:limit]
        
        return jsonify({
            "vehicle_id": vehicle_id,
            "history": history_list,
            "count": len(history_list)
        })
        
    except Exception as e:
        logger.error(f"Get bus history error: {e}")
        return jsonify({"error": "Failed to fetch bus history"}), 500


@app.route("/api/fleet/map-data", methods=["GET"])
def get_map_data():
    """Get data for map visualization (all buses with coordinates)"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        buses = buses_ref.get() or {}
        online_threshold = datetime.now() - timedelta(seconds=30)
        
        map_data = []
        for bus_id, bus in buses.items():
            if bus.get('latitude') and bus.get('longitude'):
                is_online = False
                if bus.get("last_update"):
                    try:
                        last_update = datetime.fromisoformat(bus["last_update"])
                        is_online = last_update >= online_threshold
                    except:
                        pass
                
                map_data.append({
                    "vehicle_id": bus.get("vehicle_id"),
                    "latitude": bus.get("latitude"),
                    "longitude": bus.get("longitude"),
                    "location_name": bus.get("location_name"),
                    "safe_speed": bus.get("safe_speed"),
                    "road_condition": bus.get("road_condition"),
                    "direction": bus.get("direction"),
                    "passenger_count": bus.get("passenger_count"),
                    "status": "online" if is_online else "offline"
                })
        
        return jsonify({"buses": map_data, "count": len(map_data)})
        
    except Exception as e:
        logger.error(f"Get map data error: {e}")
        return jsonify({"error": "Failed to fetch map data"}), 500


@app.route("/api/fleet/routes", methods=["GET"])
def get_routes():
    """Get all unique routes in the system"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        buses = buses_ref.get() or {}
        
        # Collect unique routes and count buses
        route_counts = {}
        for bus_id, bus in buses.items():
            route_id = bus.get('route_id')
            if route_id:
                route_counts[route_id] = route_counts.get(route_id, 0) + 1
        
        route_details = [
            {"route_id": route_id, "bus_count": count}
            for route_id, count in route_counts.items()
        ]
        
        return jsonify({"routes": route_details, "count": len(route_details)})
        
    except Exception as e:
        logger.error(f"Get routes error: {e}")
        return jsonify({"error": "Failed to fetch routes"}), 500


@app.route("/api/fleet/statistics", methods=["GET"])
def get_statistics():
    """Get detailed fleet statistics"""
    if firebase_db is None:
        return jsonify({"error": "Database not available"}), 503
    
    try:
        buses = buses_ref.get() or {}
        
        # Speed distribution
        speed_ranges = [
            {"label": "0-20 km/h", "min": 0, "max": 20},
            {"label": "20-40 km/h", "min": 20, "max": 40},
            {"label": "40-60 km/h", "min": 40, "max": 60},
            {"label": "60-80 km/h", "min": 60, "max": 80},
            {"label": "80+ km/h", "min": 80, "max": 200}
        ]
        
        speed_distribution = []
        for range_info in speed_ranges:
            count = 0
            for bus_id, bus in buses.items():
                speed = bus.get('safe_speed', 0)
                if range_info["min"] <= speed < range_info["max"]:
                    count += 1
            speed_distribution.append({
                "range": range_info["label"],
                "count": count
            })
        
        # Hourly telemetry count for today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        all_telemetry = telemetry_ref.get() or {}
        
        hourly_counts = {}
        hourly_speeds = {}
        
        for telemetry_id, record in all_telemetry.items():
            if record.get('timestamp'):
                try:
                    timestamp = datetime.fromisoformat(record['timestamp'])
                    if timestamp >= today_start:
                        hour = timestamp.hour
                        hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
                        
                        if hour not in hourly_speeds:
                            hourly_speeds[hour] = []
                        if record.get('safe_speed'):
                            hourly_speeds[hour].append(record['safe_speed'])
                except:
                    pass
        
        hourly_telemetry = []
        for hour in sorted(hourly_counts.keys()):
            avg_speed = sum(hourly_speeds[hour]) / len(hourly_speeds[hour]) if hourly_speeds.get(hour) else 0
            hourly_telemetry.append({
                "hour": hour,
                "count": hourly_counts[hour],
                "avg_speed": round(avg_speed, 1)
            })
        
        return jsonify({
            "speed_distribution": speed_distribution,
            "hourly_telemetry": hourly_telemetry,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Get statistics error: {e}")
        return jsonify({"error": "Failed to fetch statistics"}), 500


# ========================
# WEBSOCKET EVENTS
# ========================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info("Client connected to WebSocket")
    emit('connected', {'message': 'Connected to Smart Bus Fleet System'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info("Client disconnected from WebSocket")


@socketio.on('subscribe_updates')
def handle_subscribe():
    """Subscribe to real-time bus updates"""
    logger.info("Client subscribed to bus updates")
    emit('subscribed', {'message': 'Subscribed to real-time updates'})


# ========================
# HEALTH & STATUS ENDPOINTS
# ========================

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    db_status = "connected" if firebase_db is not None else "disconnected"
    model_status = "loaded" if model is not None else "not loaded"
    
    return jsonify({
        "status": "healthy",
        "database": db_status,
        "model": model_status,
        "timestamp": datetime.now().isoformat()
    })


@app.route("/", methods=["GET"])
def home():
    """Home endpoint"""
    return jsonify({
        "name": "Smart Bus Safe Speed Prediction & Fleet Management System",
        "version": "1.0.0",
        "endpoints": {
            "ESP32": {
                "POST /predict": "Get safe speed prediction"
            },
            "Fleet Management": {
                "GET /api/fleet/overview": "Fleet overview statistics",
                "GET /api/fleet/buses": "List all buses",
                "GET /api/fleet/buses/<vehicle_id>": "Get bus details",
                "GET /api/fleet/buses/<vehicle_id>/history": "Get bus telemetry history",
                "GET /api/fleet/map-data": "Get data for map visualization",
                "GET /api/fleet/routes": "Get all routes",
                "GET /api/fleet/statistics": "Get detailed statistics"
            }
        }
    })


# ========================
# MAIN
# ========================

if __name__ == "__main__":
    logger.info("Starting Smart Bus Fleet Management System...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
