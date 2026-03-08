#!/usr/bin/env python3
"""
Safe Speed Monitoring Component for Raspberry Pi
Replaces ESP32 firmware - runs ML prediction locally, publishes via MQTT

This component:
1. Simulates bus route GPS data (or reads from GPS module)
2. Fetches weather data from OpenWeatherMap
3. Runs LightGBM safe speed prediction locally
4. Publishes telemetry + predicted safe speed via MQTT to backend
5. Receives commands via MQTT

Original ESP32 system by Sachith - adapted for Raspberry Pi by integration.
"""

import json
import math
import os
import sys
import time
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from functools import lru_cache

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SafeSpeedMonitor')

# Try to import ML dependencies
try:
    import pandas as pd
    import joblib
    import requests
    ML_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ML dependencies not available: {e}")
    ML_AVAILABLE = False

# Try to import MQTT
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    logger.warning("paho-mqtt not available")
    MQTT_AVAILABLE = False

# Component directory
COMPONENT_DIR = Path(__file__).parent.absolute()
DEVICE_DIR = COMPONENT_DIR.parent.absolute()

# Add device dir for shared imports
if str(DEVICE_DIR) not in sys.path:
    sys.path.insert(0, str(DEVICE_DIR))

from shared.config import DeviceConfig

# Route endpoints for direction determination
ROUTE_ENDPOINTS = {
    "177_Kaduwela_Kollupitiya": {
        "start": (6.936372181, 79.98325019),  # Kaduwela
        "end": (6.91145983, 79.86845281)       # Kollupitiya
    }
}


