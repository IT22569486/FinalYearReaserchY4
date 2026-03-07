import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BusRoutesScreen from '../screens/BusRoutesScreen'; 
import CurrentTripScreen from '../screens/CurrentTripScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

const NotificationsBadge = () => {
  const { unreadCount } = useNotifications();
  
  if (unreadCount === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      right: -6,
      top: -3,
      backgroundColor: '#FF4444',
      borderRadius: 9,
      width: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </Text>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Routes') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Notifications' && <NotificationsBadge />}
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Routes" component={BusRoutesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;