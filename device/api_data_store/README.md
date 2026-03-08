# Bus Tracking Python Backend Service
# api_data_store - MQTT to Firebase Bridge with Socket.IO

## Overview
This service connects to the MQTT broker, subscribes to bus GPS and passenger topics,
processes incoming data, stores it in Firebase, and broadcasts real-time updates via Socket.IO.

## Features
- MQTT client subscribing to bus/{bus_id}/gps and bus/{bus_id}/passenger topics
- Firebase Firestore integration for data persistence
- Socket.IO server for real-time updates to web and mobile clients
- Route validation and name attachment
- RESTful API endpoints

## Installation

```bash
cd device/api_data_store
pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and configure:
- MQTT_BROKER: MQTT broker address
- FIREBASE_CREDENTIALS: Path to Firebase service account JSON
- SOCKET_PORT: Port for Socket.IO server

## Running

```bash
python main.py
```

## API Endpoints

- GET /api/buses - Get all active buses
- GET /api/bus/{bus_id} - Get specific bus data
- GET /api/bus/{bus_id}/history - Get GPS history
- GET /api/routes - Get all routes
- GET /api/passengers/{bus_id} - Get passenger data

## Socket.IO Events

- bus_location_update: Real-time GPS updates
- passenger_update: Passenger count updates
- bus_status: Bus online/offline status
