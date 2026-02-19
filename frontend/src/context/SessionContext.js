import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { 
  isTokenExpired, 
  getTimeUntilExpiration, 
  clearAuthData,
  updateLastActivity,
  isInactive 
} from '../utils/authUtils';
import ScreenLockOverlay from '../components/ScreenLockOverlay';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

// Screen lock timeout in minutes
const SCREEN_LOCK_TIMEOUT = 20/60;

export const SessionProvider = ({ children }) => {
  const navigation = useNavigation();
  const expirationTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const screenLockTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [isScreenLocked, setIsScreenLocked] = useState(false);

  useEffect(() => {
    checkTokenExpiration();
    setupInactivityMonitoring();
    setupScreenLockMonitoring();
    
    // Keep screen awake initially
    activateKeepAwake('app-active');
    
    // Monitor app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearTimers();
      deactivateKeepAwake('app-active');
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      const token = await AsyncStorage.getItem('userToken');
      
      if (token && isTokenExpired(token)) {
        handleLogout('Session expired');
      } else {
        // Check for inactivity
        const userInactive = await isInactive(30);
        if (userInactive) {
          handleLogout('Session expired due to inactivity');
        } else {
          await updateLastActivity();
        }
      }
    }
    
    appStateRef.current = nextAppState;
  };

  const checkTokenExpiration = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        return;
      }
      
      if (isTokenExpired(token)) {
        handleLogout('Session expired');
        return;
      }
      
      // Set timer to logout when token expires
      const timeUntilExpiration = getTimeUntilExpiration(token);
      
      if (timeUntilExpiration > 0) {
        expirationTimerRef.current = setTimeout(() => {
          handleLogout('Session expired');
        }, timeUntilExpiration);
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  };

  const setupInactivityMonitoring = async () => {
    // Update activity timestamp initially
    await updateLastActivity();
    
    // Check for inactivity every minute
    inactivityTimerRef.current = setInterval(async () => {
      const userInactive = await isInactive(20/60); // 30 minutes
      
      if (userInactive) {
        handleLogout('Session expired due to inactivity');
      }
    }, 60000); // Check every minute
  };

  const setupScreenLockMonitoring = async () => {
    // Check for screen lock inactivity every 30 seconds
    screenLockTimerRef.current = setInterval(async () => {
      const lastActivity = await AsyncStorage.getItem('lastActivity');
      
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        const currentTime = Date.now();
        const inactiveTime = currentTime - lastActivityTime;
        const lockTimeout = SCREEN_LOCK_TIMEOUT * 60 * 1000; // Convert to ms
        
        // Lock screen if inactive for defined period but not logged out yet
        if (inactiveTime > lockTimeout && !isScreenLocked) {
          console.log('Locking screen due to inactivity');
          setIsScreenLocked(true);
          // Stop keeping screen awake - allows device to dim/sleep
          deactivateKeepAwake('app-active');
        }
      }
    }, 30000); // Check every 30 seconds
  };

  const handleUnlockScreen = async () => {
    console.log('Screen unlocked by user');
    setIsScreenLocked(false);
    await updateLastActivity();
    // Resume keeping screen awake
    activateKeepAwake('app-active');
  };

  const handleLogout = async (reason = 'Session ended') => {
    console.log('Logging out:', reason);
    clearTimers();
    await clearAuthData();
    
    // Navigate to login
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const clearTimers = () => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
    
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (screenLockTimerRef.current) {
      clearInterval(screenLockTimerRef.current);
      screenLockTimerRef.current = null;
    }
  };

  const refreshSession = async () => {
    await updateLastActivity();
    await checkTokenExpiration();
    // Unlock screen when session is refreshed
    if (isScreenLocked) {
      setIsScreenLocked(false);
      activateKeepAwake('app-active');
    }
  };

  return (
    <SessionContext.Provider value={{ refreshSession, handleLogout }}>
      {children}
      <ScreenLockOverlay visible={isScreenLocked} onUnlock={handleUnlockScreen} />
    </SessionContext.Provider>
  );
};
