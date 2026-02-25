import axios from 'axios';
import { AsyncStorage } from 'react-native';
import apiClient from './axiosConfig';
import { FETCH_NOTIFICATIONS_FROM_REMOTE, REMOTE_NOTIFICATION_SERVER_IP } from '../config';

/**
 * Notification API utilities
 */

// Get auth token for remote requests
const getAuthToken = async () => {
  try {
    // Get token from AsyncStorage or your auth context
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Create axios instance for remote server
const createRemoteClient = async (token) => {
  return axios.create({
    baseURL: REMOTE_NOTIFICATION_SERVER_IP,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
};

// Create a notification
export const createNotification = async (notificationData) => {
  try {
    const response = await apiClient.post('/api/notifications/create', notificationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all notifications (from local DB or remote server)
export const getNotifications = async () => {
  try {
    if (FETCH_NOTIFICATIONS_FROM_REMOTE) {
      // Fetch from remote IP address
      const token = await getAuthToken();
      const remoteClient = await createRemoteClient(token);
      const response = await remoteClient.get('/api/notifications');
      console.log('Fetched notifications from remote server:', REMOTE_NOTIFICATION_SERVER_IP);
      return response.data;
    } else {
      // Fetch from local database
      const response = await apiClient.get('/api/notifications');
      console.log('Fetched notifications from local database');
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error.response?.data || error;
  }
};

// Get unread notifications
export const getUnreadNotifications = async () => {
  try {
    const response = await apiClient.get('/api/notifications/unread');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const response = await apiClient.get('/api/notifications/unread/count');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get notifications by type
export const getNotificationsByType = async (type) => {
  try {
    const response = await apiClient.get(`/api/notifications/type/${type}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  try {
    const response = await apiClient.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Mark all as read
export const markAllAsRead = async () => {
  try {
    const response = await apiClient.put('/api/notifications/read/all');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await apiClient.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete all notifications
export const deleteAllNotifications = async () => {
  try {
    const response = await apiClient.delete('/api/notifications');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get notification type display
export const getNotificationTypeDisplay = (type) => {
  const typeMap = {
    'bus_arrival': { label: ' Bus Arrival', color: '#2196F3' },
    'trip_update': { label: ' Trip Update', color: '#FF9800' },
    'rating_reminder': { label: ' Rating Reminder', color: '#FFD700' },
    'service_alert': { label: 'Service Alert', color: '#F44336' },
    'promotion': { label: 'Promotion', color: '#4CAF50' },
    'system': { label: 'System', color: '#757575' },
  };
  return typeMap[type] || { label: '📬 Notification', color: '#666' };
};

// Format notification date
export const formatNotificationDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString();
};
