import { io } from 'socket.io-client';

// CRA uses proxy — connect to same origin in dev, or use env var in production
const SOCKET_URL = process.env.REACT_APP_API_URL || '';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket.emit('subscribe_updates');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('bus_update', (data) => {
      this.notifyListeners('bus_update', data);
    });

    this.socket.on('safeSpeedUpdate', (data) => {
      this.notifyListeners('safeSpeedUpdate', data);
    });

    // Violation events — real-time dashboard updates
    this.socket.on('newViolation', (data) => {
      this.notifyListeners('newViolation', data);
    });

    this.socket.on('violationUpdated', (data) => {
      this.notifyListeners('violationUpdated', data);
    });

    this.socket.on('violationDeleted', (data) => {
      this.notifyListeners('violationDeleted', data);
    });

    // Device status events
    this.socket.on('deviceHealthUpdate', (data) => {
      this.notifyListeners('deviceHealthUpdate', data);
    });

    this.socket.on('deviceStatusUpdate', (data) => {
      this.notifyListeners('deviceStatusUpdate', data);
    });

    this.socket.on('connected', (data) => {
      console.log('Server message:', data.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

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

  notifyListeners(event, data) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const socketService = new SocketService();
export default socketService;
