import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Only register push notifications in a real/development build, not Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (isExpoGo) {
    console.log('Skipping push notification permissions in Expo Go');
    return false;
  }
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('Notification permissions requested:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Send native mobile notification
export const sendNativeNotification = async (title, message, data = {}) => {
  try {
    console.log('Sending native notification:', title, message);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: message,
        sound: 'default',
        badge: 1,
        data: data,
      },
      trigger: null, // Send immediately
    });
    console.log('Native notification sent:', title);
  } catch (error) {
    console.error('Error sending native notification:', error);
  }
};

// Send in-app popup notification using Alert
export const showInAppNotification = (title, message, type = 'success') => {
  try {
    console.log('Showing Alert popup:', title, message);
    Alert.alert(title, message, [
      { text: 'OK', onPress: () => console.log('Notification dismissed') }
    ]);
    return true;
  } catch (error) {
    console.error('Error showing popup:', error);
    return false;
  }
};

// Send both native and in-app notification
export const sendNotification = async (title, message, data = {}, options = {}) => {
  console.log('sendNotification called with:', { title, message, options });
  
  const { 
    showNative = true, 
    showInApp = true,
    type = 'success' 
  } = options;

  // Show in-app popup (Alert)
  if (showInApp) {
    console.log('Showing in-app Alert popup');
    showInAppNotification(title, message, type);
  }

  // Show native notification
  if (showNative) {
    console.log('Showing native notification');
    await sendNativeNotification(title, message, data);
  }
};

// Set up notification listeners
export const setupNotificationListeners = (onNotificationReceived) => {
  if (isExpoGo) {
    console.log('Skipping push notification listeners in Expo Go');
    return () => {};
  }
  console.log('Setting up notification listeners');
  
  // Listen for notifications when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received in foreground:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listen for notification tap/press
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    const data = response.notification.request.content.data;
    // Handle navigation or other actions based on notification data
  });

  // Return cleanup function
  return () => {
    console.log('Cleaning up notification listeners');
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};