class SafeSpeedMonitor:
    """
    Safe Speed Monitoring for Raspberry Pi
    Replaces ESP32 + Flask backend combo with local ML prediction + MQTT.
    All config loaded from shared device_config.json via DeviceConfig.
    """

    def __init__(self, config_path=None):
        # Shared config
        self._device_cfg = DeviceConfig(config_path)

        # Vehicle / route info from shared config
        self.vehicle_id = self._device_cfg.vehicle_id
        self.route_id = self._device_cfg.route_id
        self.bus_number = self._device_cfg.bus_number

        # MQTT from shared config
        self.mqtt_broker = self._device_cfg.mqtt_broker
        self.mqtt_port = self._device_cfg.mqtt_port
        self.device_key = self._device_cfg.device_key
        self.mqtt_topic_base = self._device_cfg.mqtt_topic_base

        # Weather API
        self.openweather_api_key = self._device_cfg.openweather_api_key or os.environ.get('OPENWEATHER_API_KEY', '')

        # Intervals
        self.send_interval = self._device_cfg.send_interval

        # Real-time data from ESP32 (updated via MQTT telemetry)
        self.latitude = 0.0
        self.longitude = 0.0
        self.speed = 0.0
        self.gps_valid = False
        self.passenger_count = 0
        self.passenger_load_kg = 0.0
        self.has_new_data = False
        self._data_lock = threading.Lock()

        # Trip tracking
        self.trip_start_location = {}

        # ML Model
        self.model = None
        self.label_encoders = None
        self._load_ml_model()

        # MQTT client
        self.mqtt_client = None
        self.is_connected = False
        self.running = False

        # Last predicted safe speed
        self.safe_speed = 0.0
        self.location_name = "Unknown"
        self.road_condition = "Dry"

    def _load_ml_model(self):
        """Load LightGBM safe speed prediction model"""
        if not ML_AVAILABLE:
            logger.warning("ML dependencies not available - predictions will use fallback")
            return

        # Look for model files
        model_locations = [
            COMPONENT_DIR / 'models',
            COMPONENT_DIR,
        ]

        model_path = None
        encoders_path = None
        for loc in model_locations:
            mp = loc / 'lightgbm_safe_speed_model.pkl'
            ep = loc / 'label_encoders.pkl'
            if mp.exists() and ep.exists():
                model_path = mp
                encoders_path = ep
                break

        if model_path and encoders_path:
            try:
                self.model = joblib.load(str(model_path))
                self.label_encoders = joblib.load(str(encoders_path))
                logger.info(f"ML model loaded from {model_path.parent}")
            except Exception as e:
                logger.error(f"Failed to load ML model: {e}")
        else:
            logger.warning("ML model files not found. Copy lightgbm_safe_speed_model.pkl "
                         "and label_encoders.pkl to device/safe_speed_monitoring/models/")
            logger.warning("Predictions will use fallback speed of 40 km/h")

    def _setup_mqtt(self):
        """Setup MQTT client"""
        if not MQTT_AVAILABLE:
            logger.error("MQTT not available")
            return

        try:
            pid = os.getpid()
            client_id = f"{self.device_key}-safespeed-{pid}"
            self.mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1, client_id=client_id, protocol=mqtt.MQTTv311)

            self.mqtt_client.on_connect = self._on_connect
            self.mqtt_client.on_disconnect = self._on_disconnect
            self.mqtt_client.on_message = self._on_message

            # Last will
            will_topic = f"{self.mqtt_topic_base}/{self.device_key}/safespeed/status"
            will_payload = json.dumps({
                'device_key': self.device_key,
                'status': 'offline',
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            self.mqtt_client.will_set(will_topic, will_payload, qos=1, retain=True)

            logger.info("MQTT client configured for safe speed monitoring")
        except Exception as e:
            logger.error(f"Failed to setup MQTT: {e}")

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Connected to MQTT broker: {self.mqtt_broker}:{self.mqtt_port}")
            self.is_connected = True
            # Subscribe to commands
            cmd_topic = f"{self.mqtt_topic_base}/{self.device_key}/safespeed/command"
            client.subscribe(cmd_topic)
            # Subscribe to ESP32 telemetry to get real sensor data
            telemetry_topic = f"bus/{self.vehicle_id}/telemetry"
            client.subscribe(telemetry_topic)
            # Subscribe to ESP32 bus stop data
            stop_data_topic = f"bus/{self.vehicle_id}/stop-data"
            client.subscribe(stop_data_topic)
            logger.info(f"Subscribed to ESP32 topics: {telemetry_topic}, {stop_data_topic}")
            # Publish online status
            self._publish_status('online')
        else:
            logger.error(f"MQTT connection failed (rc={rc})")
            self.is_connected = False

    def _on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT (rc={rc})")
        self.is_connected = False

    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT commands and ESP32 sensor data"""
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic

            # Handle ESP32 telemetry - update GPS, passenger count and weight from real sensors
            if '/telemetry' in topic and 'bus/' in topic:
                with self._data_lock:
                    if 'latitude' in payload and 'longitude' in payload:
                        self.latitude = float(payload['latitude'])
                        self.longitude = float(payload['longitude'])
                    if 'speed' in payload:
                        self.speed = float(payload['speed'])
                    if 'gps_valid' in payload:
                        self.gps_valid = bool(payload['gps_valid'])
                    if 'total_passenger_count' in payload:
                        self.passenger_count = int(payload['total_passenger_count'])
                    elif 'passenger_count' in payload:
                        self.passenger_count = int(payload['passenger_count'])
                    if 'total_weight' in payload:
                        self.passenger_load_kg = float(payload['total_weight'])
                    self.has_new_data = True
                logger.info(
                    f"ESP32 telemetry: lat={self.latitude:.6f}, lon={self.longitude:.6f}, "
                    f"speed={self.speed:.1f}, in={payload.get('passenger_in_count', 0)}, "
                    f"out={payload.get('passenger_out_count', 0)}, "
                    f"total={self.passenger_count}, weight={self.passenger_load_kg:.0f}kg"
                )
                return

            # Handle ESP32 bus stop data - update from real stop sensor data
            if '/stop-data' in topic and 'bus/' in topic:
                if 'total_passenger_count' in payload:
                    self.passenger_count = payload['total_passenger_count']
                if 'load_cell_weight' in payload:
                    self.passenger_load_kg = payload['load_cell_weight']
                logger.info(
                    f"ESP32 stop data: in={payload.get('passenger_in_count', 0)}, "
                    f"out={payload.get('passenger_out_count', 0)}, "
                    f"total={self.passenger_count}, weight={self.passenger_load_kg}kg"
                )
                return

            # Handle safespeed commands
            command = payload.get('command', '')
            logger.info(f"Received command: {command}")

            if command == 'reset_trip':
                self.trip_start_location.clear()
                self.current_stop_index = 0
                logger.info("Trip reset")
            elif command == 'update_passengers':
                self.passenger_count = payload.get('count', self.passenger_count)
                self.passenger_load_kg = payload.get('load_kg', self.passenger_load_kg)
                logger.info(f"Passengers updated: {self.passenger_count} ({self.passenger_load_kg} kg)")
        except Exception as e:
            logger.error(f"Error handling message: {e}")

    def _publish_status(self, status):
        topic = f"{self.mqtt_topic_base}/{self.device_key}/safespeed/status"
        payload = {
            'device_key': self.device_key,
            'vehicle_id': self.vehicle_id,
            'status': status,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        self._publish(topic, payload, retain=True)

    def _publish(self, topic, payload, retain=False):
        if self.is_connected and self.mqtt_client:
            try:
                result = self.mqtt_client.publish(
                    topic,
                    json.dumps(payload),
                    qos=1,
                    retain=retain
                )
                return result.rc == mqtt.MQTT_ERR_SUCCESS
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")
        return False

    # ========================================================================
    # HELPER FUNCTIONS (ported from partner's Flask backend)
    # ========================================================================

    @staticmethod
    def haversine_distance(coord1, coord2):
        """Calculate distance between two GPS coordinates in km"""
        R = 6371
        lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
        lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def determine_direction(self, vehicle_id, lat, lon):
        """Determine travel direction based on trip start location"""
        if vehicle_id not in self.trip_start_location:
            self.trip_start_location[vehicle_id] = (lat, lon)

        start = self.trip_start_location[vehicle_id]
        endpoints = ROUTE_ENDPOINTS.get(self.route_id,
                                        ROUTE_ENDPOINTS["177_Kaduwela_Kollupitiya"])

        if self.haversine_distance(start, endpoints["start"]) < \
           self.haversine_distance(start, endpoints["end"]):
            return "Kaduwela_to_Kollupitiya"
        else:
            return "Kollupitiya_to_Kaduwela"

    def reverse_geocode(self, lat, lon):
        """Reverse geocode GPS coordinates to location name"""
        lat_r = round(lat, 3)
        lon_r = round(lon, 3)
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat_r}&lon={lon_r}&format=json"
            headers = {"User-Agent": "SmartBusFleetSystem/1.0"}
            r = requests.get(url, headers=headers, timeout=5)
            r.raise_for_status()
            data = r.json()
            addr = data.get("address", {})
            return (addr.get("suburb") or addr.get("neighbourhood") or
                    addr.get("town") or addr.get("city") or "Unknown")
        except Exception as e:
            logger.warning(f"Geocoding error: {e}")
            return "Unknown"

    def get_weather(self, lat, lon):
        """Get weather data from OpenWeatherMap"""
        if not self.openweather_api_key:
            return 30.0, 75.0, 0.0

        lat_r = round(lat, 2)
        lon_r = round(lon, 2)
        try:
            url = (f"https://api.openweathermap.org/data/2.5/weather"
                   f"?lat={lat_r}&lon={lon_r}&appid={self.openweather_api_key}&units=metric")
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

    @staticmethod
    def map_rain_intensity(rain_mm):
        if rain_mm == 0:
            return 0
        elif rain_mm < 2:
            return 1
        return 2

    @staticmethod
    def infer_road_condition(rain_intensity, humidity):
        return 1 if (rain_intensity > 0 or humidity >= 80) else 0

    @staticmethod
    def get_road_condition_label(condition):
        return "Wet" if condition == 1 else "Dry"

    def safe_encode(self, col, value):
        """Safely encode categorical values for ML model"""
        if self.label_encoders is None:
            return 0
        enc = self.label_encoders.get(col)
        if enc is None:
            return 0
        return int(enc.transform([value])[0]) if value in enc.classes_ else 0

    # ========================================================================
    # PREDICTION
    # ========================================================================

    def predict_safe_speed(self, lat, lon, passenger_count, passenger_load_kg):
        """
        Predict safe speed using LightGBM model
        Returns dict with safe_speed and derived features
        """
        # Derive features
        direction = self.determine_direction(self.vehicle_id, lat, lon)
        location_name = self.reverse_geocode(lat, lon)
        temp, humidity, rain_mm = self.get_weather(lat, lon)

        rain_intensity = self.map_rain_intensity(rain_mm)
        road_condition = self.infer_road_condition(rain_intensity, humidity)
        road_condition_label = self.get_road_condition_label(road_condition)

        now = datetime.now()
        hour = now.hour
        day = now.weekday()
        month = now.month
        is_weekend = 1 if day >= 5 else 0
        is_peak = 1 if (7 <= hour <= 9 or 16 <= hour <= 19) else 0
        season = 0 if month in [12, 1, 2] else 1

        # Predict
        safe_speed = 40.0  # Default fallback
        if self.model is not None and ML_AVAILABLE:
            try:
                df = pd.DataFrame([{
                    "vehicle_id": self.vehicle_id,
                    "route_id": self.route_id,
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

                for col in ["vehicle_id", "route_id", "direction", "location_name"]:
                    df[col] = df[col].apply(lambda x, c=col: self.safe_encode(c, x))

                safe_speed = round(float(self.model.predict(df)[0]), 1)
            except Exception as e:
                logger.error(f"Prediction error: {e}")
                safe_speed = 40.0

        return {
            "safe_speed": safe_speed,
            "vehicle_id": self.vehicle_id,
            "route_id": self.route_id,
            "latitude": lat,
            "longitude": lon,
            "location_name": location_name,
            "direction": direction,
            "road_condition": road_condition_label,
            "passenger_count": passenger_count,
            "passenger_load_kg": passenger_load_kg,
            "temperature": temp,
            "humidity": humidity,
            "timestamp": now.isoformat(),
            "status": "online"
        }

    # ========================================================================
    # MAIN LOOP
    # ========================================================================

    def publish_telemetry(self, data):
        """Publish telemetry data via MQTT"""
        topic = f"{self.mqtt_topic_base}/{self.device_key}/safespeed/telemetry"
        self._publish(topic, data)

        # Publish safe speed to the ESP32's subscribed topic: bus/{vehicle_id}/safe-speed
        esp32_topic = f"bus/{self.vehicle_id}/safe-speed"
        esp32_payload = {
            'safe_speed': data.get('safe_speed', 40),
            'location_name': data.get('location_name', 'Unknown'),
            'road_condition': data.get('road_condition', 'Dry'),
            'direction': data.get('direction', ''),
            'passenger_count': data.get('passenger_count', 0),
            'timestamp': data.get('timestamp', datetime.now(timezone.utc).isoformat())
        }
        self._publish(esp32_topic, esp32_payload)
        logger.info(f"   📡 Published safe speed {data.get('safe_speed')} to {esp32_topic}")

        # Also update the component status
        component_topic = f"{self.mqtt_topic_base}/{self.device_key}/component"
        self._publish(component_topic, {
            'component': 'Safe Speed Monitoring',
            'status': 'running',
            'details': {
                'safe_speed': data.get('safe_speed', 0),
                'location': data.get('location_name', 'Unknown'),
                'passengers': data.get('passenger_count', 0)
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    def run(self):
        """Main monitoring loop"""
        logger.info("=" * 60)
        logger.info("SAFE SPEED MONITORING - Starting")
        logger.info(f"  Vehicle: {self.vehicle_id}")
        logger.info(f"  Route: {self.route_id}")
        logger.info(f"  Bus: {self.bus_number}")
        logger.info(f"  Model: {'Loaded' if self.model else 'Fallback (40 km/h)'}")
        logger.info(f"  MQTT: {self.mqtt_broker}:{self.mqtt_port}")
        logger.info(f"  Send Interval: {self.send_interval}s")
        logger.info("=" * 60)

        # Setup MQTT
        self._setup_mqtt()
        self.running = True

        # Connect
        if self.mqtt_client:
            try:
                self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, keepalive=60)
                self.mqtt_client.loop_start()
                time.sleep(2)  # Wait for connection
            except Exception as e:
                logger.error(f"Failed to connect to MQTT: {e}")

        try:
            while self.running:
                # Use real data from ESP32 telemetry
                with self._data_lock:
                    has_data = self.has_new_data
                    lat = self.latitude
                    lon = self.longitude
                    speed = self.speed
                    gps_valid = self.gps_valid
                    passengers = self.passenger_count
                    weight = self.passenger_load_kg
                    self.has_new_data = False

                if not has_data or not gps_valid or (lat == 0.0 and lon == 0.0):
                    logger.debug("Waiting for ESP32 telemetry data...")
                    time.sleep(2)
                    continue

                logger.info(f"📍 GPS: ({lat:.6f}, {lon:.6f}) Speed: {speed:.1f} km/h")
                logger.info(f"   Passengers: {passengers} ({weight:.0f} kg)")

                # Predict safe speed
                data = self.predict_safe_speed(lat, lon, passengers, weight)

                self.safe_speed = data['safe_speed']
                self.location_name = data['location_name']
                self.road_condition = data['road_condition']

                logger.info(f"   🚌 Safe Speed: {self.safe_speed} km/h")
                logger.info(f"   📍 Location: {self.location_name}")
                logger.info(f"   🛣️  Road: {self.road_condition}")
                logger.info(f"   🧭 Direction: {data['direction']}")

                # Publish via MQTT
                if self.is_connected:
                    self.publish_telemetry(data)
                    logger.info(f"   ✅ Published to MQTT")
                else:
                    logger.warning(f"   ⚠️ MQTT not connected - data not sent")

                # Wait for next telemetry cycle
                time.sleep(self.send_interval)

        except KeyboardInterrupt:
            logger.info("\nStopping safe speed monitor...")
        finally:
            self.running = False
            if self.mqtt_client:
                self._publish_status('offline')
                time.sleep(0.5)
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            logger.info("Safe speed monitor stopped")


def main():
    """Entry point for the safe speed monitoring component"""
    monitor = SafeSpeedMonitor()
    monitor.run()


if __name__ == '__main__':
    main()
