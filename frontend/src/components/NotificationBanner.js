import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotificationTypeDisplay, formatNotificationDate } from '../api/notificationApi';

const NotificationBanner = ({ notification, onPress, onDismiss }) => {
  if (!notification) return null;

  const typeInfo = getNotificationTypeDisplay(notification.type);

  return (
    <TouchableOpacity
      style={[styles.banner, { borderLeftColor: typeInfo.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.bannerContent}>
        <View style={styles.bannerIconContainer}>
          <Ionicons name="notifications" size={20} color={typeInfo.color} />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>{notification.title}</Text>
          <Text style={styles.bannerMessage} numberOfLines={1}>
            {notification.message}
          </Text>
        </View>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color="#666" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default NotificationBanner;
