import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  getNotificationTypeDisplay,
  formatNotificationDate,
} from '../api/notificationApi';
import { useNotifications } from '../context/NotificationContext';
import { BACKEND_URL } from '../config';
import { sendNotification, setupNotificationListeners, requestNotificationPermissions } from '../utils/notificationUtils';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { updateUnreadCount } = useNotifications();
  const [socket, setSocket] = useState(null);

  // Fetch notifications on initial mount and setup Socket.IO
  useEffect(() => {
    fetchNotifications();

    AsyncStorage.getItem('userId')
      .then((storedUserId) => {
        console.log('Stored userId (NotificationsScreen):', storedUserId);
      })
      .catch((error) => {
        console.error('Error reading stored userId:', error);
      });

    // Request notification permissions
    requestNotificationPermissions().then((granted) => {
      console.log('Notification permissions:', granted ? 'granted' : 'denied');
    });

    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification server');
      AsyncStorage.getItem('userId')
        .then((storedUserId) => {
          if (!storedUserId) {
            console.warn('No userId found for notification subscription');
            return;
          }
          console.log('Subscribing with userId:', storedUserId);
          newSocket.emit('subscribeNotifications', storedUserId);
          console.log('Subscribed to notifications for user:', storedUserId);
        })
        .catch((error) => {
          console.error('Error reading userId for notification subscription:', error);
        });
    });

    newSocket.on('notification', async (notification) => {
      console.log('Socket.IO - Real-time notification received:', notification);
      console.log('Notification details:', {
        title: notification?.title,
        message: notification?.message,
        type: notification?.type,
      });
      
      // Show both native and in-app notifications
      console.log('Triggering notification display...');
      sendNotification(
        notification.title,
        notification.message,
        notification,
        {
          showNative: true,
          showInApp: true,
          duration: 3000,
          type: notification.priority === 'high' ? 'warning' : 'success',
        }
      );

      // Update the notifications list
      setNotifications((prev) => [notification, ...prev]);
      await updateUnreadCount();
      console.log('Notification processed and list updated');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server');
    });

    setSocket(newSocket);

    // Setup notification listeners for foreground notifications
    const unsubscribeListeners = setupNotificationListeners((notification) => {
      console.log('Notification listener triggered:', notification);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
      unsubscribeListeners();
    };
  }, [updateUnreadCount]);

  // Auto-refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      await updateUnreadCount();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      await updateUnreadCount();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId, isRead) => {
    if (!isRead) {
      try {
        await markAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        await updateUnreadCount();
      } catch (error) {
        Alert.alert('Error', 'Failed to mark notification as read');
      }
    }
  };

  const handleDelete = async (notificationId) => {
    Alert.alert('Delete', 'Delete this notification?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteNotification(notificationId);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            await updateUnreadCount();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete notification');
          }
        },
      },
    ]);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await updateUnreadCount();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const NotificationItem = ({ notification }) => {
    const typeInfo = getNotificationTypeDisplay(notification.type);
    const timeStr = formatNotificationDate(notification.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.read && styles.notificationItemUnread,
        ]}
        onPress={() => handleMarkAsRead(notification.id, notification.read)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>{timeStr}</Text>
            <View
              style={[styles.priorityBadge, { backgroundColor: typeInfo.color }]}
            >
              <Text style={styles.priorityText}>
                {notification.priority?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(notification.id)}
        >
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No Notifications</Text>
      <Text style={styles.emptyStateSubText}>
        You're all caught up! Check back later for updates.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllButtonText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  notificationItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  notificationItemUnread: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 13,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
