/**
 * Socket Service for React Native
 * Handles real-time bus tracking updates via Socket.IO
 */
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log('Connecting to Socket.IO server:', BACKEND_URL);

    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection established
    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners('connection_status', { connected: true });
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.connected = false;
      this.notifyListeners('connection_status', { connected: false, reason });
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.log('Socket.IO connection error:', error.message);
      this.reconnectAttempts++;
      this.notifyListeners('connection_status', { 
        connected: false, 
        error: error.message,
        reconnecting: this.reconnectAttempts < this.maxReconnectAttempts
      });
    });

    // Real-time GPS location updates
    this.socket.on('bus_location_update', (data) => {
      console.log('Bus location update:', data.bus_id);
      this.notifyListeners('bus_location_update', data);
    });

    // Legacy event name support
    this.socket.on('busLocationUpdate', (data) => {
      this.notifyListeners('bus_location_update', data);
    });

    // Passenger count updates
    this.socket.on('passenger_update', (data) => {
      console.log('Passenger update:', data.bus_id);
      this.notifyListeners('passenger_update', data);
    });

    // Bus status changes
    this.socket.on('bus_status', (data) => {
      console.log('Bus status:', data.bus_id, data.status);
      this.notifyListeners('bus_status', data);
    });

    // Server connected confirmation
    this.socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });

    return this.socket;
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Subscribe to a specific bus's updates
   */
  subscribeToBus(busId) {
    if (this.socket && this.connected) {
      this.socket.emit('joinBus', busId);
      console.log('Subscribed to bus:', busId);
    }
  }

  /**
   * Unsubscribe from a specific bus's updates
   */
  unsubscribeFromBus(busId) {
    if (this.socket && this.connected) {
      this.socket.emit('leaveBus', busId);
      console.log('Unsubscribed from bus:', busId);
    }
  }

  /**
   * Subscribe to all bus updates
   */
  subscribeToAllBuses() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_updates');
      console.log('Subscribed to all bus updates');
    }
  }

  /**
   * Add event listener
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Remove event listener
   */
  unsubscribe(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
