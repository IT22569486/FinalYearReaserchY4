# 🛠️ Technology Stack Documentation

## Smart Bus Safe Speed Prediction & Fleet Management System

This document outlines the programming languages, frameworks, and technologies used across all components of the system.

---

## 📊 Quick Overview Table

| Component | Primary Language | Framework/Platform | Database |
|-----------|------------------|-------------------|----------|
| **Backend** | Python | Flask | MongoDB |
| **Frontend** | JavaScript (JSX) | React + Vite | - |
| **ESP32** | C++ (Arduino) | Arduino Framework | - |

---

## 🖥️ Backend (esp_backend/)

### Primary Language
**Python 3.8+**

### Framework
**Flask** - A lightweight WSGI web application framework

### Key Libraries & Dependencies

| Library | Purpose |
|---------|---------|
| `flask` | Web framework for building REST APIs |
| `flask-cors` | Cross-Origin Resource Sharing support |
| `flask-socketio` | WebSocket support for real-time communication |
| `pymongo` | MongoDB driver for database operations |
| `pandas` | Data manipulation and analysis |
| `lightgbm` | Machine Learning model for safe speed prediction |
| `scikit-learn` | Machine learning utilities and preprocessing |
| `joblib` | Model serialization/deserialization |
| `requests` | HTTP requests (weather API, geocoding) |
| `python-dotenv` | Environment variable management |
| `eventlet` | Concurrent networking library |
| `gunicorn` | WSGI HTTP Server for production |

### Main Files
- `app.py` - Main Flask application (25KB)
- `testEsp32.py` - ESP32 testing utilities
- `lightgbm_safe_speed_model.pkl` - Pre-trained ML model
- `label_encoders.pkl` - Feature encoders for ML preprocessing

### External APIs Used
- **OpenWeatherMap API** - Weather data integration
- **Nominatim (OpenStreetMap)** - Reverse geocoding for location names

---

## 🌐 Frontend (web_dashboard/)

### Primary Language
**JavaScript (ES6+)** with **JSX** syntax for React components

### Framework & Build Tools
- **React 19** - UI component library
- **Vite 7** - Next-generation frontend build tool
- **ESLint** - Code linting and formatting

### Key Libraries & Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI component library |
| `react-dom` | ^19.2.0 | React DOM rendering |
| `react-router-dom` | ^7.11.0 | Client-side routing |
| `axios` | ^1.13.2 | HTTP client for API requests |
| `socket.io-client` | ^4.8.3 | WebSocket client for real-time updates |
| `leaflet` | ^1.9.4 | Interactive maps |
| `react-leaflet` | ^5.0.0 | React wrapper for Leaflet |
| `recharts` | ^3.6.0 | Charting library for data visualization |
| `lucide-react` | ^0.562.0 | Icon library |

### Project Structure
```
web_dashboard/
├── src/
│   ├── components/       # Reusable UI components
│   │   └── Sidebar.jsx   # Navigation sidebar
│   ├── pages/            # Page components
│   │   ├── Dashboard.jsx # Main dashboard
│   │   ├── BusList.jsx   # Fleet list view
│   │   ├── BusDetail.jsx # Individual bus details
│   │   └── MapView.jsx   # Interactive map
│   ├── services/         # API & Socket services
│   │   ├── api.js        # REST API client
│   │   └── socket.js     # WebSocket client
│   ├── hooks/            # Custom React hooks
│   │   └── useFleet.js   # Fleet data hook
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML entry point
└── vite.config.js        # Vite configuration
```

### Styling
- **CSS** - Dark theme with glassmorphism design

---

## 🔌 ESP32 (ESP32/esp_32_code/)

### Primary Language
**C++ (Arduino)** - Using the Arduino framework for ESP32

### Platform
- **ESP32 DevKit V1** or compatible ESP32 boards
- **Arduino IDE** for development and flashing

### Key Libraries Required

| Library | Purpose |
|---------|---------|
| `WiFi.h` | WiFi connectivity |
| `HTTPClient.h` | HTTP requests to backend |
| `ArduinoJson` | JSON parsing and serialization |
| `Adafruit_SSD1306` | OLED display support (optional) |
| `Wire.h` | I2C communication |

### Main File
- `esp_32_code.ino` - ESP32 firmware (16KB)

### Hardware Features
- WiFi configuration portal for easy setup
- REST API communication with backend
- OLED display support for showing safe speed
- GPS module support (NEO-6M)

