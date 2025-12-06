import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import axios from 'axios';
import * as Location from 'expo-location';
import MapViewComponent from '../components/MapViewComponent';
import { BACKEND_URL } from '../config';

const socket = io(BACKEND_URL);

/**
 * Parses a Google Maps directions URL to extract an array of coordinates.
 * @param {string} url The Google Maps URL.
 * @returns {Array<{latitude: number, longitude: number}>} An array of coordinate objects.
 */
function parseGoogleMapsUrl(url) {
  if (!url) return [];
  // Regex to find all lat,lng pairs in the /dir/ part of the URL
const regex = /(origin|destination|waypoints)=([0-9.\-]+),([0-9.\-]+)/g;

  const match = url.match(regex);

  if (!match || !match[1]) return [];

  return match[1]
    .split('/')
    .filter(Boolean) // Remove any empty strings from trailing slashes
    .map(pair => {
      const [lat, lng] = pair.split(',');
      return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
    });
}

const BusRoutesScreen = () => {
  const [allBuses, setAllBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setPassengerLocation(location.coords);
    })();

    const fetchData = async () => {
      try {
        const [routesRes, busesRes] =
         await Promise.all([
          axios.get(`${BACKEND_URL}/api/routes`),
          axios.get(`${BACKEND_URL}/api/bus`),
        ]);
        setRoutes(routesRes.data);
        setAllBuses(busesRes.data);
      } catch (err) {
        setErrorMsg('Failed to fetch data');
        console.error(err);
      }
    };

    fetchData();

    socket.on('busLocationUpdate', (updatedBus) => {
      setAllBuses((prevBuses) => {
        const index = prevBuses.findIndex((bus) => bus.busId === updatedBus.busId);
        if (index !== -1) {
          const newBuses = [...prevBuses];
          newBuses[index] = updatedBus;
          return newBuses;
        }
        return [...prevBuses, updatedBus];
      });
    });

    return () => socket.off('busLocationUpdate');
  }, []);

  const filteredBuses = useMemo(() => {
    if (!selectedRoute) return allBuses;
    return allBuses.filter((bus) => bus.routeId === selectedRoute);
  }, [selectedRoute, allBuses]);

  const selectedRouteObject = useMemo(() => {
    if (!selectedRoute) return null;
    return routes.find((r) => r.id === selectedRoute);
  }, [selectedRoute, routes]);

  const selectedRoutePath = useMemo(() => {
    if (!selectedRouteObject || !selectedRouteObject.googleMapsUrl) {
      return [];
    }
    return parseGoogleMapsUrl(selectedRouteObject.googleMapsUrl);
  }, [selectedRouteObject]);

  const selectedRouteStops = useMemo(() => {
    if (!selectedRouteObject || !selectedRouteObject.googleMapsUrl) {
      return [];
    }
    // Generate stops from the parsed URL coordinates
    const coordinates = parseGoogleMapsUrl(selectedRouteObject.googleMapsUrl);
    return coordinates.map((coord, index) => ({
      lat: coord.latitude,
      lng: coord.longitude,
      stopName: `Stop ${index + 1}` // Auto-generate stop names
    }));
  }, [selectedRouteObject]);

  // Format routes data for the picker
  const pickerItems = useMemo(() => {
    return routes.map(route => ({
      label: route.name,
      value: route.id,
    }));
  }, [routes]);

  const handleBusPress = (bus) => {
    Alert.alert(
      'Confirm Trip',
      `Do you want to travel with Bus ${bus.busId} on route ${bus.routeId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => navigation.navigate('CurrentTrip', { busId: bus.busId, routeId: bus.routeId }) },
      ],
      { cancelable: false }
    );
  };

  if (!passengerLocation || errorMsg) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>{errorMsg || 'Fetching your location...'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapViewComponent
        buses={filteredBuses}
        passengerLocation={passengerLocation}
        onBusPress={handleBusPress}
        routePath={selectedRoutePath}
        stops={selectedRouteStops}
      />
      <View style={styles.filterOverlay}>
        <RNPickerSelect
          onValueChange={(value) => setSelectedRoute(value)}
          items={pickerItems}
          style={pickerSelectStyles}
          value={selectedRoute}
          placeholder={{ label: 'Show All Routes', value: null }}
          useNativeAndroidPickerStyle={false}
          Icon={() => {
            return <Ionicons name="chevron-down" size={24} color="gray" />;
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, 
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, 
  },
  iconContainer: {
    top: Platform.OS === 'ios' ? 10 : 12,
    right: 12,
  },
});

export default BusRoutesScreen;