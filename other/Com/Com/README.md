# 🚌 Smart Bus Safe Speed Prediction & Fleet Management System

A comprehensive IoT + Full-Stack + Machine Learning system for real-time bus fleet monitoring and safe speed prediction.

![System Architecture](https://img.shields.io/badge/Architecture-ESP32%20%7C%20Flask%20%7C%20React%20%7C%20MongoDB-blue)
![ML Model](https://img.shields.io/badge/ML%20Model-LightGBM-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Running the System](#-running-the-system)
- [API Documentation](#-api-documentation)
- [ESP32 Setup](#-esp32-setup)
- [Web Dashboard](#-web-dashboard)
- [Database Schema](#-database-schema)

---

## 🎯 System Overview

This system provides:

- **Real-time Safe Speed Prediction** using a pre-trained LightGBM model
- **Automatic Weather Data Integration** via OpenWeatherMap API
- **Reverse Geocoding** for location name derivation
- **Live Fleet Monitoring** through a React dashboard
- **Interactive Map View** with Leaflet
- **WebSocket Real-time Updates**
- **MongoDB Data Persistence**

### Key Features

| Component | Features |
|-----------|----------|
| **ESP32** | WiFi configuration portal, REST API communication, OLED display support |
| **Backend** | ML prediction, weather integration, geocoding, fleet management APIs |
| **Dashboard** | Real-time stats, bus list, detailed views, interactive map |

---

## 🏗 Architecture

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────────┐
│     ESP32       │ ──────────────────>│    Flask Backend     │
│   (Bus Device)  │                    │   - ML Prediction    │
│                 │ <──────────────────│   - Weather API      │
│  - GPS          │   Safe Speed       │   - Geocoding        │
│  - Passengers   │   Response         │   - Database Ops     │
│  - OLED Display │                    └──────────┬───────────┘
└─────────────────┘                               │
                                                  │ WebSocket
                                                  │ REST API
                                                  ▼
                                    ┌──────────────────────────┐
                                    │     React Dashboard      │
                                    │   - Fleet Overview       │
                                    │   - Bus List/Details     │
                                    │   - Interactive Map      │
                                    │   - Charts & Analytics   │
                                    └──────────────────────────┘
```

---

## 📁 Project Structure

```
Com/
├── ESP32/
│   └── esp_32_code.ino          # ESP32 firmware
│
├── esp_backend/
│   ├── app.py                   # Main Flask application
│   ├── testEsp32.py             # Original test API
│   ├── lightgbm_safe_speed_model.pkl  # ML model
│   ├── label_encoders.pkl       # Feature encoders
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables
│   └── .env.example             # Environment template
│
└── web_dashboard/
    ├── src/
    │   ├── components/
    │   │   └── Sidebar.jsx      # Navigation sidebar
    │   ├── pages/
    │   │   ├── Dashboard.jsx    # Main dashboard
    │   │   ├── BusList.jsx      # Bus fleet list
    │   │   ├── BusDetail.jsx    # Individual bus details
    │   │   └── MapView.jsx      # Interactive map
    │   ├── services/
    │   │   ├── api.js           # API service layer
    │   │   └── socket.js        # WebSocket service
    │   ├── hooks/
    │   │   └── useFleet.js      # Custom React hooks
    │   ├── App.jsx              # Main app component
    │   ├── main.jsx             # Entry point
    │   └── index.css            # Global styles
    ├── public/
    ├── index.html
    ├── package.json
    └── .env                     # Frontend environment
```

---

## 💿 Installation

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **MongoDB** (local or Atlas)
- **Arduino IDE** (for ESP32)

### 1. Backend Setup

```bash
cd esp_backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd web_dashboard

# Install dependencies
npm install
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod --dbpath /path/to/data
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGO_URI` in `.env`

---

## ⚙️ Configuration

### Backend Environment Variables (`.env`)

```env
# OpenWeatherMap API Key
OPENWEATHER_API_KEY=your_api_key_here

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/
DB_NAME=bus_fleet_db
```

### Frontend Environment Variables (`.env`)

```env
# Backend API URL
VITE_API_URL=http://localhost:5000
```

### ESP32 Configuration

Update in `esp_32_code.ino`:
```cpp
const char *serverURL = "http://YOUR_SERVER_IP:5000/predict";
```

---

## 🚀 Running the System

### 1. Start MongoDB

```bash
# Local MongoDB
mongod
```

### 2. Start Backend Server

```bash
cd esp_backend
python app.py
```

Server runs at: `http://localhost:5000`

### 3. Start Frontend Dashboard

```bash
cd web_dashboard
npm run dev
```

Dashboard runs at: `http://localhost:5173`

### 4. Flash ESP32

1. Open `esp_32_code.ino` in Arduino IDE
2. Select Board: ESP32 Dev Module
3. Install required libraries:
   - ArduinoJson
   - (Optional) Adafruit_SSD1306
4. Upload to ESP32

---

## 📚 API Documentation

### ESP32 Endpoints

#### `POST /predict`
Receive telemetry and return safe speed prediction.

**Request:**
```json
{
  "vehicle_id": "BUS_001",
  "route_id": "177_Kaduwela_Kollupitiya",
  "gps_latitude": 6.912843,
  "gps_longitude": 79.858041,
  "passenger_count": 25,
  "passenger_load_kg": 1500
}
```

**Response:**
```json
{
  "safe_speed": 42.5,
  "location_name": "Rajagiriya",
  "road_condition": "Dry",
  "direction": "Kaduwela_to_Kollupitiya",
  "temperature": 28.5,
  "humidity": 75
}
```

### Fleet Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fleet/overview` | GET | Fleet statistics overview |
| `/api/fleet/buses` | GET | List all buses |
| `/api/fleet/buses/:id` | GET | Get specific bus details |
| `/api/fleet/buses/:id/history` | GET | Get bus telemetry history |
| `/api/fleet/map-data` | GET | Get data for map view |
| `/api/fleet/routes` | GET | List all routes |
| `/api/fleet/statistics` | GET | Detailed statistics |
| `/health` | GET | Health check |

---

## 🔧 ESP32 Setup

### Hardware Requirements

- ESP32 DevKit V1 or similar
- SSD1306 OLED Display (optional, I2C)
- GPS Module NEO-6M (optional for real GPS)

### Wiring (OLED)

| OLED Pin | ESP32 Pin |
|----------|-----------|
| VCC | 3.3V |
| GND | GND |
| SCL | GPIO 22 |
| SDA | GPIO 21 |

### First Time Setup

1. Power on ESP32
2. Connect to WiFi: `ESP32-BUS-SETUP`
3. Password: `busconfig123`
4. Open browser: `http://192.168.4.1`
5. Enter WiFi credentials and bus info
6. Click "Save & Connect"

---

## 🖥 Web Dashboard

### Pages

1. **Dashboard** - Overview with stats, charts, and active buses
2. **Bus Fleet** - Searchable, filterable list of all buses
3. **Bus Detail** - Individual bus with history and charts
4. **Live Map** - Interactive map showing all bus locations

### Features

- 🔄 Auto-refresh data every 5 seconds
- 📡 WebSocket real-time updates
- 🔍 Search and filter functionality
- 📊 Interactive charts (Recharts)
- 🗺️ Interactive maps (Leaflet)
- 🌙 Dark theme with glassmorphism

---

## 🗄 Database Schema

### MongoDB Collections

#### `buses` Collection
```javascript
{
  _id: ObjectId,
  vehicle_id: String,
  route_id: String,
  latitude: Number,
  longitude: Number,
  location_name: String,
  direction: String,
  safe_speed: Number,
  road_condition: String,
  passenger_count: Number,
  passenger_load_kg: Number,
  temperature: Number,
  humidity: Number,
  last_update: Date,
  status: String
}
```

#### `telemetry` Collection
```javascript
{
  _id: ObjectId,
  vehicle_id: String,
  route_id: String,
  latitude: Number,
  longitude: Number,
  location_name: String,
  direction: String,
  safe_speed: Number,
  road_condition: String,
  passenger_count: Number,
  passenger_load_kg: Number,
  temperature: Number,
  humidity: Number,
  timestamp: Date
}
```

---

## 📝 Features Derived by Backend

| Feature | Source |
|---------|--------|
| `direction` | Trip start GPS comparison |
| `location_name` | Nominatim reverse geocoding |
| `temperature` | OpenWeatherMap API |
| `humidity` | OpenWeatherMap API |
| `rain_intensity` | Mapped from rain mm |
| `road_condition` | Derived from rain + humidity |
| `hour_of_day` | System time |
| `day_of_week` | System time |
| `is_weekend` | Calculated from day |
| `is_peak_hours` | 7-9 AM, 4-7 PM |
| `season` | Derived from month |
| `is_night` | 8 PM - 5 AM |
| `load_per_passenger` | Calculated |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Authors

- Smart Bus Fleet Team

---

## 🙏 Acknowledgments

- LightGBM for the ML model
- OpenWeatherMap for weather data
- OpenStreetMap for geocoding
- Flask for the backend framework
- React for the frontend
- Leaflet for maps