### ESP32 WiFi Setup
- **AP Name:** `ESP32-BUS-SETUP`
- **Password:** `busconfig123`
- **Configuration URL:** `http://192.168.4.1`

---

## 🗄️ Database

### Database System
**MongoDB** (NoSQL document database)

### Deployment Options
- Local MongoDB installation
- MongoDB Atlas (Cloud-hosted)

### Collections

#### `buses` Collection
Stores current state of each bus:
```javascript
{
  _id: ObjectId,
  vehicle_id: String,
  route_id: String,
  latitude: Number,
  longitude: Number,
  location_name: String,
  safe_speed: Number,
  road_condition: String,
  passenger_count: Number,
  status: String,
  last_update: Date
}
```

#### `telemetry` Collection
Stores historical telemetry data:
```javascript
{
  _id: ObjectId,
  vehicle_id: String,
  route_id: String,
  latitude: Number,
  longitude: Number,
  safe_speed: Number,
  temperature: Number,
  humidity: Number,
  timestamp: Date
}
```

---

## 🤖 Machine Learning

### Model Type
**LightGBM** (Light Gradient Boosting Machine)

### Purpose
Predicting safe driving speeds based on multiple factors:
- Weather conditions (temperature, humidity, rain)
- Road conditions
- Time of day and day of week
- Passenger load
- Location data

### Model Files
- `lightgbm_safe_speed_model.pkl` - Trained prediction model
- `label_encoders.pkl` - Feature encoding for categorical variables

---

## 🔄 Communication Protocols

| Protocol | Usage |
|----------|-------|
| **HTTP/REST** | ESP32 ↔ Backend API communication |
| **WebSocket** | Real-time updates between Backend ↔ Frontend |
| **I2C** | ESP32 ↔ OLED Display communication |

---

## 📋 Summary

| Layer | Technology |
|-------|------------|
| **IoT Device** | ESP32 with C++ (Arduino) |
| **Backend API** | Python + Flask |
| **Machine Learning** | LightGBM |
| **Frontend** | React + JavaScript |
| **Real-time** | Socket.IO (WebSocket) |
| **Database** | MongoDB |
| **Maps** | Leaflet.js |
| **Charts** | Recharts |
| **Build Tool** | Vite |

---

---

## 🗺️ How Location & Map System Works

This section explains how the GPS location data flows through the system and how buses are displayed on the map.

### 📍 Complete Location Data Flow

```
┌─────────────────────┐
│      ESP32          │
│  (Bus Device)       │
│                     │
│  GPS Coordinates:   │
│  - gps_latitude     │    POST /predict
│  - gps_longitude    │ ─────────────────────►
│                     │
│  Sends every 5 sec  │
└─────────────────────┘
                                              ┌─────────────────────────────────┐
                                              │      Backend (Flask)            │
                                              │                                 │
                                              │  1. Receives GPS coordinates    │
                                              │  2. Calls reverse_geocode()     │
                                              │  3. Converts lat/lon → name     │
                                              │  4. Saves to MongoDB            │
                                              │  5. Sends location_name back    │
                                              └──────────┬──────────────────────┘
                                                         │
                                                         │  GET /api/fleet/map-data
                                                         ▼
                                              ┌─────────────────────────────────┐
                                              │      Frontend (React)           │
                                              │                                 │
                                              │  1. Fetches bus coordinates     │
                                              │  2. Displays on Leaflet map     │
                                              │  3. Shows location name popup   │
                                              │  4. Auto-refreshes data         │
                                              └─────────────────────────────────┘
```

---

### 1️⃣ ESP32 - GPS Data Source

**File:** `ESP32/esp_32_code/esp_32_code.ino`

The ESP32 device collects GPS coordinates and sends them to the backend:

```cpp
// GPS coordinates (simulated or from GPS module)
float gps_latitude = 6.912843;   // Colombo area
float gps_longitude = 79.858041;

// Send data to backend every 5 seconds
void sendDataToServer() {
    StaticJsonDocument<256> doc;
    doc["vehicle_id"] = vehicle_id;
    doc["route_id"] = route_id;
    doc["gps_latitude"] = gps_latitude;      // ◄── GPS data
    doc["gps_longitude"] = gps_longitude;    // ◄── GPS data
    doc["passenger_count"] = passenger_count;
    doc["passenger_load_kg"] = passenger_load_kg;
    
    // POST to backend
    http.POST(payload);
}
```

