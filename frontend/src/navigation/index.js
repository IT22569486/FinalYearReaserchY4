import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import CurrentTripScreen from '../screens/CurrentTripScreen';
import TimetableScreen from '../screens/TimetableScreen';
import SignUpScreen from '../screens/SignUpScreen';
import RatingScreen from '../screens/RatingScreen';
import BusRatingsScreen from '../screens/BusRatingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { isTokenValid, isInactive, clearAuthData } from '../utils/authUtils';
import { SessionProvider } from '../context/SessionContext';
import { NotificationProvider } from '../context/NotificationContext';
import RealtimeNotificationDisplay from '../components/RealtimeNotificationDisplay';
import { setNavigationRef } from '../api/axiosConfig';
import {BACKEND_URL} from '../config';
// Development flag - set to true to clear storage on app startup for testing
const CLEAR_STORAGE_ON_STARTUP = false;

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Onboarding');
  const navigationRef = useRef(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Clear storage on startup if development flag is enabled
      if (CLEAR_STORAGE_ON_STARTUP) {
        console.log('Development mode: Clearing AsyncStorage on startup');
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('lastActivity');
      }

      // Check if user has seen onboarding
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      
      // Check if token is valid
      const tokenValid = await isTokenValid();
      
      // Check for inactivity (30 minutes)
      const userInactive = await isInactive(30);
      
      if (tokenValid && !userInactive) {
        // Verify token with backend before allowing access to MainTabs
        const isValidWithBackend = await verifyTokenWithBackend();
        
        if (isValidWithBackend) {
          // Valid token, not inactive, and verified with backend - go to main app
          setInitialRoute('MainTabs');
        } else {
          // Token invalid with backend - logout and go to login
          await clearAuthData();
          setInitialRoute('Login');
        }
      } else if (tokenValid && userInactive) {
        // Token valid but user inactive - logout and go to login
        await clearAuthData();
        setInitialRoute('Login');
      } else if (hasSeenOnboarding) {
        // No valid token but has seen onboarding - go to login
        setInitialRoute('Login');
      } else {
        // New user - show onboarding
        setInitialRoute('Onboarding');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify token validity with backend
   * Makes an API call to validate the token is still active on the server
   */
  const verifyTokenWithBackend = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        return false;
      }

      // Get the API base URL
      const API_URL = `${BACKEND_URL}/api`;
      
      console.log('Verifying token with backend...');
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      // If response is successful and user data is returned, token is valid
      const isValid = response.status === 200 && response.data;
      console.log('Token verification result:', isValid);
      return isValid;
    } catch (error) {
      console.error('Error verifying token with backend:', error.message);
      console.error('Error details:', {
        code: error.code,
        status: error.response?.status,
        message: error.message,
      });
      // If backend is unreachable or timeout, allow access with local token validation
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNABORTED') {
        console.warn('Backend unreachable or timeout, allowing access with local token validation');
        return true;
      }
      return false;
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={(ref) => {
        navigationRef.current = ref;
        setNavigationRef(ref);
      }}
    >
      <NotificationProvider>
        <SessionProvider>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />  
            <Stack.Screen name="CurrentTrip" component={CurrentTripScreen} />  
            <Stack.Screen name="Timetable" component={TimetableScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Rating" component={RatingScreen} />
            <Stack.Screen name="BusRatings" component={BusRatingsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />  
          </Stack.Navigator>
        </SessionProvider>
        <RealtimeNotificationDisplay />
      </NotificationProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;