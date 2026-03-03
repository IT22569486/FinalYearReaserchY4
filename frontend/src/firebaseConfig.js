import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAHmPMI44VQUKdSVg-bqZNlxSVohzfHl-c",
  authDomain: "passengerappresearch.firebaseapp.com",
  projectId: "passengerappresearch",
  storageBucket: "passengerappresearch.firebasestorage.app",
  messagingSenderId: "1074857536929",
  appId: "1:1074857536929:web:31d82ca0f58a5e8c0eefe0",
  measurementId: "G-XFQEE7QGF5"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
