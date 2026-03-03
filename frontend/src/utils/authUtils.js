import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

/**
 * Decode JWT token and extract payload
 */
export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    // JWT exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTimeUntilExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Date.now() / 1000;
    const timeLeft = decoded.exp - currentTime;
    return timeLeft > 0 ? timeLeft * 1000 : 0;
  } catch (error) {
    console.error('Error getting expiration time:', error);
    return 0;
  }
};

/**
 * Check if token is valid (exists and not expired)
 */
export const isTokenValid = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      return false;
    }
    
    return !isTokenExpired(token);
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Clear authentication data
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('lastActivity');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = async () => {
  try {
    await AsyncStorage.setItem('lastActivity', Date.now().toString());
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
};

/**
 * Check if user has been inactive for too long
 * @param {number} maxInactiveMinutes - Maximum allowed inactive time in minutes
 */
export const isInactive = async (maxInactiveMinutes = 15) => {
  try {
    const lastActivity = await AsyncStorage.getItem('lastActivity');
    if (!lastActivity) {
      return false;
    }
    
    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const inactiveTime = currentTime - lastActivityTime;
    const maxInactiveTime = maxInactiveMinutes * 60 * 1000;
    
    return inactiveTime > maxInactiveTime;
  } catch (error) {
    console.error('Error checking inactivity:', error);
    return false;
  }
};
