# CTB Bus Rule Violation Detection & Fleet Monitoring System

A comprehensive IoT-based bus monitoring system for the Ceylon Transport Board (CTB). The system runs on Raspberry Pi devices installed in buses, communicates via MQTT to a Node.js backend, stores data in Firebase Firestore, and provides real-time dashboards.

---

## System Architecture

```
┌─────────────────────┐       MQTT        ┌──────────────────────┐      REST/Socket.IO
│   Raspberry Pi      │ ◄──────────────► │   Node.js Backend     │ ◄──────────────────►  Web Dashboard
│   (Device)          │   paho-mqtt       │   (Express + Aedes)   │                       (React CRA)
│                     │                   │                       │
│  ┌────────────────┐ │                   │  ┌─────────────────┐  │      ┌──────────────────┐
│  │ Context Aware  │ │                   │  │ Firebase         │  │      │ Fleet Dashboard   │
│  │ Monitoring     │ │                   │  │ Firestore        │  │      │ Bus List          │
│  ├────────────────┤ │                   │  ├─────────────────┤  │      │ Bus Detail        │
│  │ Safe Speed     │ │                   │  │ Device Service   │  │      │ Live Map          │
│  │ Monitoring     │ │                   │  │ Fleet Service    │  │      └──────────────────┘
│  └────────────────┘ │                   │  │ Violation Svc    │  │
│                     │                   │  └─────────────────┘  │
│  Health Monitor     │                   │  MQTT Broker (Aedes)  │
└─────────────────────┘                   └──────────────────────┘
```

---

## Project Structure

```
Final_reserch_stucture/
│
├── device/                          # Raspberry Pi device code (Python)
│   ├── main.py                      # Main entry point - runs all components
│   ├── device_health_monitor.py     # MQTT health monitoring & offline queue
│   ├── requirements.txt             # Python dependencies
│   │
│   ├── context_aware_monitoring/    # Component: ADAS (Lane, Object, Depth)
│   │   ├── main.py
│   │   ├── object_distance_measurement.py
│   │   ├── lane_memory_tracker.py
│   │   ├── driver_behavior_analyzer.py
│   │   ├── adaptive_processor.py
│   │   └── models/
│   │       ├── bestV8.pt
│   │       ├── model-small.onnx
│   │       └── rlmdFilteredModelNov9.pt
│   │
│   └── safe_speed_monitoring/       # Component: ML Safe Speed Prediction
│       ├── __init__.py
│       ├── safe_speed_monitor.py    # LightGBM prediction + MQTT publish
│       ├── safe_speed_config.json   # Configuration (vehicle_id, route, etc.)
│       └── models/
│           ├── lightgbm_safe_speed_model.pkl
│           └── label_encoders.pkl
│
├── backend/                         # Node.js Express backend
│   ├── server.js                    # Main server (Express + Socket.IO)
│   ├── firebase.js                  # Firebase Admin SDK init
│   ├── package.json
│   │
│   ├── mqtt/
│   │   └── mqttBroker.js            # Aedes MQTT broker + message routing
│   │
│   ├── controllers/
│   │   ├── deviceController.js      # Device CRUD
│   │   ├── violationController.js   # Violation management
│   │   ├── busController.js         # Bus management
│   │   ├── tripController.js        # Trip management
│   │   ├── userController.js        # User auth & management
│   │   ├── notificationController.js
│   │   ├── ratingController.js
│   │   ├── routeController.js
│   │   └── busTripRecordController.js
│   │
│   ├── services/
│   │   ├── deviceService.js         # Device Firestore operations
│   │   ├── fleetService.js          # Fleet/telemetry Firestore operations
│   │   ├── violationService.js      # Violation storage
│   │   ├── busService.js
│   │   ├── tripService.js
│   │   ├── userService.js
│   │   ├── notificationService.js
│   │   ├── ratingService.js
│   │   └── busTripRecordService.js
│   │
│   ├── routes/
│   │   ├── deviceRoutes.js          # /api/devices
│   │   ├── fleetRoutes.js           # /api/fleet (overview, buses, map, stats)
│   │   ├── violationRoutes.js       # /api/violations
│   │   ├── busRoutes.js             # /api/bus
│   │   ├── tripRoutes.js            # /api/trip
│   │   ├── userRoutes.js            # /api/user
│   │   ├── routeRoutes.js           # /api/routes
│   │   ├── notificationRoutes.js    # /api/notifications
│   │   ├── ratingRoutes.js          # /api/ratings
│   │   └── busTripRecordRoutes.js   # /api/bus-trip-records
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   └── public/
│       └── index.html               # Device monitoring dashboard
│
├── webfrontend/                     # React CRA web dashboard
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js                 # CRA entry point
│       ├── App.js                   # Router with Sidebar layout
│       ├── index.css                # Global styles (dark theme)
│       ├── components/
│       │   └── Sidebar.js           # Navigation sidebar
│       ├── pages/
│       │   ├── Dashboard.js         # Fleet overview dashboard
│       │   ├── BusList.js           # Bus fleet list with filters
│       │   ├── BusDetail.js         # Individual bus detail + charts
│       │   └── MapView.js           # Live map with Leaflet
│       ├── services/
│       │   ├── api.js               # Axios API client
│       │   └── socket.js            # Socket.IO client
│       └── hooks/
│           └── useFleet.js          # React hooks for fleet data
│
├── frontend/                        # React Native mobile app
│   ├── App.js
│   ├── package.json
│   └── src/
│
├── DLModelBackend/                  # ML model servers
│   └── Server/
│       ├── LightBGMServer/          # Arrival time & passenger flow prediction
│       └── LSTMServer/              # LSTM model server
│
└── other/                           # Partner reference code (not deployed)
    └── Com/Com/
        ├── ESP32/                   # Original ESP32 firmware (reference only)
        ├── esp_backend/             # Original Flask backend (reference only)
        └── web_dashboard/           # Original Vite dashboard (reference only)
```

