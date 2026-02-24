# 🚌 CTB Bus Rule Violation Detection System

A comprehensive IoT-based system for monitoring Sri Lankan CTB bus driver behavior in real-time. The system uses computer vision, depth estimation, and machine learning to detect driving violations and report them to a centralized dashboard.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Violation Detection](#violation-detection)
4. [Lane Prediction](#lane-prediction)
5. [MQTT Communication](#mqtt-communication)
6. [Socket.IO Real-time Updates](#socketio-real-time-updates)
7. [Data Flow](#data-flow)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Running the System](#running-the-system)

---

## 🏗️ System Overview

The system consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Device** | Python, OpenCV, YOLOv8 | Camera-based violation detection on the bus |
| **Backend** | Node.js, Express, MQTT | Message broker, API, Firebase integration |
| **Frontend** | React, Material UI | Dashboard for monitoring violations |

```
┌─────────────────────────────────────────────────────────────────┐
│                        CTB BUS DEVICE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Lane        │  │ Object       │  │ Driver Behavior      │  │
│  │ Detection   │──│ Detection    │──│ Analyzer             │  │
│  │ (YOLOv8)    │  │ (YOLOv8)     │  │ (Violation Logic)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │ Health Monitor│                           │
│                    │ (MQTT Client) │                           │
│                    └───────────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │ MQTT (port 1883)
┌────────────────────────────▼────────────────────────────────────┐
│                     NODE.JS BACKEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MQTT Broker  │──│ Express API  │──│ Firebase Firestore   │  │
│  │ (Aedes)      │  │ (REST)       │  │ (Database)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │ Socket.IO     │                           │
│                    │ (Real-time)   │                           │
│                    └───────────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket (port 5001)
┌────────────────────────────▼────────────────────────────────────┐
│                     REACT DASHBOARD                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Device List  │  │ Device       │  │ Violation            │  │
│  │              │  │ Details      │  │ History              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Violation Detection

The `DriverBehaviorAnalyzer` class monitors driver behavior and detects the following violations:

### Violation Types

| Type | Trigger Condition | Severity |
|------|-------------------|----------|
| `SLOW_DRIVING` | Speed < 20 km/h for 10+ seconds with no/low traffic | LOW |
| `UNSAFE_DISTANCE` | Following too close at current speed (brightness > threshold) | HIGH |
| `SPEED_WITH_TRAFFIC` | Speed > 60 km/h in heavy traffic | MEDIUM |
| `RULE_VIOLATION` | Lane departure, crossing solid lines | MEDIUM |

### How It Works

```python
# driver_behavior_analyzer.py

class DriverBehaviorAnalyzer:
    # Speed thresholds (km/h)
    SLOW_SPEED_THRESHOLD = 20    # Below this = slow
    HIGH_SPEED_THRESHOLD = 60    # Above this = high speed
    
    # Distance thresholds (depth map brightness)
    # Higher brightness = closer object
    SAFE_DISTANCE_HIGH_SPEED = 50 #this is a bright level   # Must be < 50 at high speed
    SAFE_DISTANCE_MEDIUM_SPEED = 70
    SAFE_DISTANCE_LOW_SPEED = 100
    
    def check_violations(self):
        """Called every frame to check for violations"""
        
        # 1. Check SLOW_DRIVING
        if (speed < 20 and traffic in [NONE, LOW] and duration > 10s):
            report_violation(SLOW_DRIVING)
        
        # 2. Check UNSAFE_DISTANCE
        if closest_object_brightness > safe_threshold:
            report_violation(UNSAFE_DISTANCE)
        
        # 3. Check SPEED_WITH_TRAFFIC
        if (speed > 60 and traffic == HEAVY):
            report_violation(SPEED_WITH_TRAFFIC)
```

### Violation Cooldown

To prevent spam, each violation type has a **30-second cooldown**:

```python
VIOLATION_COOLDOWN = 30  # seconds

def _report_violation(self, violation_type, details):
    now = time.time()
    last_time = self.last_violation_time.get(violation_type, 0)
    
    if now - last_time < VIOLATION_COOLDOWN:
        return  # Still in cooldown, skip
    
    self.last_violation_time[violation_type] = now
    self.health_monitor.send_violation(violation_type.value, details)
```

---

## 🛣️ Lane Prediction

### Lane Detection Model

Uses a custom-trained **YOLOv8-seg** model to detect lane markings:

| Class ID | Lane Type |
|----------|-----------|
| 0 | box_junction |
| 1 | crossroadL_Sign |
| 2 | crosswalk |
| 3 | sign |
| 4 | solid_single_white |
| 5 | solid_single_yellow |
| 6 | solid_double_white |
| 7 | solid_double_yellow |
| 8 | dashed_single_white |

### Lane Memory Tracker

The `LaneMemoryTracker` provides temporal smoothing and memory for lane detection:

```python
class LaneMemoryTracker:
    def __init__(self, max_history=30, decay_rate=0.95, smoothing_factor=0.3):
        self.left_lane_points = None   # Smoothed left lane
        self.right_lane_points = None  # Smoothed right lane
        self.lane_history = []         # Historical data
    
    def update(self, detected_lanes):
        """Update lane positions with new detections"""
        # Apply exponential smoothing
        # Handle missing detections using memory
        # Filter short segments (zebra crossings)
```

### Lane Departure Warning

```python
def check_lane_position(vehicle_x, lane_polygon):
    """Check if vehicle is within lane boundaries"""
    if vehicle_x < left_boundary - threshold:
        return "DEPARTING_LEFT"
    elif vehicle_x > right_boundary + threshold:
        return "DEPARTING_RIGHT"
    return "IN_LANE"
```

---

## 📡 MQTT Communication

**MQTT (Message Queuing Telemetry Transport)** is a lightweight protocol for IoT devices.

### Topics Structure

```
ctb/bus/{device_key}/health      → Device health updates (CPU, RAM, etc.)
ctb/bus/{device_key}/violation   → Violation reports
ctb/bus/{device_key}/status      → Online/offline status
ctb/bus/{device_key}/component   → Component status updates
```

### Device Side (Python)

```python
# device_health_monitor.py

class DeviceHealthMonitor:
    def __init__(self):
        self.mqtt_client = mqtt.Client(client_id=f"{device_key}-{os.getpid()}")
        self.mqtt_broker = "localhost"
        self.mqtt_port = 1883
    
    def send_violation(self, violation_type, details):
        """Send violation to backend via MQTT"""
        topic = f"ctb/bus/{self.device_key}/violation"
        payload = {
            'device_key': self.device_key,
            'type': violation_type,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }
        self._publish(topic, payload)
    
    def send_health_update(self):
        """Send periodic health metrics"""
        topic = f"ctb/bus/{self.device_key}/health"
        payload = {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent
        }
        self._publish(topic, payload)
```

### Backend Side (Node.js)

```javascript
// mqtt/mqttBroker.js

const aedes = require('aedes')();
const net = require('net');

// Start MQTT broker on port 1883
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(1883);

// Handle incoming messages
aedes.on('publish', async (packet, client) => {
    const topic = packet.topic;
    const payload = JSON.parse(packet.payload.toString());
    
    if (topic.includes('/violation')) {
        await handleViolation(topic, payload);
    } else if (topic.includes('/health')) {
        await handleHealthUpdate(topic, payload);
    }
});

async function handleViolation(topic, payload) {
    // Save to Firebase
    const violation = await violationService.createViolation({
        deviceKey: payload.device_key,
        type: payload.type,
        severity: payload.details?.severity || 'MEDIUM',
        details: payload.details
    });
    
    // Notify dashboard via Socket.IO
    io.emit('newViolation', { violation });
}
```

### Offline Queue

When MQTT connection is lost, messages are stored locally:

```python
class OfflineQueue:
    def __init__(self, db_path='device_queue.db'):
        # SQLite database for persistence
        self.conn = sqlite3.connect(db_path)
    
    def add(self, topic, payload):
        """Queue message for later sending"""
        self.cursor.execute(
            "INSERT INTO queue (topic, payload) VALUES (?, ?)",
            (topic, json.dumps(payload))
        )
    
    def process_queue(self):
        """Send queued messages when online"""
        messages = self.cursor.fetchall()
        for topic, payload in messages:
            self.mqtt_client.publish(topic, payload)
            self.delete(message_id)
```

---

## 🔌 Socket.IO Real-time Updates

**Socket.IO** provides real-time bidirectional communication between backend and dashboard.

### Backend (Emit Events)

```javascript
// server.js

const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// When violation is received via MQTT
async function handleViolation(payload) {
    const violation = await violationService.createViolation(payload);
    
    // Broadcast to all connected dashboards
    io.emit('newViolation', {
        violation,
        deviceKey: payload.device_key,
        timestamp: new Date().toISOString()
    });
}

// When health update is received
async function handleHealthUpdate(payload) {
    await deviceService.updateDeviceHealth(payload);
    
    io.emit('deviceHealthUpdate', {
        deviceKey: payload.device_key,
        health: payload
    });
}
```

### Frontend (Listen for Events)

```javascript
// services/socketService.js

import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

export const socketService = {
    connect() {
        socket.connect();
    },
    
    onNewViolation(callback) {
        socket.on('newViolation', callback);
    },
    
    onDeviceHealthUpdate(callback) {
        socket.on('deviceHealthUpdate', callback);
    },
    
    subscribeToDevice(deviceKey) {
        socket.emit('subscribe', { deviceKey });
    }
};

// In React component
useEffect(() => {
    socketService.connect();
    socketService.subscribeToDevice(deviceKey);
    
    const unsubViolation = socketService.onNewViolation((data) => {
        if (data.deviceKey === deviceKey) {
            setViolations(prev => [data.violation, ...prev]);
        }
    });
    
    return () => unsubViolation();
}, [deviceKey]);
```

---

## 📊 Data Flow

### Violation Detection Flow

```
1. Camera captures frame
           ↓
2. YOLOv8 detects objects (cars, trucks, pedestrians)
           ↓
3. MiDaS estimates depth map
           ↓
4. DriverBehaviorAnalyzer checks:
   - Traffic density (based on detected objects)
   - Safe distance (based on depth brightness)
   - Speed (simulated or GPS)
           ↓
5. If violation detected → check cooldown
           ↓
6. DeviceHealthMonitor.send_violation()
           ↓
7. MQTT publish to ctb/bus/{device_key}/violation
           ↓
8. Backend MQTT handler receives message
           ↓
9. violationService.createViolation() → Firebase
           ↓
10. Socket.IO emit('newViolation')
           ↓
11. Dashboard receives real-time update
           ↓
12. DeviceDetails shows in Recent Violations
```

---

## 💾 Firebase Data Structure

### Collections

```
violations/
  ├── {violationId}/
  │     ├── deviceKey: "CTB-B89A2A4BFD2E-4D73EAD0"
  │     ├── type: "SLOW_DRIVING"
  │     ├── severity: "LOW"
  │     ├── description: "Speed: 15km/h for 12s"
  │     ├── details: { speed_kmh: 15, traffic_level: "NONE", ... }
  │     ├── status: "pending"
  │     └── createdAt: Timestamp

devices/
  ├── {deviceId}/
  │     ├── deviceKey: "CTB-B89A2A4BFD2E-4D73EAD0"
  │     ├── busNumber: "NA-2255"
  │     ├── routeNumber: "171"
  │     ├── status: "online"
  │     ├── lastSeen: Timestamp
  │     └── system: { cpu_percent: 45, memory_percent: 62, ... }
```

---

## 🚀 Installation

### Device (Python)

```bash
cd device
python -m venv device_venv
device_venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Backend (Node.js)

```bash
cd backend
npm install
```

### Frontend (React)

```bash
cd webfrontend
npm install
```

---

## ⚙️ Configuration

### Device Configuration (`device/device_config.json`)

```json
{
  "device_key": "CTB-B89A2A4BFD2E-4D73EAD0",
  "bus_number": "NA-2255",
  "route_number": "171",
  "mqtt_broker": "localhost",
  "mqtt_port": 1883,
  "health_interval": 30
}
```

### Backend Configuration (`.env`)

```env
PORT=5001
MQTT_PORT=1883
FIREBASE_PROJECT_ID=your-project-id
```

---

## ▶️ Running the System

### 1. Start Backend

```bash
cd backend
npm start
```
Output:
```
🚀 Server running on http://localhost:5001
📡 MQTT Broker: mqtt://localhost:1883
```

### 2. Start Frontend

```bash
cd webfrontend
npm start
```
Opens: `http://localhost:3000`

### 3. Start Device

```bash
cd device
python main.py
```
Follow prompts:
- Enable health monitoring: `y`
- Select component: `1` (Context Aware Monitoring)
- Enter video path or `0` for webcam
- Set simulated speed (e.g., `15` for SLOW_DRIVING test)

---

## 🧪 Testing Violations

| Violation | How to Trigger |
|-----------|----------------|
| SLOW_DRIVING | Set speed < 20, run for 10+ seconds, ensure low/no traffic |
| UNSAFE_DISTANCE | Point camera at close objects (high depth brightness) |
| SPEED_WITH_TRAFFIC | Set speed > 60, ensure many objects detected |

---

## 📁 Project Structure

```
Final_reserch_stucture/
├── device/
│   ├── main.py                    # Entry point
│   ├── device_health_monitor.py   # MQTT client & health
│   ├── device_config.json         # Device settings
│   └── context_aware_monitoring/
│       ├── object_distance_measurement.py  # Main detection
│       ├── driver_behavior_analyzer.py     # Violation logic
│       ├── lane_memory_tracker.py          # Lane smoothing
│       └── models/                         # YOLOv8 models
│
├── backend/
│   ├── server.js                  # Express + Socket.IO
│   ├── mqtt/
│   │   └── mqttBroker.js         # Aedes MQTT broker
│   ├── services/
│   │   ├── deviceService.js      # Device CRUD
│   │   └── violationService.js   # Violation CRUD
│   └── routes/                    # API endpoints
│
└── webfrontend/
    └── src/
        ├── components/
        │   ├── Dashboard.jsx      # Main dashboard
        │   └── DeviceDetails.jsx  # Device view
        └── services/
            ├── deviceApi.js       # REST API calls
            └── socketService.js   # Socket.IO client
```

---

## 👥 Team

- Context Aware Monitoring - Lane & Object Detection
- Device Health Monitor - MQTT & IoT Integration
- Backend & Dashboard - Web Development

---

## 📄 License

This project is developed for academic research purposes at University of Moratuwa.
