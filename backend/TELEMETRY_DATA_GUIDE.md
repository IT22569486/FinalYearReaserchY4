# Telemetry Data Storage & Verification Guide

## Overview
The system now stores complete telemetry data from ESP32 devices in Firebase Firestore. Each telemetry message is captured and stored both in real-time and historical collections.

## Data Flow

```
ESP32 Device
    ↓
    └─→ MQTT Topic: bus/{bus_id}/telemetry
         ↓
         └─→ Backend MQTT Broker (mqttBroker.js)
              ↓
              ├─→ bus_live_locations (Current/Latest)
              ├─→ bus_telemetry_history (Full History)
              ├─→ buses (Main collection)
              └─→ Socket.IO Broadcast (Real-time Dashboard)
```

## Telemetry Message Format (from ESP32)

```json
{
  "bus_id": "NA-225566",
  "route_id": "177_Kaduwela_Kollupitiya",
  "latitude": 6.911394,
  "longitude": 79.87684,
  "speed": 38,
  "passenger_in_count": 37,
  "passenger_out_count": 15,
  "total_passenger_count": 27,
  "total_weight": 1770,
  "gps_valid": true,
  "timestamp": 271025
}
```

## Firebase Collections

### 1. **bus_live_locations**
Stores the **latest/current** telemetry for each bus (updated in real-time)

```
Collection: bus_live_locations
├─ Document: {bus_id}
   ├─ bus_id: string
   ├─ route_id: string
   ├─ route_name: string
   ├─ latitude: number
   ├─ longitude: number
   ├─ speed: number
   ├─ passenger_count: number
   ├─ total_weight: number
   ├─ gps_valid: boolean
   ├─ status: string ("online"/"offline")
   ├─ last_updated: timestamp
   └─ device_timestamp: number
```

### 2. **bus_telemetry_history**
Stores **all telemetry records** for analytics and history tracking

```
Collection: bus_telemetry_history
├─ Document: {auto-generated ID}
   ├─ bus_id: string
   ├─ route_id: string
   ├─ route_name: string
   ├─ latitude: number
   ├─ longitude: number
   ├─ speed: number
   ├─ passenger_count: number
   ├─ total_weight: number
   ├─ gps_valid: boolean
   ├─ timestamp: timestamp
   └─ device_timestamp: number
```

### 3. **bus_passenger_events**
Stores detailed passenger activity events

```
Collection: bus_passenger_events
├─ Document: {auto-generated ID}
   ├─ bus_id: string
   ├─ route_id: string
   ├─ in_count: number
   ├─ out_count: number
   ├─ total_passenger_count: number
   ├─ total_weight: number
   ├─ latitude: number
   ├─ longitude: number
   ├─ timestamp: timestamp
   └─ device_timestamp: number
```

### 4. **buses**
Main bus collection with configuration and status

```
Collection: buses
├─ Document: {auto-generated ID}
   ├─ busId: string
   ├─ busNumber: string
   ├─ routeId: string
   ├─ routeNumber: string
   ├─ capacity: number
   ├─ occupancy: number
   ├─ status: string
   ├─ location: { lat, lng }
   ├─ speed: number
   ├─ createdAt: timestamp
   └─ updatedAt: timestamp
```

## How to Verify Data

### Method 1: Run Verification Script
```bash
cd backend
node scripts/verifyTelemetryData.js NA-225566
```

Output will show:
- ✅ Current live location data
- ✅ Bus configuration data
- ✅ Recent passenger events
- ✅ Telemetry history (last 10 records)

### Method 2: Use REST API Endpoints

#### Get Current Telemetry
```bash
curl http://localhost:3000/buses/NA-225566/telemetry
```

Response:
```json
{
  "status": "success",
  "data": {
    "bus_id": "NA-225566",
    "latitude": 6.911394,
    "longitude": 79.87684,
    "speed": 38,
    "passenger_count": 27,
    "total_weight": 1770,
    "gps_valid": true,
    "last_updated": "2026-05-04T12:48:53.846Z"
  }
}
```

#### Get Telemetry History
```bash
# Get last 100 records (default)
curl http://localhost:3000/buses/NA-225566/telemetry/history

# Get last 50 records
curl http://localhost:3000/buses/NA-225566/telemetry/history?limit=50
```

Response:
```json
{
  "status": "success",
  "bus_id": "NA-225566",
  "total_records": 50,
  "data": [
    {
      "bus_id": "NA-225566",
      "latitude": 6.911394,
      "longitude": 79.87684,
      "speed": 38,
      "timestamp": "2026-05-04T12:48:53.846Z"
    },
    ...
  ]
}
```

### Method 3: Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Look for collections:
   - `bus_live_locations` → Click bus ID (e.g., NA-225566)
   - `bus_telemetry_history` → View all records
   - `bus_passenger_events` → View passenger events
   - `buses` → View bus configuration

### Method 4: Use Postman
1. Import URL: `http://localhost:3000/buses/NA-225566/telemetry`
2. Set method to **GET**
3. Click **Send**
4. View response in JSON format

## Data Storage Happens At These Points

### When ESP32 sends: `bus/NA-225566/telemetry`

1. **Parsed by MQTT Broker** (backend/mqtt/mqttBroker.js line 507)
2. **handleBusTelemetry()** function processes the message:
   - ✅ **Stores in bus_live_locations** - Real-time tracking
   - ✅ **Stores in bus_telemetry_history** - Historical record
   - ✅ **Updates buses collection** - Via ensureBusExists()
   - ✅ **Broadcasts via Socket.IO** - Real-time dashboard updates

## Expected Database Records Per Minute

If ESP32 sends telemetry every 2 seconds:
- **30 records per minute** in `bus_telemetry_history`
- **1 document** updated in `bus_live_locations` (merge: true)
- **Socket.IO events** sent to all connected clients

## Troubleshooting

### ❌ No data appearing in database?

1. **Verify MQTT Broker is running:**
   ```bash
   npm start
   ```
   Should show: `MQTT Broker: mqtt://localhost:1883`

2. **Check backend console for MQTT messages:**
   Should show: `MQTT Message: bus/NA-225566/telemetry`

3. **Verify Firebase connection:**
   Check `.env` file has correct Firebase credentials

4. **Check firestore.indexes.json:**
   May need to create index for `orderBy('timestamp')`

### ❌ API returning 404?

- Ensure backend is running: `npm start`
- Check bus ID spelling (case-sensitive)
- Verify bus has sent at least one telemetry message

### ❌ Old data still showing?

- Live locations use `merge: true`, so older fields persist
- To reset, manually delete document from Firebase Console

## Performance Notes

- `bus_telemetry_history` will grow continuously
- Consider archiving old records after 30-90 days
- Index on `bus_id` and `timestamp` recommended for queries
- See [FIREBASE_INDEXES.md](../FIREBASE_INDEXES.md) for index setup

## Next Steps

1. ✅ ESP32 sending data → MQTT broker receives it
2. ✅ MQTT broker stores in Firestore → Verified ✓
3. ✅ API endpoints retrieve data → Verified ✓
4. 🔄 Frontend displays on dashboard → Check webfrontend
5. 🔄 Analytics from history data → Configure as needed
