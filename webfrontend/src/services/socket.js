import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Listen for device health updates
  onDeviceHealthUpdate(callback) {
    if (!this.socket) this.connect();
    this.socket.on('deviceHealthUpdate', callback);
    return () => this.socket.off('deviceHealthUpdate', callback);
  }

  // Listen for device status changes (online/offline)
  onDeviceStatusUpdate(callback) {
    if (!this.socket) this.connect();
    this.socket.on('deviceStatusUpdate', callback);
    return () => this.socket.off('deviceStatusUpdate', callback);
  }

  // Listen for device updates (new device registered, device info changed)
  onDeviceUpdate(callback) {
    if (!this.socket) this.connect();
    this.socket.on('deviceUpdate', callback);
    return () => this.socket.off('deviceUpdate', callback);
  }

  // Listen for new violations
  onNewViolation(callback) {
    if (!this.socket) this.connect();
    this.socket.on('newViolation', callback);
    return () => this.socket.off('newViolation', callback);
  }

  // Listen for violation updates
  onViolationUpdate(callback) {
    if (!this.socket) this.connect();
    this.socket.on('violationUpdate', callback);
    return () => this.socket.off('violationUpdate', callback);
  }

  // Subscribe to specific device updates
  subscribeToDevice(deviceKey) {
    if (!this.socket) this.connect();
    this.socket.emit('subscribe:device', deviceKey);
  }

  // Unsubscribe from device updates
  unsubscribeFromDevice(deviceKey) {
    if (this.socket) {
      this.socket.emit('unsubscribe:device', deviceKey);
    }
  }

  // Generic event listener
  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
    return () => this.socket.off(event, callback);
  }

  // Emit event
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

// Singleton instance
const socketService = new SocketService();
export default socketService;
