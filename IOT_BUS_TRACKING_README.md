# IoT Bus Monitoring System - MQTT Extension

This document describes the IoT Bus Monitoring System extension that adds MQTT-based real-time bus tracking with Socket.IO broadcasting.

## System Overview

```
┌─────────────────┐      MQTT       ┌─────────────────┐      Socket.IO      ┌─────────────────┐
│   ESP32 Device  │ ───────────────▶│  Backend/Python │ ───────────────────▶│  Web/Mobile App │
│  (GPS, Sensors) │   bus/{id}/gps  │   MQTT Broker   │    bus_location     │    Real-time    │
└─────────────────┘   bus/{id}/pass │                 │    _update          │      Map        │
                                    └─────────────────┘                     └─────────────────┘
                                           │
                                           ▼
                                    ┌─────────────────┐
                                    │    Firebase     │
                                    │   Firestore DB  │
                                    └─────────────────┘
```

## Components

### 1. ESP32 Device Firmware (v7)

**File:** `ESP_Divice/sketch_mqtt_v7.ino`

#### Features:
- GPS location tracking (NEO6M)
- Bus speed monitoring
- Load cell weight measurement (HX711)
- IR passenger counting (2 sensors)
- ILI9341 TFT display
- WiFi connectivity
- **MQTT communication** (replaces HTTP)
- **Configuration web server** (embedded HTML)
- **Persistent storage** (Preferences/EEPROM)

#### MQTT Topics Published:
- `bus/{bus_ID}/gps` - Every 2 seconds when moving
- `bus/{bus_ID}/passenger` - When bus stops (speed < 2 km/h)

#### Configuration:
1. On first boot (no config), ESP32 creates AP: `SmartBus_Config`
2. Connect to AP (password: `smartbus123`)
3. Open browser to `192.168.4.1`
4. Enter Bus ID and Route ID
5. Device restarts and connects to main WiFi

#### GPS Message Payload:
```json
{
  "bus_id": "BUS-001",
  "route_id": 101,
  "latitude": 6.9271,
  "longitude": 79.8612,
  "speed": 35.5,
  "timestamp": 123456789
}
```

#### Passenger Message Payload:
```json
{
  "bus_id": "BUS-001",
  "route_id": 101,
  "latitude": 6.9271,
  "longitude": 79.8612,
  "total_weight": 1250.5,
  "in_count": 3,
  "out_count": 1,
  "total_passenger_count": 42,
  "timestamp": 123456789
}
```

---

### 2. Python Backend Service (api_data_store)

**Directory:** `device/api_data_store/`

#### Files:
- `main.py` - FastAPI application with Socket.IO
- `config.py` - Configuration settings
- `firebase_service.py` - Firebase Firestore operations
- `mqtt_service.py` - MQTT client and message handling
- `socket_service.py` - Socket.IO real-time broadcasting
- `route_service.py` - Route validation and name lookup
- `requirements.txt` - Python dependencies
- `.env` - Environment configuration

#### Setup:
```bash
cd device/api_data_store
pip install -r requirements.txt
cp .env.example .env  # Edit with your settings
python main.py
```

#### Features:
- Subscribes to `bus/+/gps` and `bus/+/passenger` MQTT topics
- Stores data in Firebase Firestore
- Broadcasts real-time updates via Socket.IO
- REST API for querying bus data
- Route validation and name attachment

#### API Endpoints:
- `GET /` - Health check
- `GET /api/health` - Detailed health status
- `GET /api/buses` - Get all active bus locations
- `GET /api/bus/{bus_id}` - Get specific bus
- `GET /api/bus/{bus_id}/history` - GPS history
- `GET /api/bus/{bus_id}/passengers` - Passenger events
- `GET /api/routes` - All routes
- `POST /api/bus/{bus_id}/command` - Send command via MQTT
- `POST /api/bus/{bus_id}/safe-speed` - Update safe speed

---

### 3. Node.js Backend MQTT Extension

**File:** `backend/mqtt/mqttBroker.js`

#### Extended Message Handlers:
- `bus/{bus_id}/gps` - Handles GPS location updates
- `bus/{bus_id}/passenger` - Handles passenger data

#### Features:
- Route name caching for performance
- Firebase Firestore storage
- Socket.IO broadcasting
- Updates both `bus_live_locations` and `buses` collections

#### Socket.IO Events Emitted:
- `bus_location_update` - Real-time GPS updates
- `busLocationUpdate` - Legacy event (backward compatibility)
- `passenger_update` - Passenger count updates

