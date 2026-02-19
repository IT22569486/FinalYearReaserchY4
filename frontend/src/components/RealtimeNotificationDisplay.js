import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import NotificationBanner from './NotificationBanner';

const RealtimeNotificationDisplay = () => {
  const { displayNotification, setDisplayNotification } = useNotifications();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    console.log('RealtimeNotificationDisplay mounted');
  }, []);

  useEffect(() => {
    console.log('Display notification changed:', displayNotification);
    if (displayNotification) {
      console.log('Showing notification banner:', displayNotification.title);
      // Slide in animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [displayNotification, slideAnim]);

  if (!displayNotification) {
    console.log('No notification to display');
    return null;
  }

  console.log('Rendering notification banner');
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <NotificationBanner
        notification={displayNotification}
        onDismiss={() => {
          console.log('Notification dismissed');
          setDisplayNotification(null);
        }}
        onPress={() => {
          console.log('Notification pressed');
          setDisplayNotification(null);
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'transparent',
  },
});

export default RealtimeNotificationDisplay;
