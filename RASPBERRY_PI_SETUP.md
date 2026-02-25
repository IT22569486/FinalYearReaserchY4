# Raspberry Pi Device Setup Guide

Complete guide for setting up the CTB Bus Monitoring device on a Raspberry Pi.

---

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Raspberry Pi** | Pi 3B+ | Pi 4 (4GB RAM) |
| **Storage** | 16GB microSD | 32GB+ microSD (Class 10) |
| **Camera** | USB webcam | Pi Camera Module v2 / USB camera |
| **GPS Module** | USB GPS (optional) | u-blox NEO-6M / NEO-M8N |
| **Power Supply** | 5V 2.5A | 5V 3A (official Pi PSU) |
| **Internet** | Wi-Fi / Ethernet | 4G USB dongle for mobile connectivity |
| **Case** | Any | Ventilated case or heatsink case |

> **Note**: The safe speed monitoring component works without a camera or GPS hardware by using simulated route data. Camera is needed only for the Context Aware Monitoring (ADAS) component.

---

## Step 1: Prepare the Raspberry Pi OS

### Flash the OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choose **Raspberry Pi OS (64-bit)** — Debian Bookworm
3. Click the gear icon to pre-configure:
   - Enable SSH
   - Set username/password
   - Configure Wi-Fi
   - Set locale/timezone
4. Flash to your microSD card
5. Insert card and boot the Pi

### Initial Setup

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y python3-pip python3-venv git libatlas-base-dev \
    libhdf5-dev libopencv-dev libgl1-mesa-glx libglib2.0-0

# Check Python version (needs 3.8+)
python3 --version
```

---

## Step 2: Clone the Project

```bash
# Clone the repository
cd ~
git clone <your-repo-url> Final_reserch_stucture
cd Final_reserch_stucture/device
```

Or if transferring files manually:

```bash
# From your PC, copy the device folder to Pi via SCP
scp -r device/ pi@<pi-ip-address>:~/Final_reserch_stucture/device/
```

---

## Step 3: Set Up Python Environment

```bash
cd ~/Final_reserch_stucture/device

# Create virtual environment
python3 -m venv device_venv

# Activate it
source device_venv/bin/activate

# Install base requirements
pip install --upgrade pip
pip install -r requirements.txt

# Install safe speed monitoring dependencies
pip install lightgbm pandas joblib requests
```

### Dependency List

| Package | Purpose | Required For |
|---------|---------|-------------|
| `paho-mqtt` | MQTT client | All components |
| `psutil` | System monitoring | Health monitor |
| `lightgbm` | ML safe speed model | Safe Speed Monitoring |
| `pandas` | Data processing | Safe Speed Monitoring |
| `joblib` | Model loading | Safe Speed Monitoring |
| `requests` | Weather API calls | Safe Speed Monitoring |
| `opencv-python` | Computer vision | Context Aware Monitoring |
| `ultralytics` | YOLOv8 inference | Context Aware Monitoring |
| `onnxruntime` | Depth estimation | Context Aware Monitoring |
| `numpy` | Numerical ops | All components |

> **Tip for Pi 3**: If `lightgbm` fails to install, try: `pip install lightgbm --install-option=--nomp`

---

## Step 4: Configure the Device

### 4.1 Main Device Config

The main configuration is in the health monitor, which reads from device environment. The MQTT broker address defaults to `localhost:1883`. To connect to a remote backend:

```bash
# Set environment variables (add to ~/.bashrc for persistence)
export MQTT_BROKER_HOST=<your-backend-ip>
export MQTT_BROKER_PORT=1883
export BUS_NUMBER=NA-2255
export BUS_ROUTE=177
```

Or edit the health monitor config directly in `device_health_monitor.py`.

### 4.2 Safe Speed Component Config

Edit `safe_speed_monitoring/safe_speed_config.json`:

```json
{
    "vehicle_id": "BUS_001",
    "route_id": "177_Kaduwela_Kollupitiya",
    "send_interval_seconds": 5,
    "openweather_api_key": "your_api_key_here"
}
```

| Field | Description | Example |
|-------|-------------|---------|
| `vehicle_id` | Unique bus identifier | `"BUS_001"`, `"CTB_NA2255"` |
| `route_id` | Route this bus operates on | `"177_Kaduwela_Kollupitiya"` |
| `send_interval_seconds` | How often to send telemetry (seconds) | `5` |
| `openweather_api_key` | [OpenWeatherMap](https://openweathermap.org/api) free tier API key | `""` (empty = uses defaults) |

### 4.3 MQTT Broker Connection

The safe speed monitor reads the MQTT broker address from the health monitor (default: `localhost:1883`). For a remote backend:

```python
# In safe_speed_monitor.py, find the __init__ method:
# It uses health_monitor.broker_host and health_monitor.broker_port
# These come from DeviceHealthMonitor defaults or environment variables
```

---

## Step 5: Verify the Setup

```bash
cd ~/Final_reserch_stucture/device
source device_venv/bin/activate

