import { useState, useEffect, useCallback } from 'react';
import { fleetService } from '../services/api';
import socketService from '../services/socket';

// Hook for fetching fleet overview
export function useFleetOverview(refreshInterval = 10000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fleetService.getOverview();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for fetching all buses
export function useBuses(refreshInterval = 5000) {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fleetService.getAllBuses();
      setBuses(result.buses || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    
    // Subscribe to real-time updates
    socketService.connect();

    const unsubscribeBusUpdate = socketService.subscribe('bus_update', (updatedBus) => {
      setBuses(prev => {
        const index = prev.findIndex(b => b.busId === updatedBus.busId);
        if (index >= 0) {
          const newBuses = [...prev];
          newBuses[index] = { ...newBuses[index], ...updatedBus, status: 'online' };
          return newBuses;
        }
        return [...prev, { ...updatedBus, status: 'online' }];
      });
    });

    // Subscribe to bus_location_update (from ESP32 via MQTT)
    const unsubscribeLocation = socketService.subscribe('bus_location_update', (data) => {
      setBuses(prev => {
        const vid = data.bus_id || data.vehicle_id;
        const index = prev.findIndex(b => b.vehicle_id === vid || b.bus_id === vid);
        if (index >= 0) {
          const newBuses = [...prev];
          newBuses[index] = {
            ...newBuses[index],
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            safe_speed: newBuses[index].safe_speed || data.speed,
            route_id: data.route_id || newBuses[index].route_id,
            status: 'online',
            last_update: data.timestamp || new Date().toISOString()
          };
          return newBuses;
        }
        // New bus — add it
        return [...prev, {
          vehicle_id: vid,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          safe_speed: data.speed,
          route_id: data.route_id || '',
          route_name: data.route_name || '',
          status: 'online',
          last_update: data.timestamp || new Date().toISOString()
        }];
      });
    });

    // Subscribe to passenger updates
    const unsubscribePassenger = socketService.subscribe('passenger_update', (data) => {
      setBuses(prev => {
        const vid = data.bus_id;
        const index = prev.findIndex(b => b.vehicle_id === vid || b.bus_id === vid);
        if (index >= 0) {
          const newBuses = [...prev];
          newBuses[index] = {
            ...newBuses[index],
            passenger_count: data.total_passenger_count,
            passenger_load_kg: data.total_weight
          };
          return newBuses;
        }
        return prev;
      });
    });

    return () => {
      clearInterval(interval);
      unsubscribeBusUpdate();
      unsubscribeLocation();
      unsubscribePassenger();
    };
  }, [fetchData, refreshInterval]);

  return { buses, loading, error, refetch: fetchData };
}

// Hook for fetching bus details
export function useBusDetails(vehicleId) {
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const result = await fleetService.getBusDetails(vehicleId);
      setBus(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { bus, loading, error, refetch: fetchData };
}

// Hook for fetching bus history
export function useBusHistory(vehicleId, hours = 24) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const result = await fleetService.getBusHistory(vehicleId, hours);
      setHistory(result.history || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, hours]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { history, loading, error, refetch: fetchData };
}

// Hook for map data
export function useMapData(refreshInterval = 5000) {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fleetService.getMapData();
      setMapData(result.buses || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    
    // Subscribe to real-time updates
    socketService.connect();
    
    // Subscribe to bus_location_update events (from MQTT GPS data)
    const unsubscribeLocation = socketService.subscribe('bus_location_update', (updatedBus) => {
      setMapData(prev => {
        // Find bus by bus_id or vehicle_id
        const index = prev.findIndex(b => 
          b.vehicle_id === updatedBus.bus_id || 
          b.bus_id === updatedBus.bus_id ||
          b.vehicle_id === updatedBus.vehicle_id
        );
        
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = { 
            ...newData[index], 
            latitude: updatedBus.latitude,
            longitude: updatedBus.longitude,
            location: updatedBus.location || { lat: updatedBus.latitude, lng: updatedBus.longitude },
            speed: updatedBus.speed,
            route_name: updatedBus.route_name,
            route_id: updatedBus.route_id,
            status: 'online',
            last_updated: updatedBus.timestamp
          };
          return newData;
        }
        // Add new bus if not found
        return [...prev, { 
          vehicle_id: updatedBus.bus_id,
          bus_id: updatedBus.bus_id,
          latitude: updatedBus.latitude,
          longitude: updatedBus.longitude,
          location: updatedBus.location || { lat: updatedBus.latitude, lng: updatedBus.longitude },
          speed: updatedBus.speed,
          route_name: updatedBus.route_name,
          route_id: updatedBus.route_id,
          status: 'online',
          last_updated: updatedBus.timestamp
        }];
      });
    });

    // Subscribe to passenger updates
    const unsubscribePassenger = socketService.subscribe('passenger_update', (data) => {
      setMapData(prev => {
        const index = prev.findIndex(b => 
          b.vehicle_id === data.bus_id || 
          b.bus_id === data.bus_id
        );
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = { 
            ...newData[index], 
            passenger_count: data.total_passenger_count,
            occupancy: data.total_passenger_count,
            total_weight: data.total_weight
          };
          return newData;
        }
        return prev;
      });
    });

    // Subscribe to legacy bus_update events
    const unsubscribeBus = socketService.subscribe('bus_update', (updatedBus) => {
      setMapData(prev => {
        const index = prev.findIndex(b => b.busId === updatedBus.busId);
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = { ...newData[index], ...updatedBus, status: 'online' };
          return newData;
        }
        return prev;
      });
    });

    return () => {
      clearInterval(interval);
      unsubscribeLocation();
      unsubscribePassenger();
      unsubscribeBus();
    };
  }, [fetchData, refreshInterval]);

  return { mapData, loading, error, refetch: fetchData };
}

// Hook for statistics
export function useStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fleetService.getStatistics();
      setStats(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { stats, loading, error, refetch: fetchData };
}
