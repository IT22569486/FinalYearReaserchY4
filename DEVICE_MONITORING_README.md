# CTB Bus Device Health Monitoring System

## Sri Lanka Public Bus Rule Violation Detection - IoT Monitoring

A comprehensive IoT-based device health monitoring system for Ceylon Transport Board (CTB) buses. This system monitors driver assistance devices (lane detection, object detection) deployed on buses and provides real-time status updates to a central dashboard.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [How Device-Dashboard Connection Works](#how-device-dashboard-connection-works)
4. [Auto-Registration Explained](#auto-registration-explained)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running the System](#running-the-system)
8. [Raspberry Pi Deployment](#raspberry-pi-deployment)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

### What This System Does

- **Monitors device health** on each bus (CPU, Memory, Disk, Temperature)
- **Tracks online/offline status** of all deployed devices
- **Reports rule violations** (lane departure, unsafe distance)
- **Queues messages offline** when connectivity is lost
- **Auto-syncs** when connection is restored
- **Real-time dashboard** for CTB administrators

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto-Registration** | Devices automatically appear on dashboard when turned on |
| **Offline Queue** | Messages stored locally when no internet, sent when reconnected |
| **2-Hour Health Updates** | Periodic health reports (configurable) |
| **Real-time Violations** | Instant alerts for lane departures |
| **Unique Device Keys** | Each bus has a unique identifier |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CTB Monitoring System                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   BUS 1 (Raspberry Pi)              CENTRAL SERVER                      │
│   ┌──────────────────┐              ┌────────────────────────────┐      │
│   │ Detection System │              │     Node.js Backend        │      │
│   │ - Lane Detection │    MQTT      │  ┌──────────────────────┐  │      │
│   │ - Object Detect  │ ──────────▶  │  │   MQTT Broker        │  │      │
│   │ - Depth Estimate │   Port 1883  │  │   (Aedes)            │  │      │
│   │                  │              │  └──────────────────────┘  │      │
│   │ Health Monitor   │              │  ┌──────────────────────┐  │      │
│   │ - CPU/Memory     │              │  │   REST API           │  │      │
│   │ - Temperature    │              │  │   (Express)          │  │      │
│   │ - Offline Queue  │              │  └──────────────────────┘  │      │
│   └──────────────────┘              │  ┌──────────────────────┐  │      │
│                                     │  │   MongoDB            │  │      │
│   BUS 2 (Raspberry Pi)              │  │   - Devices          │  │      │
│   ┌──────────────────┐              │  │   - Health Logs      │  │      │
│   │ Same as above    │ ──────────▶  │  │   - Violations       │  │      │
│   └──────────────────┘              │  └──────────────────────┘  │      │
│                                     │  ┌──────────────────────┐  │      │
│   BUS 3, 4, 5...                    │  │   Socket.IO          │  │      │
│   ┌──────────────────┐              │  │   (Real-time)        │  │      │
│   │ Same as above    │ ──────────▶  │  └──────────────────────┘  │      │
│   └──────────────────┘              └─────────────┬──────────────┘      │
│                                                   │                      │
│                                                   │ WebSocket            │
│                                                   ▼                      │
│                                     ┌────────────────────────────┐      │
│                                     │      Web Dashboard         │      │
│                                     │  - Real-time Status        │      │
│                                     │  - Device Health           │      │
│                                     │  - Violation Alerts        │      │
│                                     │  - Statistics              │      │
│                                     └────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 How Device-Dashboard Connection Works

### Connection Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Device    │     │    MQTT     │     │   Backend   │     │  Dashboard  │
│  Starts Up  │     │   Broker    │     │   Server    │     │    (Web)    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  1. Connect       │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │  2. Send Status   │                   │                   │
       │  "online"         │                   │                   │
       │──────────────────▶│  3. Forward       │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │  4. Save to DB    │
       │                   │                   │  (auto-register   │
       │                   │                   │   if new device)  │
       │                   │                   │                   │
       │                   │                   │  5. Emit via      │
       │                   │                   │  Socket.IO        │
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │  6. Send Health   │                   │                   │  6. Update UI
       │  (every 2 hours)  │                   │                   │  (real-time)
       │──────────────────▶│──────────────────▶│──────────────────▶│
       │                   │                   │                   │
```

### Message Types

| Topic | Purpose | Frequency |
|-------|---------|-----------|
| `ctb/bus/{key}/status` | Online/Offline status | On connect/disconnect |
| `ctb/bus/{key}/health` | Health metrics | Every 2 hours (configurable) |
| `ctb/bus/{key}/violation` | Rule violations | When detected |

---

## 🔑 Auto-Registration Explained

### How It Works

**You do NOT need to manually register devices on the dashboard.** Here's what happens:

1. **First Boot**: Device reads `device_config.json`
   - If `device_key` is empty → Generates unique key (e.g., `CTB-B89A2A4BFD2E-C8372295`)
   - Saves generated key to config file

2. **Device Connects**: Sends status message to MQTT broker

3. **Backend Receives Message**: 
   ```javascript
   // In mqttBroker.js
   if (!device) {
       // Auto-register new device
       device = new BusDevice({
           deviceKey,
           busNumber: data.bus_number,
           routeNumber: data.route_number,
           status: 'online'
       });
       await device.save();
   }
   ```

4. **Dashboard Updates**: Device appears immediately via WebSocket

### Two Registration Methods

| Method | When to Use |
|--------|-------------|
| **Auto-Registration** | Default. Just deploy device, it registers itself |
| **Pre-Registration** | Use dashboard to create device key first, then configure device with that key |

### Pre-Registration (Optional)

If you want to control device keys:

1. Open Dashboard → Click "Register Device"
2. Enter bus number, route, depot
3. Get generated key (e.g., `CTB-68F71E0E18244B33`)
4. Put this key in device's `device_config.json`
5. Deploy device

---

## 💾 Installation

### Prerequisites

- **Node.js** 18+ 
- **MongoDB** 6+ (local or Atlas)
- **Python** 3.8+ (for device)

### Backend Setup

```bash
# Clone and navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit configuration
# Set MONGODB_URI if using remote MongoDB
```

### Device Setup

```bash
# Navigate to device folder
cd device

# Create virtual environment
python -m venv device_venv

# Activate (Windows)
.\device_venv\Scripts\activate

# Activate (Linux/Mac/Raspberry Pi)
source device_venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## ⚙️ Configuration

### Backend Configuration (`.env`)

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ctb_device_monitor

# MQTT Broker
MQTT_PORT=1883
MQTT_WS_PORT=8083

# Device Settings
DEVICE_OFFLINE_THRESHOLD_MINUTES=150
```

### Device Configuration (`device_config.json`)

```json
{
    "device_key": "",
    "bus_number": "NA-1234",
    "route_number": "138",
    "mqtt_broker": "YOUR_SERVER_IP",
    "mqtt_port": 1883,
    "mqtt_username": "",
    "mqtt_password": "",
    "mqtt_topic_base": "ctb/bus",
    "health_interval_seconds": 7200
}
```

| Field | Description | Example |
|-------|-------------|---------|
| `device_key` | Leave empty for auto-generation, or use pre-registered key | `CTB-68F71E0E18244B33` |
| `bus_number` | Bus registration number | `NA-1234` |
| `route_number` | Bus route | `138` |
| `mqtt_broker` | Server IP address | `192.168.1.100` or `ctb-server.lk` |
| `mqtt_port` | MQTT port | `1883` |
| `health_interval_seconds` | Health update frequency | `7200` (2 hours) |

---

## 🚀 Running the System

### 1. Start Backend Server

```bash
cd backend
npm start
```

Expected output:
```
🌐 MQTT WebSocket started on port 8083
============================================================
🚌 CTB Device Monitor Backend
============================================================
📊 Dashboard:       http://localhost:3000
🔌 WebSocket:       ws://localhost:3000
============================================================
🔌 MQTT Broker started on port 1883
✅ Connected to MongoDB
```

### 2. Start Device

```bash
cd device

# Activate virtual environment
.\device_venv\Scripts\activate  # Windows
source device_venv/bin/activate  # Linux/Pi

# Run test mode (30s interval)
python test_health_monitor.py

# Or run with full detection system
python object_distance_measurement.py
```

### 3. Open Dashboard

Navigate to: **http://localhost:3000**

---

## 🍓 Raspberry Pi Deployment

### Hardware Requirements

- Raspberry Pi 4 (4GB+ RAM recommended)
- Camera module or USB webcam
- SD Card (32GB+)
- Internet connectivity (WiFi/4G dongle)

### Installation on Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
sudo apt install python3-pip python3-venv libatlas-base-dev -y

# Clone your project
git clone <your-repo> /home/pi/ctb-device
cd /home/pi/ctb-device/device

# Create virtual environment
python3 -m venv device_venv
source device_venv/bin/activate

# Install packages
pip install paho-mqtt psutil ultralytics opencv-python-headless numpy

# Configure device
nano device_config.json
# Set mqtt_broker to your server IP
```

### Auto-Start on Boot (systemd)

Create service file:
```bash
sudo nano /etc/systemd/system/ctb-device.service
```

Content:
```ini
[Unit]
Description=CTB Bus Device Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ctb-device/device
ExecStart=/home/pi/ctb-device/device/device_venv/bin/python object_distance_measurement.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ctb-device
sudo systemctl start ctb-device

# Check status
sudo systemctl status ctb-device

# View logs
journalctl -u ctb-device -f
```

### Offline Queue Behavior

When the bus loses internet connectivity:

1. **Messages queue locally** in SQLite database (`device_queue.db`)
2. **Queue persists** even if device restarts
3. **Auto-reconnect** attempts with exponential backoff (5s → 10s → 20s → ... → 5min max)
4. **Queue flushes** when connectivity restored
5. **Dashboard shows** both `queued_at` and `sent_at` timestamps

---

## 📡 API Reference

### Devices API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/stats` | Get statistics |
| GET | `/api/devices/:key` | Get device details |
| POST | `/api/devices/register` | Pre-register device |
| PUT | `/api/devices/:key` | Update device info |
| DELETE | `/api/devices/:key` | Deactivate device |
| GET | `/api/devices/:key/health-history` | Health logs |
| POST | `/api/devices/:key/refresh` | Force refresh status |

### Violations API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/violations` | List violations |
| GET | `/api/violations/stats` | Violation statistics |
| GET | `/api/violations/recent` | Recent violations |
| PUT | `/api/violations/:id/review` | Mark as reviewed |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `device:status` | Server → Client | Device online/offline |
| `device:health` | Server → Client | Health update received |
| `violation:new` | Server → Client | New violation detected |

---

## 🔧 Troubleshooting

### Device Shows "Disconnected"

1. **Check MQTT package installed:**
   ```bash
   python -c "import paho.mqtt.client; print('OK')"
   ```

2. **Check server IP in config:**
   ```bash
   cat device_config.json
   # mqtt_broker should be server IP, not "localhost" if remote
   ```

3. **Check backend is running:**
   ```bash
   curl http://YOUR_SERVER:3000/api/health
   ```

4. **Check MQTT port is open:**
   ```bash
   telnet YOUR_SERVER 1883
   ```

### Device Shows "Unknown" Status

- Device has never connected
- Check device key matches (if pre-registered)
- Wait for first health update

### Queue Growing But Not Sending

- Backend server not running
- Wrong MQTT broker address
- Firewall blocking port 1883

### Dashboard Not Updating

1. Check browser console for WebSocket errors
2. Refresh the page
3. Check backend logs for errors

---

## 📊 Dashboard Features

### Statistics Cards
- **Total Devices**: All registered devices
- **Online**: Currently connected devices
- **Offline**: Disconnected or no recent health update
- **Violations Today**: Today's violation count

### Device Card Information
- Bus number and route
- Device key
- Online/Offline status
- Last seen time
- CPU/Memory/Temperature
- Detection capabilities (Lane, Object, Depth, Camera)
- Per-device refresh button

### Real-time Updates
- Automatic via WebSocket
- Toast notifications for status changes
- Violation alerts

---

## 📁 Project Structure

```
Final_reserch_stucture/
├── backend/                          # Node.js Server
│   ├── src/
│   │   ├── server.js                # Main entry point
│   │   ├── models/                  # MongoDB schemas
│   │   │   ├── BusDevice.js        # Device model
│   │   │   ├── HealthLog.js        # Health history
│   │   │   └── Violation.js        # Violations
│   │   ├── routes/                  # REST API
│   │   │   ├── devices.js
│   │   │   └── violations.js
│   │   └── mqtt/
│   │       └── mqttBroker.js       # MQTT handler
│   ├── public/
│   │   └── index.html              # Dashboard UI
│   ├── package.json
│   └── .env
│
├── device/                          # Python Device Code
│   ├── object_distance_measurement.py  # Main detection app
│   ├── device_health_monitor.py    # Health monitor module
│   ├── test_health_monitor.py      # Test script
│   ├── device_config.json          # Device configuration
│   ├── requirements.txt
│   └── *.pt                        # YOLO models
│
└── README.md                        # This file
```

---

## 🔒 Security Considerations

For production deployment:

1. **Use MQTT authentication:**
   ```json
   {
       "mqtt_username": "device_user",
       "mqtt_password": "secure_password"
   }
   ```

2. **Use TLS/SSL** for MQTT connections

3. **Restrict MongoDB access** to localhost or VPN

4. **Add authentication** to dashboard

5. **Use environment variables** for sensitive data

---

## 📝 License

MIT License - Free for educational and commercial use.

---

## 🆘 Support

For issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Check backend logs: `npm start` output
3. Check device logs: Terminal output
4. Create issue in repository

---

**Made for Sri Lanka CTB - Ceylon Transport Board** 🇱🇰🚌
