import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import StreamingScreen from './src/screens/StreamingScreen';
import SettingsScreen  from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg:     '#0a0f1e',
  card:   '#111827',
  border: '#1f2937',
  accent: '#00d4ff',
  sub:    '#6b7280',
  white:  '#e8ecf0',
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle:           { backgroundColor: COLORS.bg, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
          headerTintColor:       COLORS.accent,
          headerTitleStyle:      { fontWeight: '700', letterSpacing: 0.5 },
          tabBarStyle:           { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
          tabBarActiveTintColor:   COLORS.accent,
          tabBarInactiveTintColor: COLORS.sub,
          tabBarIcon: ({ color, size }) => {
            const icons = { Stream: '📡', Settings: '⚙️' };
            return <Text style={{ fontSize: size - 2 }}>{icons[route.name]}</Text>;
          },
        })}
      >
        <Tab.Screen
          name="Stream"
          component={StreamingScreen}
          options={{ title: 'Live Stream', tabBarLabel: 'Stream' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
