import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Device APIs
export const deviceApi = {
  // Get all devices
  getAllDevices: () => api.get('/devices'),
  
  // Get single device by key
  getDevice: (deviceKey) => api.get(`/devices/${deviceKey}`),
  
  // Get device health logs
  getDeviceHealth: (deviceKey, limit = 50) => 
    api.get(`/devices/${deviceKey}/health?limit=${limit}`),
  
  // Register new device
  registerDevice: (deviceData) => api.post('/devices', deviceData),
  
  // Update device info
  updateDevice: (deviceKey, deviceData) => api.put(`/devices/${deviceKey}`, deviceData),
  
  // Delete device
  deleteDevice: (deviceKey) => api.delete(`/devices/${deviceKey}`),
};

// Violation APIs
export const violationApi = {
  // Get all violations
  getAllViolations: (limit = 100) => api.get(`/violations?limit=${limit}`),
  
  // Get violations by device
  getViolationsByDevice: (deviceKey, limit = 50) => 
    api.get(`/violations/device/${deviceKey}?limit=${limit}`),
  
  // Get violation by ID
  getViolation: (violationId) => api.get(`/violations/${violationId}`),
};

// Bus APIs (from team's backend)
export const busApi = {
  getAllBuses: () => api.get('/bus'),
  getBus: (busId) => api.get(`/bus/${busId}`),
  createBus: (busData) => api.post('/bus', busData),
  updateBus: (busId, busData) => api.put(`/bus/${busId}`, busData),
  deleteBus: (busId) => api.delete(`/bus/${busId}`),
};

// Trip APIs (from team's backend)
export const tripApi = {
  getAllTrips: () => api.get('/trip'),
  getTrip: (tripId) => api.get(`/trip/${tripId}`),
  createTrip: (tripData) => api.post('/trip', tripData),
  updateTrip: (tripId, tripData) => api.put(`/trip/${tripId}`, tripData),
};

// Route APIs (from team's backend)
export const routeApi = {
  getAllRoutes: () => api.get('/routes'),
  getRoute: (routeId) => api.get(`/routes/${routeId}`),
};

export default api;
