import axios from 'axios';

// CRA uses proxy from package.json for development
// In production, set REACT_APP_API_URL environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fleet API Services
export const fleetService = {
  // Get fleet overview statistics
  getOverview: async () => {
    const response = await api.get('/api/fleet/overview');
    return response.data;
  },

  // Get all buses
  getAllBuses: async () => {
    const response = await api.get('/api/fleet/buses');
    return response.data;
  },

  // Get specific bus details
  getBusDetails: async (vehicleId) => {
    const response = await api.get(`/api/fleet/buses/${vehicleId}`);
    return response.data;
  },

  // Get bus history
  getBusHistory: async (vehicleId, hours = 24, limit = 100) => {
    const response = await api.get(`/api/fleet/buses/${vehicleId}/history`, {
      params: { hours, limit }
    });
    return response.data;
  },

  // Get map data
  getMapData: async () => {
    const response = await api.get('/api/fleet/map-data');
    return response.data;
  },

  // Get routes
  getRoutes: async () => {
    const response = await api.get('/api/fleet/routes');
    return response.data;
  },

  // Get statistics
  getStatistics: async () => {
    const response = await api.get('/api/fleet/statistics');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  }
};

export default api;

// Driver Monitoring System (DMS) API Services
export const dmsService = {
  // Get latest state for all devices
  getStatus: async () => {
    const response = await api.get('/api/dms/status');
    return response.data;
  },

  // Get state for a specific device
  getDeviceStatus: async (deviceKey) => {
    const response = await api.get(`/api/dms/status/${deviceKey}`);
    return response.data;
  },

  // Get recent DMS events
  getEvents: async (deviceKey = null, limit = 50) => {
    const params = {};
    if (deviceKey) params.device_key = deviceKey;
    if (limit) params.limit = limit;
    const response = await api.get('/api/dms/events', { params });
    return response.data;
  },

  // Get DMS statistics
  getStatistics: async (hours = 24) => {
    const response = await api.get('/api/dms/statistics', { params: { hours } });
    return response.data;
  },
};