---

## Prerequisites

| Component | Requirement |
|-----------|-----------|
| **Device** | Python 3.8+, pip |
| **Backend** | Node.js 18+, npm |
| **Web Dashboard** | Node.js 18+, npm |
| **Firebase** | Firebase project with Firestore enabled |

---

## Setup & Installation

### 1. Backend Server

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3000
MQTT_PORT=1883
CORS_ORIGIN2=*
EOF

# Ensure Firebase service account key is present
# File: finalyearreserch-firebase-adminsdk-fbsvc-85d210b638.json
# (or create your own from Firebase Console → Project Settings → Service Accounts)

# Start the server
npm start
# Or for development with auto-reload:
npm run dev
```

The backend starts:
- **Express API** on port `3000`
- **MQTT Broker (Aedes)** on port `1883`
- **Socket.IO** on port `3000` (same as Express)

### 2. Device (Raspberry Pi)

```bash
cd device

# Create virtual environment
python -m venv device_venv
source device_venv/bin/activate  # Linux/Mac
# device_venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
pip install lightgbm pandas joblib requests

# Configure the safe speed component
# Edit device/safe_speed_monitoring/safe_speed_config.json

# List all components
python main.py --list

# Run all enabled components
python main.py

# Run a specific component only
python main.py --run safe_speed_monitoring
```

### 3. Web Dashboard

```bash
cd webfrontend

# Install dependencies
npm install

# Start development server (proxies API to localhost:3000)
npm start
# Opens on http://localhost:3001

# Build for production
npm run build
```

---

## API Endpoints

### Fleet Management (`/api/fleet`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/overview` | Fleet overview stats (total buses, online, avg speed) |
| GET | `/api/fleet/buses` | List all buses |
| GET | `/api/fleet/buses/:vehicleId` | Get specific bus details |
| GET | `/api/fleet/buses/:vehicleId/history` | Get bus telemetry history |
| GET | `/api/fleet/map-data` | Get all bus locations for map |
| GET | `/api/fleet/routes` | Get all routes |
| GET | `/api/fleet/statistics` | Speed distribution & hourly stats |

### Device Management (`/api/devices`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all registered devices |
| GET | `/api/devices/:deviceKey` | Get device details |
| GET | `/api/devices/:deviceKey/health-history` | Device health history |

### Other Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/user` | User authentication & management |
| `/api/bus` | Bus CRUD operations |
| `/api/trip` | Trip management |
| `/api/routes` | Route management |
| `/api/violations` | Violation records |
| `/api/notifications` | Push notifications |
| `/api/ratings` | Bus ratings |
| `/api/bus-trip-records` | Trip records |

---

## MQTT Topics

