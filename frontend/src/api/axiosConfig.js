import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';
import { isTokenExpired, clearAuthData } from '../utils/authUtils';

// Create axios instance
const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

// Store navigation reference (will be set from App.js)
let navigationRef = null;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

// Request interceptor - Add token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          console.log('Token expired, redirecting to login');
          await clearAuthData();
          
          // Navigate to login if navigationRef is available
          if (navigationRef) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
          
          return Promise.reject(new Error('Token expired'));
        }
        
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('401 Unauthorized - Token invalid or expired');
      
      // Clear token and redirect to login
      await clearAuthData();
      
      if (navigationRef) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      
      return Promise.reject(error);
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;
