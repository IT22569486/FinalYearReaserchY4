import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AppNavigator from './src/navigation';
import { updateLastActivity } from './src/utils/authUtils';

const App = () => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Track user activity when app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Track initial activity
    updateLastActivity();
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // User is actively using the app
      await updateLastActivity();
    }
    
    appState.current = nextAppState;
  };

  return <AppNavigator />;
};

export default App;