#!/usr/bin/env python3
"""
Simple test script to verify MQTT connection and health monitoring
Run this to test the device health monitor independently
"""

import time
import sys

print("=" * 50)
print("CTB Device Health Monitor - Test Mode")
print("=" * 50)

try:
    from device_health_monitor import DeviceHealthMonitor
    print("✅ Health monitor module loaded")
except ImportError as e:
    print(f"❌ Failed to import health monitor: {e}")
    print("Make sure paho-mqtt and psutil are installed:")
    print("  pip install paho-mqtt psutil")
    sys.exit(1)

# Load config
import json
from pathlib import Path

config_path = 'device_config.json'
if Path(config_path).exists():
    with open(config_path) as f:
        config = json.load(f)
    print(f"\n📋 Config loaded from {config_path}")
    print(f"   MQTT Broker: {config.get('mqtt_broker', 'localhost')}:{config.get('mqtt_port', 1883)}")
    print(f"   Bus Number: {config.get('bus_number', 'Unknown')}")
    print(f"   Health Interval: {config.get('health_interval_seconds', 7200)}s")
else:
    print(f"\n⚠️ Config file not found: {config_path}")
    print("Creating default config...")
    config = {
        "mqtt_broker": "localhost",
        "mqtt_port": 1883,
        "bus_number": "TEST-001",
        "route_number": "TEST",
        "health_interval_seconds": 30
    }
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

# Create monitor with short interval for testing
print("\n🚀 Starting health monitor in TEST MODE (30s interval)...")
monitor = DeviceHealthMonitor(config_path=config_path)

# Override interval for testing
monitor.health_interval = 30

try:
    monitor.start()
    
    # Simulate detection system status
    monitor.update_detection_status(
        lane=True,
        objects=True,
        depth=True,
        camera=True
    )
    
    print("\n📡 Monitor running. Press Ctrl+C to stop.")
    print("   Check the dashboard at http://localhost:3000")
    print("\n   Sending health updates every 30 seconds...")
    
    # Keep running and show status
    while True:
        time.sleep(10)
        status = "🟢 Connected" if monitor.is_connected else "🔴 Disconnected"
        queue_size = monitor.offline_queue.size()
        print(f"   Status: {status} | Queue: {queue_size} messages")

except KeyboardInterrupt:
    print("\n\n🛑 Stopping...")
    monitor.stop()
    print("Done.")
