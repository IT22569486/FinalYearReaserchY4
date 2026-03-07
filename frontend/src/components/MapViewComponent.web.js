import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Web stub for MapViewComponent - react-native-maps is not supported on web.
// The app is intended to run on Android/iOS via Expo Go.
const MapViewComponent = ({ buses, passengerLocation, initialRegion, onBusPress, routePath, stops, routes = [] }) => {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.title}>Map View</Text>
        <Text style={styles.subtitle}>
          Map is only available on Android and iOS.{'\n'}
          Please use Expo Go on your phone to view the map.
        </Text>
        {buses && buses.length > 0 && (
          <View style={styles.busInfo}>
            <Text style={styles.busInfoTitle}>Tracking {buses.length} bus{buses.length > 1 ? 'es' : ''}:</Text>
            {buses.map((bus, i) => (
              <Text key={i} style={styles.busInfoText}>
                Bus {bus.busId || bus.id} — {bus.status || 'Active'}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    maxWidth: 400,
    width: '90%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  busInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    width: '100%',
  },
  busInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  busInfoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
});

export default MapViewComponent;
