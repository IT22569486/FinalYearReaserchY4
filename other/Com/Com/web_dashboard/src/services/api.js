import axios from 'axios';

// API Base URL - Update this to your backend server URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;
