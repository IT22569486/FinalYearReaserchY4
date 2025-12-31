#!/usr/bin/env python3
"""
CTB Bus Device Health Monitor
Monitors device health and sends status via MQTT with offline queue support.
Designed for Raspberry Pi deployment with intermittent connectivity.

Compatible with Raspberry Pi OS (Debian-based)
"""

import json
import os
import time
import threading
import queue
import uuid
import platform
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MQTT client
MQTT_AVAILABLE = False
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    logger.warning("paho-mqtt not found. Install: pip install paho-mqtt")

# System monitoring
PSUTIL_AVAILABLE = False
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    logger.warning("psutil not found. Install: pip install psutil")


class OfflineQueue:
    """SQLite-based persistent queue for offline message storage"""
    
    def __init__(self, db_path='device_queue.db'):
        """Initialize the offline queue with SQLite persistence"""
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite database for message queue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS message_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0
                )
            ''')
            conn.commit()
            conn.close()
            logger.info(f"Offline queue initialized: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize queue DB: {e}")
    
    def enqueue(self, topic, payload):
        """Add message to queue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO message_queue (topic, payload, timestamp) VALUES (?, ?, ?)',
                (topic, json.dumps(payload), datetime.utcnow().isoformat())
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to enqueue message: {e}")
    
    def dequeue(self, limit=50):
        """Get pending messages from queue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'SELECT id, topic, payload, timestamp FROM message_queue ORDER BY id LIMIT ?',
                (limit,)
            )
            messages = cursor.fetchall()
            conn.close()
            return messages
        except Exception as e:
            logger.error(f"Failed to dequeue messages: {e}")
            return []
    
    def remove(self, message_id):
        """Remove successfully sent message from queue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM message_queue WHERE id = ?', (message_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to remove message: {e}")
    
    def size(self):
        """Get queue size"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM message_queue')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except Exception as e:
            logger.error(f"Failed to get queue size: {e}")
            return 0


class DeviceHealthMonitor:
    """
    Device Health Monitor for CTB Bus Systems
    Sends health status via MQTT with offline queue support
    """
    
    def __init__(self, device_key=None, config_path='device_config.json'):
        """
        Initialize the Device Health Monitor
        
        Args:
            device_key: Unique device key for this bus. Auto-generated if None.
            config_path: Path to configuration file
        """
        self.config_path = config_path
        self.config = self._load_config()
        
        # Device identification
        self.device_key = device_key or self.config.get('device_key') or self._generate_device_key()
        self.bus_number = self.config.get('bus_number', 'UNKNOWN')
        self.route_number = self.config.get('route_number', 'UNKNOWN')
        
        # MQTT settings
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_username = self.config.get('mqtt_username', '')
        self.mqtt_password = self.config.get('mqtt_password', '')
        self.mqtt_topic_base = self.config.get('mqtt_topic_base', 'ctb/bus')
        
        # Health check interval (default: 2 hours = 7200 seconds)
        self.health_interval = self.config.get('health_interval_seconds', 7200)
        
        # Initialize components
        self.offline_queue = OfflineQueue()
        self.mqtt_client = None
        self.is_connected = False
        self.running = False
        self._reconnect_delay = 5  # seconds
        
        # Detection system status (to be updated by main detection system)
        self.detection_status = {
            'lane_detection': False,
            'object_detection': False,
            'depth_estimation': False,
            'camera_active': False,
            'last_detection_time': None
        }
        
        # Save device key to config if newly generated
        if not self.config.get('device_key'):
            self.config['device_key'] = self.device_key
            self._save_config()
        
        self._setup_mqtt()
    
    def _load_config(self):
        """Load configuration from file"""
        if Path(self.config_path).exists():
            try:
                with open(self.config_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")
        return {}
    
    def _save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            logger.info(f"Config saved to {self.config_path}")
        except Exception as e:
            logger.warning(f"Failed to save config: {e}")
    
    def _generate_device_key(self):
        """Generate a unique device key"""
        # Use MAC address and UUID for uniqueness
        try:
            mac = uuid.getnode()
            unique_id = uuid.uuid4().hex[:8]
            return f"CTB-{mac:012x}-{unique_id}".upper()
        except:
            return f"CTB-{uuid.uuid4().hex[:16]}".upper()
    
    def _setup_mqtt(self):
        """Setup MQTT client"""
        if not MQTT_AVAILABLE:
            logger.error("MQTT not available. Messages will be queued locally.")
            return
        
        try:
            # Add process ID to client_id to allow multiple processes (e.g., main.py subprocess)
            import os
            unique_client_id = f"{self.device_key}-{os.getpid()}"
            self.mqtt_client = mqtt.Client(client_id=unique_client_id, protocol=mqtt.MQTTv311)
            
            if self.mqtt_username and self.mqtt_password:
                self.mqtt_client.username_pw_set(self.mqtt_username, self.mqtt_password)
            
            # Set callbacks
            self.mqtt_client.on_connect = self._on_connect
            self.mqtt_client.on_disconnect = self._on_disconnect
            self.mqtt_client.on_publish = self._on_publish
            
            # Set last will for offline detection
            will_topic = f"{self.mqtt_topic_base}/{self.device_key}/status"
            will_payload = json.dumps({
                'device_key': self.device_key,
                'status': 'offline',
                'timestamp': datetime.utcnow().isoformat()
            })
            self.mqtt_client.will_set(will_topic, will_payload, qos=1, retain=True)
            
            logger.info("MQTT client configured")
        except Exception as e:
            logger.error(f"Failed to setup MQTT client: {e}")
    
    def _on_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            logger.info(f"✅ Connected to MQTT broker: {self.mqtt_broker}:{self.mqtt_port}")
            self.is_connected = True
            self._reconnect_delay = 5  # Reset reconnect delay
            # Process queued messages
            self._process_queue()
            # Send online status
            self._send_status('online')
        else:
            error_messages = {
                1: "Incorrect protocol version",
                2: "Invalid client identifier",
                3: "Server unavailable",
                4: "Bad username or password",
                5: "Not authorized"
            }
            logger.error(f"❌ MQTT connection failed: {error_messages.get(rc, f'Unknown error {rc}')}")
            self.is_connected = False
    
    def _on_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        logger.warning(f"⚠️ Disconnected from MQTT broker (rc: {rc})")
        self.is_connected = False
    
    def _on_publish(self, client, userdata, mid):
        """MQTT publish callback"""
        pass  # Successfully published
    
    def _process_queue(self):
        """Process and send queued messages"""
        messages = self.offline_queue.dequeue()
        sent_count = 0
        for msg_id, topic, payload, timestamp in messages:
            try:
                payload_dict = json.loads(payload)
                payload_dict['queued_at'] = timestamp
                payload_dict['sent_at'] = datetime.utcnow().isoformat()
                
                result = self.mqtt_client.publish(
                    topic, 
                    json.dumps(payload_dict), 
                    qos=1
                )
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    self.offline_queue.remove(msg_id)
                    sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send queued message: {e}")
        
        if sent_count > 0:
            logger.info(f"📤 Sent {sent_count} queued messages")
    
    def _send_status(self, status):
        """Send device status (online/offline)"""
        topic = f"{self.mqtt_topic_base}/{self.device_key}/status"
        payload = {
            'device_key': self.device_key,
            'bus_number': self.bus_number,
            'route_number': self.route_number,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        }
        self._publish(topic, payload, retain=True)
    
    def publish_message(self, topic, payload, retain=False):
        """Public method to publish custom messages"""
        return self._publish(topic, payload, retain)
    
    def _publish(self, topic, payload, retain=False):
        """Publish message with offline queue fallback"""
        if self.is_connected and self.mqtt_client:
            try:
                result = self.mqtt_client.publish(
                    topic, 
                    json.dumps(payload), 
                    qos=1, 
                    retain=retain
                )
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    return True
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")
        
        # Queue message for later
        self.offline_queue.enqueue(topic, payload)
        logger.info(f"📥 Message queued (Queue size: {self.offline_queue.size()})")
        return False
    
    def get_system_health(self):
        """Collect system health metrics"""
        health = {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'temperature': None,
            'uptime_seconds': 0,
            'platform': platform.system(),
            'platform_release': platform.release(),
            'python_version': platform.python_version()
        }
        
        if PSUTIL_AVAILABLE:
            try:
                health['cpu_percent'] = psutil.cpu_percent(interval=1)
                health['memory_percent'] = psutil.virtual_memory().percent
                health['disk_percent'] = psutil.disk_usage('/').percent
                health['uptime_seconds'] = int(time.time() - psutil.boot_time())
                
                # Try to get CPU temperature (Raspberry Pi)
                try:
                    temps = psutil.sensors_temperatures()
                    if 'cpu_thermal' in temps:
                        health['temperature'] = temps['cpu_thermal'][0].current
                    elif 'cpu-thermal' in temps:
                        health['temperature'] = temps['cpu-thermal'][0].current
                    elif temps:
                        # Get first available temperature
                        for name, entries in temps.items():
                            if entries:
                                health['temperature'] = entries[0].current
                                break
                except Exception:
                    # Try Raspberry Pi specific file
                    try:
                        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                            health['temperature'] = float(f.read().strip()) / 1000.0
                    except:
                        pass
            except Exception as e:
                logger.error(f"Error collecting system health: {e}")
        
        return health
    
    def update_detection_status(self, lane=None, objects=None, depth=None, camera=None):
        """
        Update detection system status (called by main detection system)
        
        Args:
            lane: Lane detection active status
            objects: Object detection active status  
            depth: Depth estimation active status
            camera: Camera active status
        """
        if lane is not None:
            self.detection_status['lane_detection'] = lane
        if objects is not None:
            self.detection_status['object_detection'] = objects
        if depth is not None:
            self.detection_status['depth_estimation'] = depth
        if camera is not None:
            self.detection_status['camera_active'] = camera
        
        self.detection_status['last_detection_time'] = datetime.utcnow().isoformat()
    
    def send_health_update(self):
        """Send comprehensive health update"""
        system_health = self.get_system_health()
        
        topic = f"{self.mqtt_topic_base}/{self.device_key}/health"
        payload = {
            'device_key': self.device_key,
            'bus_number': self.bus_number,
            'route_number': self.route_number,
            'timestamp': datetime.utcnow().isoformat(),
            'system': system_health,
            'detection': self.detection_status,
            'queue_size': self.offline_queue.size(),
            'mqtt_connected': self.is_connected
        }
        
        self._publish(topic, payload)
        logger.info(f"📊 Health update sent for {self.device_key}")
    
    def send_violation(self, violation_type, details=None):
        """
        Send violation event
        
        Args:
            violation_type: Type of violation (e.g., 'SLOW_DRIVING', 'UNSAFE_DISTANCE')
            details: Additional violation details (severity, description, etc.)
        """
        topic = f"{self.mqtt_topic_base}/{self.device_key}/violation"
        payload = {
            'device_key': self.device_key,
            'bus_number': self.bus_number,
            'route_number': self.route_number,
            'timestamp': datetime.utcnow().isoformat(),
            'type': violation_type,  # Backend expects 'type' not 'violation_type'
            'details': details or {}
        }
        
        self._publish(topic, payload)
        logger.info(f"🚨 Violation reported: {violation_type}")
    
    def connect(self):
        """Connect to MQTT broker"""
        if not self.mqtt_client:
            return False
        
        try:
            logger.info(f"Connecting to MQTT broker {self.mqtt_broker}:{self.mqtt_port}...")
            self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, keepalive=60)
            self.mqtt_client.loop_start()
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to MQTT broker: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.mqtt_client:
            self._send_status('offline')
            time.sleep(0.5)  # Allow time for message to send
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
    
    def _health_loop(self):
        """Background thread for periodic health updates"""
        while self.running:
            try:
                self.send_health_update()
                
                # Process queue if connected
                if self.is_connected:
                    self._process_queue()
                else:
                    # Try to reconnect with exponential backoff
                    logger.info(f"Attempting reconnect in {self._reconnect_delay}s...")
                    time.sleep(self._reconnect_delay)
                    self.connect()
                    self._reconnect_delay = min(self._reconnect_delay * 2, 300)  # Max 5 min
                
            except Exception as e:
                logger.error(f"Health loop error: {e}")
            
            # Wait for next interval
            for _ in range(int(self.health_interval)):
                if not self.running:
                    break
                time.sleep(1)
    
    def start(self):
        """Start the health monitor"""
        logger.info("=" * 50)
        logger.info("🚌 Starting CTB Device Health Monitor")
        logger.info(f"   Device Key: {self.device_key}")
        logger.info(f"   Bus Number: {self.bus_number}")
        logger.info(f"   Route: {self.route_number}")
        logger.info(f"   MQTT Broker: {self.mqtt_broker}:{self.mqtt_port}")
        logger.info(f"   Health Interval: {self.health_interval} seconds")
        logger.info("=" * 50)
        
        self.running = True
        self.connect()
        
        # Start health update thread
        self.health_thread = threading.Thread(target=self._health_loop, daemon=True)
        self.health_thread.start()
        
        # Send initial health update after short delay to allow connection
        time.sleep(2)
        self.send_health_update()
    
    def stop(self):
        """Stop the health monitor"""
        logger.info("Stopping health monitor...")
        self.running = False
        self.disconnect()


# Singleton instance for use by main detection system
_health_monitor = None

def get_health_monitor(device_key=None, config_path='device_config.json'):
    """Get or create the health monitor singleton"""
    global _health_monitor
    if _health_monitor is None:
        _health_monitor = DeviceHealthMonitor(device_key, config_path)
    return _health_monitor


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='CTB Bus Device Health Monitor')
    parser.add_argument('--device-key', type=str, help='Unique device key')
    parser.add_argument('--broker', type=str, default='localhost', help='MQTT broker address')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--interval', type=int, default=7200, help='Health update interval (seconds)')
    parser.add_argument('--bus', type=str, default='TEST-001', help='Bus number')
    parser.add_argument('--route', type=str, default='TEST', help='Route number')
    parser.add_argument('--test', action='store_true', help='Run in test mode with 10s interval')
    
    args = parser.parse_args()
    
    # Create config
    config = {
        'mqtt_broker': args.broker,
        'mqtt_port': args.port,
        'health_interval_seconds': 10 if args.test else args.interval,
        'bus_number': args.bus,
        'route_number': args.route
    }
    
    if args.device_key:
        config['device_key'] = args.device_key
    
    # Save config
    with open('device_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    # Start monitor
    monitor = DeviceHealthMonitor(config_path='device_config.json')
    
    try:
        monitor.start()
        
        # Keep running
        while True:
            time.sleep(10)
            
            # Simulate detection status updates
            monitor.update_detection_status(
                lane=True, 
                objects=True, 
                depth=True, 
                camera=True
            )
            
    except KeyboardInterrupt:
        print("\nShutting down...")
        monitor.stop()