---

### 4. Web Dashboard Extension

**Files Modified:**
- `webfrontend/src/services/socket.js` - Added bus tracking events
- `webfrontend/src/hooks/useFleet.js` - Real-time map data updates
- `webfrontend/src/pages/MapView.js` - Enhanced popup with route/speed

#### Socket Events Subscribed:
- `bus_location_update` - GPS updates
- `busLocationUpdate` - Legacy support
- `passenger_update` - Passenger data
- `bus_status` - Online/offline status

#### Map Features:
- Real-time bus markers
- Route name display
- Current speed display
- Passenger count display
- Auto-updating positions

---

### 5. React Native Mobile App

**Files Created/Modified:**

#### New Files:
- `frontend/src/services/socketService.js` - Socket.IO client service
- `frontend/src/screens/LiveBusTrackingScreen.js` - Real-time tracking screen

#### Modified Files:
- `frontend/src/navigation/index.js` - Added LiveBusTracking route
- `frontend/src/screens/HomeScreen.js` - Added Live Tracking card

#### Features:
- Real-time bus tracking map
- Socket.IO connection with auto-reconnect
- Bus list view with search
- Bus detail card with speed, passengers, route
- Navigate to detailed trip tracking

---

## Firebase Collections

### bus_live_locations
```javascript
{
  bus_id: "BUS-001",
  route_id: 101,
  route_name: "Colombo - Kandy",
  latitude: 6.9271,
  longitude: 79.8612,
  speed: 35.5,
  status: "online",
  passenger_count: 42,
  total_weight: 1250.5,
  last_updated: Timestamp,
  last_passenger_update: Timestamp
}
```

### bus_gps_history
```javascript
{
  bus_id: "BUS-001",
  route_id: 101,
  latitude: 6.9271,
  longitude: 79.8612,
  speed: 35.5,
  timestamp: Timestamp,
  device_timestamp: 123456789
}
```

### bus_passenger_events
```javascript
{
  bus_id: "BUS-001",
  route_id: 101,
  route_name: "Colombo - Kandy",
  latitude: 6.9271,
  longitude: 79.8612,
  total_weight: 1250.5,
  in_count: 3,
  out_count: 1,
  total_passenger_count: 42,
  timestamp: Timestamp
}
```

---

## Running the System

### 1. Start MQTT Broker (Node.js Backend)
```bash
cd backend
npm start
```
The MQTT broker runs on port 1883 by default.

### 2. Start Python Service (Optional - if using separate Python service)
```bash
cd device/api_data_store
python main.py
```
Runs on port 5001 by default.

### 3. Flash ESP32
1. Open `ESP_Divice/sketch_mqtt_v7.ino` in Arduino IDE
2. Install required libraries:
   - PubSubClient
   - TinyGPSPlus
   - HX711
   - Adafruit_GFX
   - Adafruit_ILI9341
   - ArduinoJson
3. Update WiFi credentials and MQTT server IP
4. Upload to ESP32
5. Configure via web interface

### 4. Start Web Dashboard
```bash
cd webfrontend
npm start
```

### 5. Start Mobile App
```bash
cd frontend
npx expo start
```

---

## Configuration

### ESP32 (sketch_mqtt_v7.ino)
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "192.168.1.x";  // Your backend IP
const int MQTT_PORT = 1883;
```

### Python Service (.env)
```env
MQTT_BROKER=localhost
MQTT_PORT=1883
FIREBASE_CREDENTIALS=../../backend/research-2-3478d-firebase-adminsdk-fbsvc-335af8ca98.json
SOCKET_PORT=5001
BACKEND_API_URL=http://localhost:5000
```

### React Native (config.js)
```javascript
export const BACKEND_URL = 'http://192.168.1.x:3000';
```

---

## Workflow Summary

1. **ESP32 boots** → Loads config from EEPROM → Connects to WiFi → Connects to MQTT
2. **Bus moving** → ESP32 publishes GPS to `bus/{id}/gps` every 2 seconds
3. **Backend receives** → Stores in Firebase → Broadcasts via Socket.IO
4. **Web/Mobile apps** → Receive `bus_location_update` → Update map markers
5. **Bus stops** → ESP32 reads sensors → Publishes to `bus/{id}/passenger`
6. **Backend receives** → Stores passenger event → Updates live location → Broadcasts
7. **Apps update** → Show new passenger count on map
