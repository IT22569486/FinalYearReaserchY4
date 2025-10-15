import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import CurrentTripScreen from '../screens/CurrentTripScreen';
import TimetableScreen from '../screens/TimetableScreen';
import SignUpScreen from '../screens/SignUpScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />  
        <Stack.Screen name="CurrentTrip" component={CurrentTripScreen} />  
        <Stack.Screen name="Timetable" component={TimetableScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />  
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;