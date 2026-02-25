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
    const unsubscribe = socketService.subscribe('bus_update', (updatedBus) => {
      setBuses(prev => {
        const index = prev.findIndex(b => b.vehicle_id === updatedBus.vehicle_id);
        if (index >= 0) {
          const newBuses = [...prev];
          newBuses[index] = { ...newBuses[index], ...updatedBus, status: 'online' };
          return newBuses;
        }
        return [...prev, { ...updatedBus, status: 'online' }];
      });
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
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
    const unsubscribe = socketService.subscribe('bus_update', (updatedBus) => {
      setMapData(prev => {
        const index = prev.findIndex(b => b.vehicle_id === updatedBus.vehicle_id);
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = { ...newData[index], ...updatedBus, status: 'online' };
          return newData;
        }
        return [...prev, { ...updatedBus, status: 'online' }];
      });
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
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
