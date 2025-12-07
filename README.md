# CTB Bus Device Health Monitoring System

A comprehensive IoT-based device health monitoring system for Sri Lanka Ceylon Transport Board (CTB) buses. This system monitors rule violation detection devices deployed on buses and provides real-time status updates to a central dashboard.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CTB Monitoring System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌──────────────┐        MQTT        ┌──────────────────────────┐  │
│   │  Raspberry   │ ──────────────────▶│     Node.js Backend      │  │
│   │  Pi Device   │    (with Queue)    │  - MQTT Broker (Aedes)   │  │
│   │              │                    │  - REST API (Express)    │  │
│   │ - YOLOv8     │◀────────────────── │  - MongoDB Database      │  │
│   │ - MiDaS      │                    │  - Socket.IO             │  │
│   │ - Health Mon │                    └───────────┬──────────────┘  │
│   └──────────────┘                                │                  │
│                                                   │ WebSocket        │
│   ┌──────────────┐                                ▼                  │
│   │  Raspberry   │                    ┌──────────────────────────┐  │
│   │  Pi Device   │ ──────────────────▶│      Web Dashboard       │  │
│   └──────────────┘                    │  - Real-time Updates     │  │
│                                       │  - Device Status         │  │
│   ┌──────────────┐                    │  - Violations Log        │  │
│   │  Raspberry   │ ──────────────────▶│  - Health Metrics        │  │
│   │  Pi Device   │                    └──────────────────────────┘  │
│   └──────────────┘                                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### Device Side (Raspberry Pi)
- **Health Monitoring**: CPU, Memory, Disk, Temperature metrics
- **Offline Queue**: SQLite-based message queue for connectivity issues
- **Auto-reconnect**: Automatic MQTT reconnection
- **2-Hour Updates**: Periodic health status updates
- **Violation Reporting**: Lane departure and other violations
- **Unique Device Key**: Each bus has a unique identifier

### Backend (Node.js)
- **Embedded MQTT Broker**: Using Aedes
- **MongoDB Database**: Stores devices, health logs, violations
- **REST API**: Full CRUD operations
- **WebSocket**: Real-time updates via Socket.IO
- **Auto-registration**: New devices auto-register on first connection

### Dashboard
- **Real-time Status**: Live device online/offline status
- **Health Metrics**: CPU, Memory, Disk usage visualization
- **Violation Alerts**: Real-time violation notifications
- **Device Management**: Register, view, update devices
- **Statistics**: Summary cards and analytics

## Project Structure

```
Final_reserch_stucture/
├── device/                          # Raspberry Pi device code
│   ├── object_distance_measurement.py  # Main detection app
│   ├── device_health_monitor.py     # Health monitoring module
│   ├── device_config.json           # Device configuration
│   ├── requirements.txt             # Python dependencies
│   └── ...                          # Detection models
│
└── backend/                         # Node.js backend
    ├── src/
    │   ├── server.js               # Main server entry
    │   ├── models/                 # MongoDB schemas
    │   │   ├── BusDevice.js
    │   │   ├── HealthLog.js
    │   │   └── Violation.js
    │   ├── routes/                 # REST API routes
    │   │   ├── devices.js
    │   │   └── violations.js
    │   ├── mqtt/
    │   │   └── mqttBroker.js      # MQTT broker handler
    │   └── scripts/
    │       └── seed.js            # Test data seeder
    ├── public/
    │   └── index.html             # Dashboard UI
    ├── package.json
    └── .env                       # Configuration
```

## Installation

### Backend Setup

1. **Install MongoDB**
   ```bash
   # Windows: Download from https://www.mongodb.com/try/download/community
   # Or use MongoDB Atlas cloud
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Edit .env file
   MONGODB_URI=mongodb://localhost:27017/ctb_device_monitor
   PORT=3000
   MQTT_PORT=1883
   ```

4. **Start Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Seed Test Data (Optional)**
   ```bash
   npm run seed
   ```

6. **Access Dashboard**
   - Open: http://localhost:3000

### Device Setup (Raspberry Pi)

1. **Install Python Dependencies**
   ```bash
   cd device
   pip install -r requirements.txt
   ```

2. **Configure Device**
   Edit `device_config.json`:
   ```json
   {
     "device_key": "",
     "bus_number": "NA-1234",
     "route_number": "138",
     "mqtt_broker": "YOUR_SERVER_IP",
     "mqtt_port": 1883,
     "health_interval_seconds": 7200
   }
   ```
   - Leave `device_key` empty for auto-generation
   - Or use a key from the dashboard's "Register Device" feature

3. **Run Detection System**
   ```bash
   python object_distance_measurement.py
   ```

## API Endpoints

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/stats` | Get statistics |
| GET | `/api/devices/:key` | Get device details |
| POST | `/api/devices/register` | Register new device |
| PUT | `/api/devices/:key` | Update device |
| DELETE | `/api/devices/:key` | Deactivate device |
| GET | `/api/devices/:key/health-history` | Get health logs |
| GET | `/api/devices/:key/violations` | Get violations |

### Violations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/violations` | List violations |
| GET | `/api/violations/stats` | Get violation stats |
| GET | `/api/violations/recent` | Recent violations |
| PUT | `/api/violations/:id/review` | Mark as reviewed |

## MQTT Topics

```
ctb/bus/{device_key}/status    - Online/offline status
ctb/bus/{device_key}/health    - Health updates (every 2 hours)
ctb/bus/{device_key}/violation - Violation reports
```

## Health Update Payload

```json
{
  "device_key": "CTB-XXXX-XXXX",
  "bus_number": "NA-1234",
  "route_number": "138",
  "timestamp": "2025-12-06T10:00:00Z",
  "system": {
    "cpu_percent": 45.2,
    "memory_percent": 62.1,
    "disk_percent": 55.0,
    "temperature": 52.3,
    "uptime_seconds": 86400
  },
  "detection": {
    "lane_detection": true,
    "object_detection": true,
    "depth_estimation": true,
    "camera_active": true
  },
  "queue_size": 0,
  "mqtt_connected": true
}
```

## Offline Queue

When network connectivity is lost:
1. Messages are stored in SQLite database (`device_queue.db`)
2. Queue persists across device restarts
3. Messages are sent when connectivity is restored
4. Dashboard shows `queued_at` and `sent_at` timestamps

## Dashboard Features

### Statistics Cards
- Total registered devices
- Online/Offline count
- Today's violations

### Device Cards
- Bus number and route
- Online/Offline status
- Last seen time
- Health metrics (CPU, Memory)
- Detection capabilities

### Real-time Updates
- Device status changes
- New health updates
- Violation alerts (with toast notifications)

## Troubleshooting

### Device not connecting
1. Check MQTT broker IP in `device_config.json`
2. Verify port 1883 is open
3. Check device logs for connection errors

### Dashboard not updating
1. Verify WebSocket connection (check browser console)
2. Ensure MongoDB is running
3. Check backend logs

### Queue growing
1. Check network connectivity
2. Verify MQTT broker is accessible
3. Check firewall settings

## License

MIT License - Free for educational and commercial use.

## Support

For issues and feature requests, please create an issue in the repository.
