import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token string
 * @returns {boolean} true if expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

/**
 * Get milliseconds until token expiration
 * @param {string} token - JWT token string
 * @returns {number} milliseconds until expiry, or 0 if already expired
 */
export const getTimeUntilExpiration = (token) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return 0;
    const msRemaining = decoded.exp * 1000 - Date.now();
    return Math.max(0, msRemaining);
  } catch {
    return 0;
  }
};

/**
 * Check if the user has been inactive longer than the given threshold
 * @param {number} maxInactiveMinutes - Maximum inactive time in minutes
 * @returns {Promise<boolean>} true if inactive
 */
export const isInactive = async (maxInactiveMinutes = 30) => {
  try {
    const lastActivity = await AsyncStorage.getItem('lastActivity');
    if (!lastActivity) return true;

    const lastActivityTime = parseInt(lastActivity, 10);
    const diffMs = Date.now() - lastActivityTime;
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes > maxInactiveMinutes;
  } catch {
    return true;
  }
};

/**
 * Update the last activity timestamp for session management
 */
export const updateLastActivity = async () => {
  try {
    const timestamp = Date.now().toString(); // store as ms for parseInt compatibility
    await AsyncStorage.setItem('lastActivity', timestamp);
    return timestamp;
  } catch (error) {
    console.error('Error updating last activity:', error);
    return null;
  }
};

/**
 * Get the last activity timestamp
 */
export const getLastActivity = async () => {
  try {
    return await AsyncStorage.getItem('lastActivity');
  } catch (error) {
    console.error('Error getting last activity:', error);
    return null;
  }
};

/**
 * Check if the session has expired
 * @param {number} maxInactiveMinutes - Maximum inactive time in minutes
 */
export const isSessionExpired = async (maxInactiveMinutes = 30) => {
  try {
    const lastActivity = await getLastActivity();
    if (!lastActivity) return true;

    const lastActivityTime = new Date(lastActivity);
    const now = new Date();
    const diffMinutes = (now - lastActivityTime) / (1000 * 60);

    return diffMinutes > maxInactiveMinutes;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return true;
  }
};

/**
 * Check if the JWT token is valid and not expired
 */
export const isTokenValid = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;

    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Check if token is expired
    if (decoded.exp && decoded.exp < currentTime) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Clear authentication data from storage
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['userToken', 'lastActivity', 'userData']);
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

/**
 * Get user data from token
 */
export const getUserFromToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    const decoded = jwtDecode(token);
    return {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

/**
 * Store user token and update activity
 */
export const storeAuthToken = async (token) => {
  try {
    await AsyncStorage.setItem('userToken', token);
    await updateLastActivity();
    return true;
  } catch (error) {
    console.error('Error storing auth token:', error);
    return false;
  }
};
