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




// import { initializeApp } from 'firebase/app';
// import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const firebaseConfig = {
//   apiKey: "AIzaSyA8fdnqbbV1SdjSwVjQivxQBpZrEVQgsb0",
//   authDomain: "bus-monitoring-temp.firebaseapp.com",
//   databaseURL: "https://bus-monitoring-temp-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "bus-monitoring-temp",
//   storageBucket: "bus-monitoring-temp.firebasestorage.app",
//   messagingSenderId: "1015291518733",
//   appId: "1:1015291518733:web:29ff3f43253cd70b011a44"
// };

// const app = initializeApp(firebaseConfig);

// // Initialize Firebase Auth with AsyncStorage persistence for React Native
// export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(AsyncStorage),
// });




// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyA8fdnqbbV1SdjSwVjQivxQBpZrEVQgsb0",
//   authDomain: "bus-monitoring-temp.firebaseapp.com",
//   databaseURL: "https://bus-monitoring-temp-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "bus-monitoring-temp",
//   storageBucket: "bus-monitoring-temp.firebasestorage.app",
//   messagingSenderId: "1015291518733",
//   appId: "1:1015291518733:web:29ff3f43253cd70b011a44"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);