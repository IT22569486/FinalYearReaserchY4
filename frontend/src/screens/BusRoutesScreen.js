import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { calculateBusPredictions, getLastThreeRecordsOfTrip, getDistanceKm } from '../services/predictionService';

const socket = io(BACKEND_URL);

const BusRoutesScreen = () => {
  const [allBuses, setAllBuses] = useState([]);
  const [busTrips, setBusTrips] = useState([]);
  const [busTripRecords, setBusTripRecords] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [busArrivalTimes, setBusArrivalTimes] = useState({});
  const [busPassengerCounts, setBusPassengerCounts] = useState({});
  const navigation = useNavigation();
  const { refreshSession } = useSession();
  const predictionInFlightRef = useRef(false);
  const lastPredictionRunAtRef = useRef(0);
  const predictionRequestIdRef = useRef(0);

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
          const [routesRes, busesRes, busTripsRes, busTripRecordsRes] =
           await Promise.all([
            apiClient.get('/api/routes'),
            apiClient.get('/api/bus'),
            apiClient.get('/api/bus-trips'),
            apiClient.get('/api/bus-trip-records'),
          ]);
          setRoutes(routesRes.data);
          setAllBuses(busesRes.data);
          setBusTrips(busTripsRes.data);
          setBusTripRecords(busTripRecordsRes.data);
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
            // Merge the update with existing bus data to preserve all fields
            const newBuses = [...prevBuses];
            newBuses[index] = { ...prevBuses[index], ...updatedBus };
            return newBuses;
          }
          // If bus not found in list, add it
          return [...prevBuses, updatedBus];
        });
      });

      return () => socket.off('busLocationUpdate');
    } catch (error) {
      console.error('Error initializing BusRoutesScreen:', error);
    }
  };

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

  // Calculate arrival times and passenger counts for each bus
  useEffect(() => {
    const runPredictions = async () => {
      const nowMs = Date.now();
      if (predictionInFlightRef.current) return;
      if (nowMs - lastPredictionRunAtRef.current < 4000) return;

      if (!selectedOrigin || !selectedDestination || filteredBuses.length === 0 || !selectedRouteStops.length) {
        console.log('Skipping predictions - missing requirements:', {
          hasOrigin: !!selectedOrigin,
          hasDestination: !!selectedDestination,
          filteredBusCount: filteredBuses.length,
          stopsCount: selectedRouteStops.length
        });
        setBusArrivalTimes({});
        setBusPassengerCounts({});
        return;
      }

      const requestId = ++predictionRequestIdRef.current;
      predictionInFlightRef.current = true;
      lastPredictionRunAtRef.current = nowMs;

      console.log('Starting predictions for', filteredBuses.length, 'buses');
      
      // Use prediction service
      try {
        const { arrivalTimes, passengerCounts } = await calculateBusPredictions(
          filteredBuses,
          selectedRouteStops,
          selectedOrigin,
          routes,
          busTrips
        );

        // Ignore stale async responses from older prediction requests.
        if (requestId !== predictionRequestIdRef.current) return;

        setBusArrivalTimes(arrivalTimes);
        setBusPassengerCounts(passengerCounts);

        console.log('\nFinal predictions:', {
          arrivalTimes: Object.keys(arrivalTimes).length,
          passengerCounts: Object.keys(passengerCounts).length,
          data: { arrivalTimes, passengerCounts }
        });
      } finally {
        if (requestId === predictionRequestIdRef.current) {
          predictionInFlightRef.current = false;
        }
      }
    };

    // Calculate predictions immediately (no debounce)
    // Fire and forget - don't block bus display
    runPredictions().catch(err => {
      console.error('Prediction calculation error:', err);
    });

  }, [selectedOrigin, selectedDestination, filteredBuses, selectedRouteStops, routes]);



  const getRecordTimeMs = (value) => {
    if (!value) return 0;
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
      const parsed = Date.parse(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const filteredBuses = useMemo(() => {
    let buses = allBuses;
    
    // Filter by route
    if (selectedRoute) {
      buses = buses.filter((bus) => bus.routeId === selectedRoute);
    }
    
    // Filter by direction - show buses going in the right direction
    if (selectedOrigin && selectedDestination && selectedRouteStops && selectedRouteStops.length > 0) {
      const originIndex = selectedRouteStops.findIndex(stop => stop.stopName === selectedOrigin);
      const destinationIndex = selectedRouteStops.findIndex(stop => stop.stopName === selectedDestination);
      
      if (originIndex !== -1 && destinationIndex !== -1) {
        // Determine desired direction: 0 = forward (destination > origin), 1 = reverse (destination < origin)
        const desiredDirection = destinationIndex >= originIndex ? 0 : 1;
        
        console.log('DEBUG filteredBuses:', {
          allBusesCount: buses.length,
          routeFilter: selectedRoute,
          desiredDirection,
          originIndex,
          destinationIndex
        });
        
        buses = buses.filter((bus) => {
          // Only show buses that have a current trip (must have assigned busTrip)
          if (!bus.currentTrip) {
            console.log(`Bus ${bus.busId} filtered: no currentTrip`);
            return false;
          }
          
          // Get bus direction from busTrip
          const busTrip = busTrips.find(trip => trip.tripId === bus.currentTrip);
          if (!busTrip || busTrip.direction === undefined) {
            console.log(`Bus ${bus.busId} filtered: no busTrip or direction`);
            return false;
          }
          
          // Only show buses going in the right direction
          if (busTrip.direction !== desiredDirection) {
            console.log(`Bus ${bus.busId} filtered: direction ${busTrip.direction} !== ${desiredDirection}`);
            return false;
          }

          // Only show buses that haven't passed the origin
          if (!bus.location) {
            console.log(`Bus ${bus.busId} filtered: no location data`);
            return false;
          }

          let currentStopIndex = -1;
          let minDist = Infinity;
          selectedRouteStops.forEach((stop, idx) => {
            const dist = getDistanceKm(bus.location.latitude, bus.location.longitude, stop.lat, stop.lng);
            if (dist < minDist) {
              minDist = dist;
              currentStopIndex = idx;
            }
          });

          let hasNotPassed = false;
          if (desiredDirection === 0) {
            // Forward: current stop should be at or before origin
            hasNotPassed = currentStopIndex <= originIndex;
          } else {
            // Reverse: current stop should be at or after origin
            hasNotPassed = currentStopIndex >= originIndex;
          }

          if (!hasNotPassed) {
            console.log(`Bus ${bus.busId} filtered: has passed origin`);
            return false;
          }

          console.log(`Bus ${bus.busId} INCLUDED in filteredBuses`);
          return true;
        });
      }
    }
    
    console.log('Final filteredBuses count:', buses);
    return buses;
  }, [selectedRoute, selectedOrigin, selectedDestination, allBuses, busTrips, selectedRouteStops]);

  const selectedRouteObject = useMemo(() => {
    if (!selectedRoute) return null;
    return routes.find((r) => r.id === selectedRoute);
  }, [selectedRoute, routes]);

  const selectedRoutePath = useMemo(() => {
    return selectedRouteDetails ? selectedRouteDetails.coordinates : [];
  }, [selectedRouteDetails]);

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
    
    // Show all stops except the origin itself
    return selectedRouteStops
      .filter((stop, index) => index !== originIndex)
      .map(stop => ({
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
    navigation.navigate('CurrentTrip', {
      busId: bus.busId,
      routeId: bus.routeId,
      origin: selectedOrigin,
      destination: selectedDestination,
    });
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
          latitude: selectedRouteObject?.path?.[0]?.lat ?? passengerLocation.latitude,
          longitude: selectedRouteObject?.path?.[0]?.lng ?? passengerLocation.longitude,
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
        selectedOrigin={selectedOrigin}
        selectedDestination={selectedDestination}
        passengerArrivalTimes={busArrivalTimes}
        passengerCounts={busPassengerCounts}
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