# List all components
python3 main.py --list
```

Expected output:
```
======================================================================
CTB BUS RULE VIOLATION DETECTION SYSTEM - COMPONENTS
======================================================================

[1] Context Aware Monitoring (ENABLED)
    Folder: context_aware_monitoring/ (Found)
    Script: object_distance_measurement.py
    Author: Sandaru Abey

[2] Safe Speed Monitoring (ENABLED)
    Folder: safe_speed_monitoring/ (Found)
    Script: safe_speed_monitor.py
    Author: Sachith

======================================================================
Total Components: 2
Enabled: 2
======================================================================
```

---

## Step 6: Run the Device

### Run All Components

```bash
cd ~/Final_reserch_stucture/device
source device_venv/bin/activate

# Run all enabled components
python3 main.py
```

### Run Only Safe Speed Monitoring

```bash
python3 main.py --run safe_speed_monitoring
```

### Run Without MQTT (Offline Testing)

```bash
python3 main.py --no-mqtt
```

---

## Step 7: Auto-Start on Boot (systemd)

Create a systemd service so the device starts automatically:

```bash
sudo nano /etc/systemd/system/ctb-device.service
```

Paste:

```ini
[Unit]
Description=CTB Bus Monitoring Device
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Final_reserch_stucture/device
Environment=PATH=/home/pi/Final_reserch_stucture/device/device_venv/bin:/usr/bin
Environment=MQTT_BROKER_HOST=<your-backend-ip>
Environment=MQTT_BROKER_PORT=1883
ExecStart=/home/pi/Final_reserch_stucture/device/device_venv/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ctb-device.service
sudo systemctl start ctb-device.service

# Check status
sudo systemctl status ctb-device.service

# View logs
journalctl -u ctb-device.service -f
```

---

## Step 8: Connect to Backend

### Backend Running Locally (Development)

If the backend runs on the same machine or local network:

```bash
export MQTT_BROKER_HOST=192.168.1.100  # Your PC/server IP
export MQTT_BROKER_PORT=1883
```

### Backend Running on Cloud

If deployed to a cloud server:

```bash
export MQTT_BROKER_HOST=your-server.example.com
export MQTT_BROKER_PORT=1883
```

> **Important**: The backend must have port `1883` (MQTT) open for device connections.

---

## Network Architecture

```
┌──────────────────┐          ┌──────────────────────┐
│  Raspberry Pi    │          │  Backend Server      │
│  (Bus)           │          │  (Cloud / Local)     │
│                  │   MQTT   │                      │
│  Safe Speed ─────┼──:1883──►│  Aedes MQTT Broker   │
│  Monitor         │          │          │           │
│                  │          │          ▼           │
│  Health ─────────┼──:1883──►│  Firebase Firestore  │
│  Monitor         │          │          │           │
│                  │          │          ▼           │
│  ADAS ───────────┼──:1883──►│  Socket.IO → Web     │
│                  │          │                      │
└──────────────────┘          └──────────────────────┘
```

### Ports Used

| Port | Protocol | Service |
|------|----------|---------|
| 1883 | TCP (MQTT) | Device ↔ Backend communication |
| 3000 | TCP (HTTP) | REST API + Socket.IO |

---

## Folder Structure on Raspberry Pi

After setup, your Pi should have:

```
~/Final_reserch_stucture/device/
├── main.py                          # Entry point
├── device_health_monitor.py         # Health + MQTT connection
├── requirements.txt                 # Python deps
├── device_venv/                     # Virtual environment
│
├── context_aware_monitoring/        # ADAS component
│   ├── main.py
│   ├── object_distance_measurement.py
│   └── models/
│       ├── bestV8.pt                # YOLOv8 model (70MB)
│       ├── model-small.onnx         # MiDaS depth model (40MB)
│       └── rlmdFilteredModelNov9.pt # Lane model
│
└── safe_speed_monitoring/           # Safe speed component
    ├── __init__.py
    ├── safe_speed_monitor.py
    ├── safe_speed_config.json
    └── models/
        ├── lightgbm_safe_speed_model.pkl  # ~1MB
        └── label_encoders.pkl             # ~5KB
