# Firebase Database Setup Guide

## Configuration Steps

### 1. Firebase Admin SDK Credentials

Your Firebase Admin SDK credentials file is already in the project:
- File: `research-be48a-firebase-adminsdk-fbsvc-2792392e0a.json`

### 2. Environment Variables

Create a `.env` file in the `esp_backend` directory with the following content:

```env
# Firebase Configuration
FIREBASE_CRED_PATH=research-be48a-firebase-adminsdk-fbsvc-2792392e0a.json
FIREBASE_DB_URL=https://research-be48a-default-rtdb.firebaseio.com/

# OpenWeatherMap API Key (Optional)
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### 3. Install Dependencies

```bash
cd esp_backend
pip install -r requirements.txt
```

### 4. Firebase Database Structure

The application uses Firebase Realtime Database with the following structure:

```
/
├── buses/
│   └── {vehicle_id}/
│       ├── vehicle_id
│       ├── route_id
│       ├── latitude
│       ├── longitude
│       ├── location_name
│       ├── direction
│       ├── safe_speed
│       ├── road_condition
│       ├── passenger_count
│       ├── passenger_load_kg
│       ├── temperature
│       ├── humidity
│       ├── last_update
│       └── status
│
├── telemetry/
│   └── {auto_generated_id}/
│       ├── vehicle_id
│       ├── route_id
│       ├── timestamp
│       └── ... (same fields as buses)
│
└── predictions/
    └── {auto_generated_id}/
        └── ... (prediction data)
```

### 5. Firebase Database Rules (Optional)

For development, you can use these rules in your Firebase Console:

```json
{
  "rules": {
    "buses": {
      ".read": true,
      ".write": true
    },
    "telemetry": {
      ".read": true,
      ".write": true
    },
    "predictions": {
      ".read": true,
      ".write": true
    }
  }
}
```

**Note:** For production, implement proper authentication and security rules.

### 6. Run the Application

```bash
python app.py
```

The backend will be available at `http://localhost:5000`

## Migration from MongoDB

All MongoDB operations have been replaced with Firebase Realtime Database operations:

- ✅ MongoDB collections → Firebase database references
- ✅ `collection.find()` → `ref.get()`
- ✅ `collection.insert_one()` → `ref.push()`
- ✅ `collection.update_one()` → `ref.child().set()`
- ✅ Aggregation pipelines → In-memory processing with Python
- ✅ ObjectId handling → Removed (Firebase uses auto-generated keys)

## Verification

1. Check health endpoint: `GET http://localhost:5000/health`
2. Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "model": "loaded",
  "timestamp": "2026-01-23T..."
}
```

## Troubleshooting

### Database connection failed

- Verify your Firebase credentials file exists
- Check the `FIREBASE_DB_URL` in your `.env` file
- Ensure your Firebase project has Realtime Database enabled

### Import errors

```bash
pip install --upgrade firebase-admin
```

### Data not appearing

- Check Firebase Console for your database
- Verify write permissions in Database Rules
- Check application logs for errors
