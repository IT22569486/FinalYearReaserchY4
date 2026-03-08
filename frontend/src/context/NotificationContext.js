import React, { useContext, createContext, useState, useCallback, useEffect } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';
import { getUnreadCount, getNotifications } from '../api/notificationApi';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [unsubscribeListener, setUnsubscribeListener] = useState(null);
  const [displayNotification, setDisplayNotification] = useState(null);

  // Update unread count (defined first for use in other hooks)
  const updateUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      console.log('Initializing socket for userId:', storedUserId);
      if (!storedUserId) {
        console.warn('No userId found, skipping socket initialization');
        return;
      }

      setUserId(storedUserId);
      console.log('Connecting to Socket.IO server at:', BACKEND_URL);

      const socketInstance = io(BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected successfully! Socket ID:', socketInstance.id);
        // Subscribe to user's notifications
        socketInstance.emit('subscribeNotifications', storedUserId);
        console.log('Subscribed to notifications for user:', storedUserId);
      });

      socketInstance.on('notification', (notification) => {
        console.log('NEW NOTIFICATION RECEIVED:', notification);
        setNotifications((prev) => [notification, ...prev]);
        
        // Show banner notification at the top of the screen
        console.log('Setting displayNotification state...');
        setDisplayNotification(notification);
        console.log('Display notification set!');
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          console.log('Auto-dismissing notification');
          setDisplayNotification(null);
        }, 5000);
        
        // Update unread count
        updateUnreadCount();
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      socketInstance.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
          console.log('Notification socket disconnected. Reason:', reason);
        }
      });

      setSocket(socketInstance);
      console.log('Socket instance saved to state');
      return socketInstance;
    } catch (error) {
      console.error('Error initializing notification socket:', error);
    }
  }, [updateUnreadCount]);

  // Initialize Firestore real-time listener
  const initializeFirestoreListener = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;

      setUserId(storedUserId);

      // Fetch initial notifications
      const initialNotifications = await getNotifications();
      setNotifications(initialNotifications);
      await updateUnreadCount();

      // Set up polling for real-time updates (alternative to Socket.IO)
      const pollInterval = setInterval(async () => {
        try {
          const updatedNotifications = await getNotifications();
          setNotifications(updatedNotifications);
          console.log('Notifications updated via polling:', updatedNotifications.length);
        } catch (error) {
          console.error('Error polling notifications:', error);
        }
      }, 5000); // Poll every 5 seconds

      // Return cleanup function
      const unsubscribe = () => clearInterval(pollInterval);
      setUnsubscribeListener(() => unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error initializing notification polling:', error);
    }
  }, [updateUnreadCount]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeListener) {
        unsubscribeListener();
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [unsubscribeListener, socket]);

  // Auto-initialize socket when user logs in
  useEffect(() => {
    const autoInitializeSocket = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');
      
      if (storedUserId && token) {
        console.log('Auto-initializing socket for user:', storedUserId);
        await initializeSocket();
      }
    };

    autoInitializeSocket();
  }, [initializeSocket]);

  // Add notification
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = {
    notifications,
    unreadCount,
    socket,
    displayNotification,
    setDisplayNotification,
    initializeSocket,
    initializeFirestoreListener,
    addNotification,
    removeNotification,
    clearAllNotifications,
    updateUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