| Topic Pattern | Direction | Description |
|--------------|-----------|-------------|
| `ctb/bus/{deviceKey}/health` | Device → Backend | Health metrics (CPU, RAM, temp) |
| `ctb/bus/{deviceKey}/status` | Device → Backend | Online/offline status |
| `ctb/bus/{deviceKey}/violation` | Device → Backend | Rule violation alerts |
| `ctb/bus/{deviceKey}/component` | Device → Backend | Component status updates |
| `ctb/bus/{deviceKey}/safespeed/telemetry` | Device → Backend | Safe speed prediction data |
| `ctb/bus/{deviceKey}/safespeed/command` | Backend → Device | Commands to safe speed component |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `bus_update` | Server → Client | Real-time bus data update |
| `safeSpeedUpdate` | Server → Client | Safe speed telemetry received |
| `device_health` | Server → Client | Device health update |
| `device_status` | Server → Client | Device online/offline |
| `new_violation` | Server → Client | New violation detected |

---

## Configuration

### Device Configuration (`device/safe_speed_monitoring/safe_speed_config.json`)

```json
{
    "vehicle_id": "BUS_001",
    "route_id": "177_Kaduwela_Kollupitiya",
    "send_interval_seconds": 5,
    "openweather_api_key": ""
}
```

- **vehicle_id**: Unique identifier for this bus
- **route_id**: The route this bus operates on
- **send_interval_seconds**: How often to publish telemetry
- **openweather_api_key**: OpenWeatherMap API key for weather data (optional, uses defaults if empty)

### Backend Environment (`.env`)

```env
PORT=3000
MQTT_PORT=1883
CORS_ORIGIN2=*
```

---

## Component Architecture

The device uses a **component-based architecture**. Each component is a self-contained module in its own folder under `device/`:

```python
# device/main.py - COMPONENTS list
COMPONENTS = [
    {
        'name': 'Context Aware Monitoring',
        'folder': 'context_aware_monitoring',
        'script': 'object_distance_measurement.py',
        'description': 'Lane detection, object detection with depth estimation',
        'author': 'Sandaru Abey',
        'enabled': True
    },
    {
        'name': 'Safe Speed Monitoring',
        'folder': 'safe_speed_monitoring',
        'script': 'safe_speed_monitor.py',
        'description': 'ML-based safe speed prediction and fleet telemetry via MQTT',
        'author': 'Sachith',
        'enabled': True
    },
    # Add more components here...
]
```

To add a new component:
1. Create a folder under `device/` (e.g., `my_component/`)
2. Add your main script (e.g., `main.py`)
3. Add an entry to the `COMPONENTS` list in `device/main.py`
4. Add MQTT topic handling in `backend/mqtt/mqttBroker.js`

---

## Data Flow

### Safe Speed Prediction Flow

```
1. Raspberry Pi (device/safe_speed_monitoring/safe_speed_monitor.py)
   ├── Gets GPS position (simulated route stops)
   ├── Gets weather data (OpenWeatherMap API)
   ├── Gets passenger count
   ├── Runs LightGBM ML model locally
   └── Publishes result via MQTT
           │
           ▼
2. Backend MQTT Broker (backend/mqtt/mqttBroker.js)
   ├── Receives on topic: ctb/bus/{key}/safespeed/telemetry
   ├── Stores in Firestore via fleetService
   └── Broadcasts via Socket.IO (bus_update, safeSpeedUpdate)
           │
           ▼
3. Web Dashboard (webfrontend/src/)
   ├── Hooks receive via Socket.IO (real-time)
   ├── Also polls REST API at intervals
   └── Displays on Dashboard, BusList, BusDetail, MapView pages
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Device | Python 3.8+, paho-mqtt, LightGBM, OpenCV, ONNX Runtime |
| Backend | Node.js, Express, Aedes MQTT Broker, Socket.IO |
| Database | Firebase Firestore |
| Web Dashboard | React (CRA), Recharts, Leaflet, Lucide Icons |
| Mobile App | React Native (Expo) |
| ML Models | YOLOv8 (Object Detection), MiDaS (Depth), LightGBM (Safe Speed) |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `EADDRINUSE: address already in use :::3000` | Kill existing process: `npx kill-port 3000` |
| MQTT connection refused | Ensure backend is running first (`npm start` in backend/) |
| Firebase auth error | Check service account key file path in `firebase.js` |
| Missing Python packages | `pip install lightgbm pandas joblib requests paho-mqtt psutil` |
| Web dashboard blank page | Ensure `src/` directory exists with `index.js` |
| Leaflet map not showing | Run `npm install leaflet react-leaflet` in webfrontend/ |

---

## Authors

- **Sandaru Abey** - Context Aware Monitoring (ADAS, Lane Detection, Object Detection)
- **Sachith** - Safe Speed Prediction (ML Model, Fleet Telemetry)
- Team Members - Mobile App, User Management, Trip Management
