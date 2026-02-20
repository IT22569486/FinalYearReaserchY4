import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import apiClient from '../api/axiosConfig';
import * as Location from 'expo-location';
import MapViewComponent from '../components/MapViewComponent';
import { BACKEND_URL } from '../config';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';

const socket = io(BACKEND_URL);

const BusRoutesScreen = () => {
  const [allBuses, setAllBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigation = useNavigation();
  const { refreshSession } = useSession();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      initializeScreen();
    });
    return unsubscribe;
  }, [navigation]);

  const initializeScreen = async () => {
    try {
      await updateLastActivity();
      await refreshSession();

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
            apiClient.get('/api/routes'),
            apiClient.get('/api/bus'),
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
    } catch (error) {
      console.error('Error initializing BusRoutesScreen:', error);
    }
  };

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
          apiClient.get('/api/routes'),
          apiClient.get('/api/bus'),
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

  useEffect(() => {
    if (!selectedRoute) {
      setSelectedRouteDetails(null);
      return;
    }

    const fetchRouteDetails = async () => {
      try {
        const res = await apiClient.get(`/api/routes/google-route/${selectedRoute}`);
        setSelectedRouteDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch route details:', err);
        setErrorMsg('Failed to load route details');
      }
    };

    fetchRouteDetails();
  }, [selectedRoute]);

  const filteredBuses = useMemo(() => {
    if (!selectedRoute) return allBuses;
    return allBuses.filter((bus) => bus.routeId === selectedRoute);
  }, [selectedRoute, allBuses]);

  const selectedRouteObject = useMemo(() => {
    if (!selectedRoute) return null;
    return routes.find((r) => r.id === selectedRoute);
  }, [selectedRoute, routes]);

  const selectedRoutePath = useMemo(() => {
    return selectedRouteDetails ? selectedRouteDetails.coordinates : [];
  }, [selectedRouteDetails]);

  const selectedRouteStops = useMemo(() => {
    if (!selectedRouteDetails) return [];
    return selectedRouteDetails.stops.map(stopName => {
      const stopData = routes.flatMap(r => r.path).find(p => p.stopName === stopName);
      return {
        lat: stopData?.lat,
        lng: stopData?.lng,
        stopName: stopName,
      };
    });
  }, [selectedRouteDetails, routes]);

  const stopPickerItems = useMemo(() => {
    if (!selectedRouteStops || selectedRouteStops.length === 0) return [];
    return selectedRouteStops.map(stop => ({
      label: stop.stopName,
      value: stop.stopName,
    }));
  }, [selectedRouteStops]);

  const destinationPickerItems = useMemo(() => {
    if (!selectedOrigin) return [];
    const originIndex = selectedRouteStops.findIndex(stop => stop.stopName === selectedOrigin);
    if (originIndex === -1) return [];
    
    return selectedRouteStops.map(stop => ({
        label: stop.stopName,
        value: stop.stopName,
    }));
  }, [selectedOrigin, selectedRouteStops]);

  // Format routes data for the picker
  const pickerItems = useMemo(() => {
    return routes.map(route => ({
      label: route.name,
      value: route.id,
    }));
  }, [routes]);

  const handleBusPress = (bus) => {
    if (!selectedOrigin || !selectedDestination) {
      Alert.alert('Missing Information', 'Please select both an origin and a destination.');
      return;
    }

    const startTrip = async () => {
      try {
        const response = await apiClient.post('/api/trip/start', {
          busId: bus.busId,
          departure: selectedOrigin,
          destination: selectedDestination,
        });

        const tripId = response?.data?.id || response?.data?._id || null;

        navigation.navigate('CurrentTrip', {
          busId: bus.busId,
          routeId: bus.routeId,
          origin: selectedOrigin,
          destination: selectedDestination,
          tripId,
        });
      } catch (err) {
        console.error('Failed to start trip:', err?.response?.data || err.message);
        Alert.alert('Unable to start trip', 'Please try again or re-login.');
      }
    };

    Alert.alert(
      'Confirm Trip',
      `Travel from ${selectedOrigin} to ${selectedDestination} with Bus ${bus.busId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => startTrip() },
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
        initialRegion={selectedRouteObject?{
          latitude: selectedRouteObject.path[0].lat,
          longitude: selectedRouteObject.path[0].lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }:{
          latitude: passengerLocation.latitude,
          longitude: passengerLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        routePath={selectedRoutePath}
        stops={selectedRouteStops}
        routes={routes}
      />
      <View style={styles.filterOverlay}>
        <RNPickerSelect
          onValueChange={(value) => {
            setSelectedRoute(value);
            setSelectedOrigin(null);
            setSelectedDestination(null);
          }}
          items={pickerItems}
          style={pickerSelectStyles}
          value={selectedRoute}
          placeholder={{ label: 'Show All Routes', value: null }}
          useNativeAndroidPickerStyle={false}
          Icon={() => {
            return <Ionicons name="chevron-down" size={24} color="gray" />;
          }}
        />
        {selectedRoute && (
          <>
            <View style={styles.separator} />
            <RNPickerSelect
              onValueChange={(value) => {
                setSelectedOrigin(value);
                setSelectedDestination(null); // Reset destination when origin changes
              }}
              items={stopPickerItems}
              style={pickerSelectStyles}
              value={selectedOrigin}
              placeholder={{ label: 'Select Origin', value: null }}
              useNativeAndroidPickerStyle={false}
              Icon={() => <Ionicons name="locate" size={24} color="gray" />}
            />
            <View style={styles.separator} />
            <RNPickerSelect
              onValueChange={(value) => setSelectedDestination(value)}
              items={destinationPickerItems}
              style={pickerSelectStyles}
              value={selectedDestination}
              placeholder={{ label: 'Select Destination', value: null }}
              disabled={!selectedOrigin}
              useNativeAndroidPickerStyle={false}
              Icon={() => <Ionicons name="flag" size={24} color="gray" />}
            />
          </>
        )}
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
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 5,
  }
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