**Key Points:**
- GPS coordinates are sent every **5 seconds** (`SEND_INTERVAL = 5000`)
- Currently using **simulated GPS** (random movement within Colombo bounds)
- Can be replaced with **real GPS module (NEO-6M)** for production

---

### 2️⃣ Backend - Reverse Geocoding

**File:** `esp_backend/app.py`

The backend converts GPS coordinates into human-readable location names using **Nominatim (OpenStreetMap)**:

```python
@lru_cache(maxsize=256)  # Cache results for efficiency
def reverse_geocode_cached(lat_rounded, lon_rounded):
    """Convert GPS coordinates to location name"""
    
    # Call OpenStreetMap Nominatim API
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat_rounded}&lon={lon_rounded}&format=json"
    r = requests.get(url, headers={"User-Agent": "SmartBusFleetSystem/1.0"})
    
    data = r.json()
    addr = data.get("address", {})
    
    # Extract location name (suburb, neighbourhood, town, or city)
    location = (
        addr.get("suburb")
        or addr.get("neighbourhood")
        or addr.get("town")
        or addr.get("city")
        or "Unknown"
    )
    return location
```

**Map Data API Endpoint:**
```python
@app.route("/api/fleet/map-data", methods=["GET"])
def get_map_data():
    """Get all buses with coordinates for map display"""
    
    buses = buses_collection.find({
        "latitude": {"$exists": True},
        "longitude": {"$exists": True}
    })
    
    # Return bus data with location info
    return jsonify({
        "buses": [{
            "vehicle_id": bus.get("vehicle_id"),
            "latitude": bus.get("latitude"),
            "longitude": bus.get("longitude"),
            "location_name": bus.get("location_name"),  # ◄── From geocoding
            "safe_speed": bus.get("safe_speed"),
            "status": "online" if is_online else "offline"
        } for bus in buses]
    })
```

**Key Points:**
- Uses **Nominatim API** (free OpenStreetMap service)
- Results are **cached** to reduce API calls
- Location names include suburb, neighbourhood, town, or city
- Data is stored in **MongoDB** for persistence

---

### 3️⃣ Frontend - Map Visualization

**File:** `web_dashboard/src/pages/MapView.jsx`

The React frontend displays buses on an interactive map using **Leaflet.js**:

```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function MapView() {
    // Fetch bus data from backend
    const { mapData, loading, refetch } = useMapData();
    
    // Default center: Colombo, Sri Lanka
    const defaultCenter = [6.9271, 79.8612];
    
    return (
        <MapContainer center={defaultCenter} zoom={13}>
            {/* Dark-themed map tiles from CartoDB */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Display each bus as a marker */}
            {mapData.map((bus) => (
                <Marker
                    key={bus.vehicle_id}
                    position={[bus.latitude, bus.longitude]}
                    icon={createBusIcon(bus.status)}
                >
                    <Popup>
                        <strong>{bus.vehicle_id}</strong>
                        <p>Location: {bus.location_name}</p>
                        <p>Safe Speed: {bus.safe_speed} km/h</p>
                        <p>Passengers: {bus.passenger_count}</p>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
```

**Key Points:**
- Uses **Leaflet.js** with **React-Leaflet** wrapper
- Map tiles from **CartoDB** (dark theme)
- Custom **bus icons** (green = online, gray = offline)
- **Popup** shows bus details when clicked
- Auto-fits map bounds to show all buses

---

### 📊 Map Data Summary Table

| Component | Technology | Purpose |
|-----------|------------|---------|
| **ESP32** | GPS Module / Simulation | Provides latitude & longitude |
| **Backend** | Nominatim API | Converts coordinates → location name |
| **Backend** | MongoDB | Stores bus location data |
| **Frontend** | Leaflet.js | Renders interactive map |
| **Frontend** | React-Leaflet | React wrapper for Leaflet |
| **Frontend** | CartoDB Tiles | Provides dark-themed map tiles |

---

### 🔄 Real-time Updates

1. **ESP32** sends GPS data every **5 seconds**
2. **Backend** processes and stores in MongoDB
3. **Frontend** fetches and displays on map
4. **WebSocket** provides real-time push updates
5. Map auto-adjusts bounds to show all buses

---

*Document generated on: January 1, 2026*