```

---

## Enabling/Disabling Components

Edit `main.py` and set `'enabled': True/False` for each component:

```python
COMPONENTS = [
    {
        'name': 'Context Aware Monitoring',
        'folder': 'context_aware_monitoring',
        'script': 'object_distance_measurement.py',
        'enabled': True  # Set to False to disable
    },
    {
        'name': 'Safe Speed Monitoring',
        'folder': 'safe_speed_monitoring',
        'script': 'safe_speed_monitor.py',
        'enabled': True  # Set to False to disable
    },
]
```

### Running Only Safe Speed (Lightweight Mode)

If you don't have a camera or only want fleet tracking:

1. Set Context Aware Monitoring `'enabled': False`
2. Run: `python3 main.py`

This uses minimal resources (~50MB RAM, <5% CPU on Pi 4).

---

## Adding a GPS Module (Optional)

The safe speed monitor currently simulates route positions. To use real GPS:

### Hardware
- Connect a USB GPS module (e.g., u-blox NEO-6M)
- Or use a UART GPS module on GPIO pins 14/15

### Software

```bash
# Install GPS daemon
sudo apt install -y gpsd gpsd-clients

# For USB GPS
sudo gpsd /dev/ttyUSB0 -F /var/run/gpsd.sock

# Test
cgps -s
```

### Code Integration

In `safe_speed_monitor.py`, replace the simulated position with real GPS:

```python
# Install: pip install gps3
from gps3 import gps3

gps_socket = gps3.GPSDSocket()
gps_socket.connect()
gps_socket.watch()

data_stream = gps3.DataStream()
for new_data in gps_socket:
    if new_data:
        data_stream.unpack(new_data)
        lat = data_stream.TPV['lat']
        lon = data_stream.TPV['lon']
        # Use lat, lon instead of simulated position
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `ModuleNotFoundError: lightgbm` | `pip install lightgbm` (ensure venv is activated) |
| `MQTT connection refused` | Check backend is running and IP/port are correct |
| `Permission denied: /dev/video0` | `sudo usermod -a -G video pi` then reboot |
| `Out of memory (Pi 3)` | Disable Context Aware Monitoring, run only Safe Speed |
| `Cannot import safe_speed_monitor` | Check `__init__.py` exists in `safe_speed_monitoring/` |
| `Model file not found` | Verify `.pkl` files exist in `safe_speed_monitoring/models/` |
| WiFi disconnects | Use a USB WiFi adapter or wired Ethernet |
| Slow model inference | Normal on Pi 3 (~1-2s). Pi 4 is faster (~0.3s) |

### Check Logs

```bash
# If running as systemd service
journalctl -u ctb-device.service -f --no-pager

# If running manually
python3 main.py 2>&1 | tee device.log
```

### Test MQTT Connection

```bash
# Install mosquitto-clients for testing
sudo apt install -y mosquitto-clients

# Subscribe to all device topics
mosquitto_sub -h <backend-ip> -p 1883 -t "ctb/bus/#" -v

# In another terminal, run the device
python3 main.py
```

---

## Performance Notes

| Component | Pi 3B+ | Pi 4 (4GB) |
|-----------|--------|-----------|
| Safe Speed only | ~50MB RAM, <5% CPU | ~50MB RAM, <3% CPU |
| ADAS only | ~800MB RAM, 60% CPU | ~600MB RAM, 40% CPU |
| Both components | ~900MB RAM, 70% CPU | ~700MB RAM, 45% CPU |
| MQTT overhead | Negligible | Negligible |

> **Recommendation**: For Pi 3B+, run Safe Speed Monitoring alone. For Pi 4, both components work well together.

---

## Quick Start Checklist

- [ ] Flash Raspberry Pi OS (64-bit) to microSD
- [ ] Boot Pi and connect to network
- [ ] `sudo apt update && sudo apt upgrade -y`
- [ ] Install system deps (`libatlas-base-dev`, `libopencv-dev`, etc.)
- [ ] Clone/copy project to `~/Final_reserch_stucture/device/`
- [ ] Create venv: `python3 -m venv device_venv`
- [ ] Activate: `source device_venv/bin/activate`
- [ ] Install pip deps: `pip install -r requirements.txt && pip install lightgbm pandas joblib requests`
- [ ] Edit `safe_speed_monitoring/safe_speed_config.json` with your bus details
- [ ] Set `MQTT_BROKER_HOST` environment variable to your backend IP
- [ ] Test: `python3 main.py --list`
- [ ] Run: `python3 main.py`
- [ ] (Optional) Set up systemd service for auto-start
- [ ] Verify data appears on web dashboard
