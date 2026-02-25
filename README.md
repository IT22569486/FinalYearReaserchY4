# safety monitoring system for sri lanka public transport buses

## Sri Lanka Public Transport Safety Enhancement using IoT and AI

**Sri Lanka Institute of Information Technology (SLIIT)**  
**Faculty of Computing**  
**Final Year Research Project 2025/2026**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Individual Components](#individual-components)
7. [Installation & Setup](#installation--setup)
8. [Running the System](#running-the-system)
9. [API Documentation](#api-documentation)
10. [Team Members & Contributions](#team-members--contributions)
11. [Version Control Guidelines](#version-control-guidelines)
12. [License](#license)

---

## Project Overview

This Final Year Research Project focuses on developing a comprehensive **IoT-based Rule Violation Detection and Monitoring System** for **Ceylon Transport Board (CTB)** buses in Sri Lanka. The system aims to enhance public transport safety by leveraging cutting-edge technologies including:

- **Computer Vision** for lane departure and object detection
- **Machine Learning** for safe speed prediction
- **IoT Sensors** for real-time telemetry
- **Cloud Infrastructure** for centralized monitoring

### Problem Statement
Public bus transport in Sri Lanka faces significant safety challenges including reckless driving, lane violations, and speeding. This project addresses these issues by implementing an automated monitoring and warning system.

### Objectives
- Detect lane departures and unsafe driving behaviors in real-time
- Predict safe driving speeds based on environmental conditions
- Monitor device health across the fleet
- Provide real-time dashboards for transport authorities
- Enable passenger safety through advanced driver assistance systems (ADAS)

---

## Key Features

| Feature | Description | Technology |
|---------|-------------|------------|
| **Lane Departure Warning** | Detects when vehicle approaches solid lanes | YOLOv8 Segmentation |
| **Object Detection** | Identifies vehicles and obstacles on road | YOLOv8 Detection |
| **Depth Estimation** | Measures distance to detected objects | MiDaS ONNX Model |
| **Safe Speed Prediction** | ML-based speed recommendations | LightGBM |
| **Device Health Monitoring** | Tracks CPU, Memory, Temperature | MQTT + Firebase |
| **Real-time Dashboard** | Live fleet monitoring | React + Socket.IO |
| **Mobile App** | Passenger-facing application | React Native + Expo |
| **Offline Support** | Queue messages when no connectivity | SQLite |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CTB Bus Safety Monitoring System - Architecture               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           BUS UNIT (Raspberry Pi)                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │  Camera Module  │  │  GPS Module     │  │  ESP32 Unit     │           │   │
│  │  │  - Lane Detect  │  │  - Location     │  │  - Telemetry    │           │   │
│  │  │  - Object Detect│  │  - Speed        │  │  - Sensors      │           │   │
│  │  │  - Depth Est.   │  │  - Route Track  │  │  - Passenger    │           │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │   │
│  │           │                    │                    │                     │   │
│  │           └──────────────┬─────┴─────┬──────────────┘                     │   │
│  │                          │           │                                    │   │
│  │                    ┌─────▼─────┐ ┌───▼───────────┐                        │   │
│  │                    │   MQTT    │ │  HTTP/REST    │                        │   │
│  │                    │  Client   │ │    Client     │                        │   │
│  │                    └─────┬─────┘ └───────┬───────┘                        │   │
│  └──────────────────────────┼───────────────┼────────────────────────────────┘   │
│                             │               │                                    │
│                             │  INTERNET     │                                    │
│                             │               │                                    │
│  ┌──────────────────────────▼───────────────▼────────────────────────────────┐   │
│  │                         CLOUD BACKEND SERVICES                             │   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────────┐   │   │
│  │  │    Node.js Backend          │    │     Flask Backend (ESP)          │   │   │
│  │  │  ┌───────────────────────┐  │    │  ┌────────────────────────────┐  │   │   │
│  │  │  │ Express REST API      │  │    │  │  ML Prediction Service     │  │   │   │
│  │  │  │ - User Management     │  │    │  │  - LightGBM Model          │  │   │   │
│  │  │  │ - Bus Management      │  │    │  │  - Safe Speed Prediction   │  │   │   │
│  │  │  │ - Trip Tracking       │  │    │  │  - Weather Integration     │  │   │   │
│  │  │  │ - Route Management    │  │    │  └────────────────────────────┘  │   │   │
│  │  │  └───────────────────────┘  │    │  ┌────────────────────────────┐  │   │   │
│  │  │  ┌───────────────────────┐  │    │  │  Socket.IO Server          │  │   │   │
│  │  │  │ MQTT Broker (Aedes)   │  │    │  │  - Real-time Updates       │  │   │   │
│  │  │  │ - Device Health       │  │    │  │  - Telemetry Stream        │  │   │   │
│  │  │  │ - Violation Reports   │  │    │  └────────────────────────────┘  │   │   │
│  │  │  └───────────────────────┘  │    │  ┌────────────────────────────┐  │   │   │
│  │  │  ┌───────────────────────┐  │    │  │  MongoDB                   │  │   │   │
│  │  │  │ Socket.IO Server      │  │    │  │  - Telemetry Data          │  │   │   │
│  │  │  │ - Real-time Push      │  │    │  │  - Predictions             │  │   │   │
│  │  │  └───────────────────────┘  │    │  └────────────────────────────┘  │   │   │
│  │  └──────────────┬──────────────┘    └─────────────────┬───────────────┘   │   │
│  │                 │                                     │                    │   │
│  │                 │         ┌───────────────┐           │                    │   │
│  │                 └─────────►   Firebase    ◄───────────┘                    │   │
│  │                           │   Firestore   │                                │   │
│  │                           │  - Devices    │                                │   │
│  │                           │  - Violations │                                │   │
│  │                           │  - Users      │                                │   │
│  │                           │  - Buses      │                                │   │
│  │                           │  - Routes     │                                │   │
│  │                           └───────┬───────┘                                │   │
│  └───────────────────────────────────┼────────────────────────────────────────┘   │
│                                      │                                            │
│  ┌───────────────────────────────────▼────────────────────────────────────────┐   │
│  │                          CLIENT APPLICATIONS                                │   │
│  │                                                                             │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │   │
│  │  │   Web Dashboard    │  │   ESP Dashboard    │  │   Mobile App       │    │   │
│  │  │   (React + MUI)    │  │   (React + Vite)   │  │   (React Native)   │    │   │
│  │  │                    │  │                    │  │                    │    │   │
│  │  │  - Device Status   │  │  - Fleet Overview  │  │  - Bus Routes      │    │   │
│  │  │  - Health Monitor  │  │  - Live Map        │  │  - Live Tracking   │    │   │
│  │  │  - Violations      │  │  - Speed Predict   │  │  - Timetable       │    │   │
│  │  │  - Statistics      │  │  - Telemetry       │  │  - Profile         │    │   │
│  │  └────────────────────┘  └────────────────────┘  └────────────────────┘    │   │
│  │                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sensors   │────▶│  Raspberry  │────▶│   Backend   │────▶│  Dashboard  │
│   Camera    │     │     Pi      │     │   Server    │     │    Apps     │
│   GPS       │     │  Processing │     │  Firebase   │     │   Mobile    │
│   ESP32     │     │    ADAS     │     │   MongoDB   │     │     Web     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │ Raw Data          │ MQTT/HTTP         │ WebSocket         │ UI Display
      │                   │ Processed         │ Real-time         │
      ▼                   ▼                   ▼                   ▼
  [Capture]          [Process]          [Store/Route]        [Visualize]
```

---

## Technology Stack

### Backend Services

| Component | Technology | Purpose |
|-----------|------------|---------|
| Main API Server | Node.js + Express | REST API, MQTT Broker |
| ESP Backend | Python + Flask | ML Predictions, Telemetry |
| Database | Firebase Firestore | Primary data storage |
| Database | MongoDB | Telemetry & predictions |
| Real-time | Socket.IO | WebSocket connections |
| IoT Protocol | MQTT (Aedes) | Device communication |
| Authentication | JWT + bcrypt | User authentication |

### Frontend Applications

| Application | Technology | Purpose |
|-------------|------------|---------|
| Web Dashboard | React + Material UI | Admin monitoring |
| ESP Dashboard | React + Vite + Leaflet | Fleet tracking |
| Mobile App | React Native + Expo | Passenger app |

### Device/Edge Computing

| Component | Technology | Purpose |
|-----------|------------|---------|
| Main Controller | Raspberry Pi 4 | Edge computing |
| Microcontroller | ESP32 | Sensor integration |
| Inference Engine | ONNX Runtime | Lightweight model inference |
| Vision Library | OpenCV | Image processing |
| Shared Config | `device_config.json` | Single config for all components |

### Machine Learning Models

| Model | Type | ONNX | Purpose |
|-------|------|------|---------|
| YOLOv8 Segmentation | Computer Vision | `.pt` (needs masks) | Lane detection |
| YOLOv8 Detection | Computer Vision | ✅ `.onnx` | Road object detection |
| YOLOv8n + best | Computer Vision | ✅ `.onnx` | Driver monitoring (phone/seatbelt) |
| MiDaS Small | Depth Estimation | ✅ `.onnx` | Distance measurement |
| LightGBM | Regression | `.pkl` | Safe speed prediction |

> **ONNX conversion:** Run `python device/export_models_to_onnx.py` once on a dev machine (needs `ultralytics`), then copy `.onnx` files to the Pi. At runtime only `onnxruntime` is needed — no PyTorch or ultralytics.

---

## Project Structure

```
FinalYearResearchY4/
|
+-- backend/                         # Node.js Backend Server
|   +-- server.js                    # Main server entry point
|   +-- firebase.js                  # Firebase configuration
|   +-- package.json                 # Node.js dependencies
|   +-- controllers/                 # Business logic controllers
|   |   +-- busController.js         # Bus management
|   |   +-- deviceController.js      # Device health management
|   |   +-- routeController.js       # Route management
|   |   +-- tripController.js        # Trip tracking
|   |   +-- userController.js        # User management
|   |   +-- violationController.js   # Violation handling
|   +-- routes/                      # API route definitions
|   +-- services/                    # Service layer
|   +-- middleware/                  # Express middleware
|   +-- mqtt/                        # MQTT broker configuration
|   +-- public/                      # Static dashboard files
|
+-- device/                          # Raspberry Pi Device Code
|   +-- main.py                      # Main orchestrator (starts all components)
|   +-- device_health_monitor.py     # Health monitoring system
|   +-- device_config.json           # Central config (bus, MQTT, camera, components)
|   +-- requirements.txt             # Python dependencies
|   +-- export_models_to_onnx.py     # Convert .pt models → .onnx (run on dev machine)
|   +-- shared/                      # Shared utilities
|       +-- config.py                # DeviceConfig — typed config accessor
|       +-- onnx_yolo.py             # Lightweight ONNX YOLO wrapper
|   +-- context_aware_monitoring/    # Computer Vision Components
|       +-- object_distance_measurement.py  # Main: object + lane + depth
|       +-- driver_behavior_analyzer.py
|       +-- lane_memory_tracker.py
|       +-- adaptive_processor.py
|       +-- models/                  # ML models (YOLOv8 .pt/.onnx, MiDaS)
|   +-- driver_monitoring/           # Driver Monitoring System
|       +-- driver_monitor.py        # Drowsiness, phone, seatbelt detection
|       +-- models/                  # DMS models (yolov8n, best .pt/.onnx)
|   +-- safe_speed_monitoring/       # Safe Speed Prediction
|       +-- safe_speed_monitor.py    # LightGBM + weather-based speed advice
|
+-- esp_32_code/                     # ESP32 Microcontroller Code
|   +-- esp_32_code.ino              # Arduino firmware
|
+-- esp_backend/                     # Flask Backend for ESP
|   +-- app.py                       # Flask server
|   +-- requirements.txt             # Python dependencies
|   +-- *.pkl                        # ML model files
|
+-- esp_frontend/                    # Vite React Dashboard
|   +-- package.json                 # Node.js dependencies
|   +-- src/
|       +-- components/              # React components
|       +-- pages/                   # Page components
|       +-- hooks/                   # Custom hooks
|       +-- services/                # API services
|
+-- webfrontend/                     # React Admin Dashboard
|   +-- package.json                 # Node.js dependencies
|   +-- src/
|       +-- components/              # Dashboard components
|       +-- services/                # API services
|
+-- frontend/                        # React Native Mobile App
|   +-- package.json                 # Dependencies
|   +-- App.js                       # App entry point
|   +-- src/
|       +-- screens/                 # App screens
|       +-- components/              # Reusable components
|       +-- navigation/              # Navigation config
|       +-- api/                     # API services
|
+-- README.md                        # This file
+-- DEVICE_MONITORING_README.md      # Device monitoring guide
+-- .gitignore                       # Git ignore rules
```

---

## Installation & Setup

### Prerequisites

- **Node.js** >= 18.x
- **Python** >= 3.9
- **npm** or **yarn**
- **Arduino IDE** (for ESP32)
- **Firebase Account**
- **MongoDB Atlas Account**

### 1. Clone the Repository

```bash
git clone https://github.com/IT22569486/FinalYearReaserchY4.git
cd FinalYearReaserchY4
```

### 2. Backend Setup (Node.js)

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Firebase and MongoDB credentials

# Configure Firebase
cp serviceAccountKey.example.json serviceAccountKey.json
# Add your Firebase service account credentials

# Start the server
npm run dev
```

### 3. ESP Backend Setup (Python)

```bash
cd esp_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the server
python app.py
```

### 4. Device Setup (Raspberry Pi)

```bash
cd device

# Create virtual environment
python -m venv device_venv
source device_venv/bin/activate  # On Windows: device_venv\Scripts\activate

# Install dependencies (onnxruntime-based, no ultralytics needed on Pi)
pip install -r requirements.txt

# Configure device — edit bus number, MQTT broker, camera, video source, etc.
nano device_config.json

# (One-time, on dev machine only) Convert YOLO .pt models to ONNX
pip install ultralytics   # only needed for this step
python export_models_to_onnx.py
# Then copy the generated .onnx files to the Pi under models/ folders

# Run the system
python main.py
```

#### device_config.json — key settings

```json
{
  "bus_number": "NA-2255",
  "route_number": "171",
  "mqtt_broker": "your-server.com",
  "mqtt_port": 1883,
  "vehicle_speed_kmh": 40,
  "camera": { "index": 0, "width": 640, "height": 480, "fps": 15 },
  "components": {
    "context_aware_monitoring": {
      "enabled": true,
      "use_onnx": true,
      "video_source": "0",
      "show_gui": true,
      "enable_adaptive_processing": true
    },
    "driver_monitoring": {
      "enabled": true,
      "use_onnx": true,
      "show_gui": true
    },
    "safe_speed_monitoring": { "enabled": true }
  }
}
```

> Set `"video_source"` to `"0"` for live webcam, or a file path like `"/home/pi/videos/dash.mp4"` for recorded video.

### 5. Web Dashboard Setup

```bash
cd webfrontend

# Install dependencies
npm install

# Start development server
npm start
```

### 6. ESP Dashboard Setup

```bash
cd esp_frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 7. Mobile App Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start
```

---

## Running the System

### Development Mode

```bash
# Terminal 1 - Node.js Backend
cd backend && npm run dev

# Terminal 2 - Flask Backend
cd esp_backend && python app.py

# Terminal 3 - Web Dashboard
cd webfrontend && npm start

# Terminal 4 - ESP Dashboard
cd esp_frontend && npm run dev

# Terminal 5 - Mobile App
cd frontend && npm start

# Terminal 6 - Device (Raspberry Pi)
cd device && python main.py
```

### Production Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Node.js Backend | Render/Railway | `https://your-backend.onrender.com` |
| Flask Backend | Render | `https://safe-speed-api.onrender.com` |
| Web Dashboard | Vercel/Netlify | `https://your-dashboard.vercel.app` |
| Mobile App | Expo Go / App Stores | - |

---

## API Documentation

### Main Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/user/register` | User registration |
| POST | `/api/user/login` | User authentication |
| GET | `/api/bus` | Get all buses |
| GET | `/api/bus/:id` | Get specific bus |
| GET | `/api/devices` | Get all devices |
| GET | `/api/devices/:key` | Get device by key |
| GET | `/api/violations` | Get all violations |
| POST | `/api/violations` | Report violation |
| GET | `/api/routes` | Get all routes |
| GET | `/api/trip` | Get trips |

### ESP Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Get safe speed prediction |
| GET | `/buses` | Get bus fleet |
| POST | `/telemetry` | Submit telemetry data |

### MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `ctb/device/{key}/health` | Device → Server | Health updates |
| `ctb/device/{key}/status` | Device → Server | Online/offline status |
| `ctb/device/{key}/violations` | Device → Server | Rule violations |
| `ctb/device/{key}/command` | Server → Device | Remote commands |

---




---

## Version Control Guidelines

### Git Workflow

1. **Never commit directly to `main`** - Always use feature branches
2. **Create branch from `main`** for new features
3. **Use meaningful commit messages** following conventional commits
4. **Create Pull Requests** for code review before merging
5. **Resolve conflicts** locally before pushing


**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(lane-detection): add YOLOv8 segmentation model"
git commit -m "fix(mqtt): resolve offline queue sync issue"
git commit -m "docs(readme): update installation guide"

---

## Environment Variables

### ESP Backend (.env)

```env
MONGO_URI=mongodb+srv://...
DB_NAME=bus_speed_predict_api
OPENWEATHER_API_KEY=your-api-key
```

### Device (device_config.json)

```json
{
  "device_key": "CTB-B89A2A4BFD2E-4D73EAD0",
  "bus_number": "NA-2255",
  "route_number": "171",
  "mqtt_broker": "your-server.com",
  "mqtt_port": 1883,
  "vehicle_speed_kmh": 40,
  "camera": { "index": 0 },
  "components": {
    "context_aware_monitoring": { "enabled": true, "use_onnx": true, "video_source": "0" },
    "driver_monitoring": { "enabled": true, "use_onnx": true },
    "safe_speed_monitoring": { "enabled": true }
  }
}
```

---

## Project Management

This project uses **MS Planner** for task management and sprint planning. Key milestones:

- [x] Project Setup & Architecture Design
- [x] Backend API Development
- [x] Device Health Monitoring System
- [x] Context-Aware Monitoring Implementation
- [x] Safe Speed Prediction Model
- [x] Web Dashboard Development
---

## License

This project is developed as part of the Final Year Research Project at **Sri Lanka Institute of Information Technology (SLIIT)**. All rights reserved.

---

## Contact

For any queries regarding this project, please contact:

- **Project Supervisor:** Miss Shamalee Thisara
- **Institution:** Sri Lanka Institute of Information Technology (SLIIT)
- **Repository:** [https://github.com/IT22569486/FinalYearReaserchY4](https://github.com/IT22569486/FinalYearReaserchY4)

---

## Acknowledgments

- Ceylon Transport Board (CTB) for domain expertise
- Sri Lanka Institute of Information Technology (SLIIT) for academic guidance
- Miss Shamalee Thisara for project supervision and mentorship
- Open source community for the amazing tools and libraries

---
