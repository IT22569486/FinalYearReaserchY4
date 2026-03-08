"""
MQTT Service - Handles MQTT broker connection and message processing
"""
import json
import asyncio
import logging
from datetime import datetime
from typing import Callable
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class MQTTService:
    """MQTT client service for bus tracking"""
    
    def __init__(
        self,
        broker: str,
        port: int = 1883,
        username: str = None,
        password: str = None,
        client_id: str = 'bus_tracking_backend'
    ):
        self.broker = broker
        self.port = port
        self.username = username
        self.password = password
        self.client_id = client_id
        
        self.client = None
        self.connected = False
        
        # Callback handlers
        self._on_gps_message: Callable = None
        self._on_passenger_message: Callable = None
        self._on_stop_data_message: Callable = None
        self._on_connect_callback: Callable = None
        
    def set_handlers(
        self,
        on_gps: Callable = None,
        on_passenger: Callable = None,
        on_stop_data: Callable = None,
        on_connect: Callable = None
    ):
        """Set message handlers"""
        self._on_gps_message = on_gps
        self._on_passenger_message = on_passenger
        self._on_stop_data_message = on_stop_data
        self._on_connect_callback = on_connect
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client = mqtt.Client(
                client_id=self.client_id,
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2
            )
            
            # Set credentials if provided
            if self.username:
                self.client.username_pw_set(self.username, self.password)
            
            # Set callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            
            # Connect
            logger.info(f"Connecting to MQTT broker at {self.broker}:{self.port}")
            self.client.connect(self.broker, self.port, keepalive=60)
            
            # Start loop in background thread
            self.client.loop_start()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
            logger.info("Disconnected from MQTT broker")
    
    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        """Callback when connected to broker"""
        if reason_code == 0:
            self.connected = True
            logger.info("Connected to MQTT broker successfully")
            
            # Subscribe to topics
            self._subscribe_to_topics()
            
            # Call custom callback
            if self._on_connect_callback:
                self._on_connect_callback()
        else:
            logger.error(f"MQTT connection failed with code: {reason_code}")
    
    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        """Callback when disconnected from broker"""
        self.connected = False
        logger.warning(f"Disconnected from MQTT broker: {reason_code}")
        
        # Attempt reconnection
        if reason_code != 0:
            logger.info("Attempting to reconnect...")
    
    def _subscribe_to_topics(self):
        """Subscribe to bus tracking topics"""
        topics = [
            ('bus/+/telemetry', 0),  # ESP32 v8 telemetry (GPS + passengers + weight)
            ('bus/+/gps', 0),        # Legacy GPS topic
            ('bus/+/passenger', 0),  # Legacy passenger topic
            ('bus/+/stop-data', 0)   # Bus stop sensor data (sent when bus starts moving)
        ]
        
        for topic, qos in topics:
            self.client.subscribe(topic, qos)
            logger.info(f"Subscribed to topic: {topic}")
    
    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode('utf-8'))
            
            logger.debug(f"Received message on {topic}: {payload}")
            
            # Extract bus_id from topic: bus/{bus_id}/gps or bus/{bus_id}/passenger
            parts = topic.split('/')
            if len(parts) >= 3:
                bus_id = parts[1]
                message_type = parts[2]
                
                # Add bus_id to payload if not present
                if 'bus_id' not in payload:
                    payload['bus_id'] = bus_id
                
                # Route to appropriate handler
                if message_type == 'telemetry' and self._on_gps_message:
                    # Telemetry contains GPS + passenger data combined
                    asyncio.run(self._on_gps_message(bus_id, payload))
                elif message_type == 'gps' and self._on_gps_message:
                    asyncio.run(self._on_gps_message(bus_id, payload))
                elif message_type == 'passenger' and self._on_passenger_message:
                    asyncio.run(self._on_passenger_message(bus_id, payload))
                elif message_type == 'stop-data' and self._on_stop_data_message:
                    asyncio.run(self._on_stop_data_message(bus_id, payload))
                    
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON payload: {e}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def publish(self, topic: str, payload: dict, qos: int = 0, retain: bool = False):
        """Publish message to MQTT topic"""
        try:
            if not self.connected:
                logger.warning("Cannot publish - not connected to broker")
                return False
            
            message = json.dumps(payload)
            result = self.client.publish(topic, message, qos=qos, retain=retain)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Published to {topic}: {payload}")
                return True
            else:
                logger.error(f"Failed to publish to {topic}: {result.rc}")
                return False
                
        except Exception as e:
            logger.error(f"Error publishing message: {e}")
            return False
    
    def send_command(self, bus_id: str, command: dict):
        """Send command to a specific bus"""
        topic = f"bus/{bus_id}/commands"
        return self.publish(topic, command)
    
    def send_safe_speed_update(self, bus_id: str, safe_speed: float, location_name: str = None):
        """Send safe speed update to bus"""
        command = {
            'safe_speed': safe_speed,
            'timestamp': datetime.utcnow().isoformat()
        }
        if location_name:
            command['location_name'] = location_name
        
        return self.send_command(bus_id, command)
