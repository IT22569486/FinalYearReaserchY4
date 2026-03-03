import React, { useEffect, useMemo, useRef, useState } from 'react'; 
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import apiClient from '../api/axiosConfig';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapViewComponent from '../components/MapViewComponent';
import { BACKEND_URL, ML_BACKEND_URL } from '../config';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';
import axios from 'axios';
import { sendNotification } from '../utils/notificationUtils';
import {
  findStopByName,
  getClosestStopIndex,
  getDistanceKm,
  getNextStopIndex,
} from '../utils/tripTrackingUtils';
import { 
  getLastThreeRecordsOfTrip as getLastThreeRecordsFromService,
  getDistanceKm as getDistanceKmService,
  predictSegmentETA 
} from '../services/predictionService';

const socket = io(BACKEND_URL);

const CurrentTripScreen = ({ route }) => {
  const { busId, origin: userOrigin, destination: userDestination, tripId: passengeTripId } = route.params || {};
  
  const [bus, setBus] = useState(null);
  const [busTrip, setBusTrip] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeDetails, setRouteDetails] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [predictedPassengers, setPredictedPassengers] = useState(null); 
  const [predictedArrivalTime, setPredictedArrivalTime] = useState(null); 
  const [totalEtaToDestination, setTotalEtaToDestination] = useState(null);
  const [lastPassedStop, setLastPassedStop] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const navigation = useNavigation();
  const { refreshSession } = useSession(); 
  const lastPassedIndexRef = useRef(-1);
  const originNotifiedRef = useRef(false);
  const destinationApproachingRef = useRef(false);
  const destinationReachedRef = useRef(false);

  // Effect to fetch bus data and passenger location
  useEffect(() => {
    if (!busId) {
      setErrorMsg('No bus selected for tracking.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
      });
      return;
    }

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setPassengerLocation(location.coords);

      // Start watching passenger location for auto-trip management
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (newLocation) => {
          setPassengerLocation(newLocation.coords);
        }
      );

      return () => {
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    })();

    const fetchInitialData = async () => {
      try {
        await updateLastActivity();
        await refreshSession();

        // Fetch the specific bus
        const busRes = await apiClient.get(`/api/bus/${busId}`);
        setBus(busRes.data);

        // Fetch all routes for context
        const routesRes = await apiClient.get('/api/routes');
        setAllRoutes(routesRes.data);

      } catch (err) {
        setErrorMsg('Could not find the specified bus or routes.');
        console.error(err);
      }
    };

    fetchInitialData();

    const handleUpdate = (updatedBus) => {
      if (updatedBus.busId === busId) {
        // Merge the update with existing bus data to preserve all fields
        setBus(prev => ({ ...prev, ...updatedBus }));
        // Add to history for sequence-based prediction
        // setTripHistory(prevHistory => [...prevHistory, updatedBus]);
      }
    };
    
    socket.on('busLocationUpdate', handleUpdate);

    return () => socket.off('busLocationUpdate', handleUpdate);
  }, [busId, navigation]);

  // Effect to fetch busTrip data to get direction
  useEffect(() => {
    if (bus && bus.currentTrip) {
      const fetchBusTrip = async () => {
        try {
          const res = await apiClient.get(`/api/bus-trips/${bus.currentTrip}`);
          setBusTrip(res.data);
        } catch (err) {
          console.error('Could not fetch busTrip:', err);
        }
      };
      fetchBusTrip();
    }
  }, [bus?.currentTrip]);

  // effect to fetch detailed route data *after* bus data is available
  useEffect(() => {
    if (bus && bus.routeId) {
      const fetchRouteDetails = async () => {
        try {
          const res = await apiClient.get(`/api/routes/google-route/${bus.routeId}`);
          setRouteDetails(res.data);
        } catch (err) {
          setErrorMsg('Could not find the specified route details.');
          console.error(err);
        }
      };
      fetchRouteDetails();
    }
  }, [bus]); // This effect runs whenever the 'bus' state changes

  // useMemo must be at the top level of the component
  const selectedRoutePath = useMemo(() => {
    return routeDetails ? routeDetails.coordinates : [];
  }, [routeDetails]);

  // Extract the stops to display as markers
  const routeStops = useMemo(() => {
    if (!routeDetails || !allRoutes.length) {
      return [];
    }
    // Find the full route object from allRoutes
    const currentRoute = allRoutes.find(r => r.id === bus.routeId);
    if (!currentRoute || !currentRoute.path) return [];
    setCurrentRoute(currentRoute);

    // Map the stop names from details to the full stop objects from the path
    return routeDetails.stops.map(stopName => {
      return currentRoute.path.find(p => p.stopName === stopName);
    }).filter(Boolean); // Filter out any undefined stops
  }, [routeDetails, allRoutes, bus]);

  const passengerOriginStop = useMemo(() => {
    return findStopByName(routeStops, userOrigin);
  }, [routeStops, userOrigin]);

  const passengerDestinationStop = useMemo(() => {
    return findStopByName(routeStops, userDestination);
  }, [routeStops, userDestination]);

  useEffect(() => {
    lastPassedIndexRef.current = -1;
    originNotifiedRef.current = false;
    destinationApproachingRef.current = false;
    destinationReachedRef.current = false;
    setLastPassedStop(null);
    setNextStop(null);
  }, [busId, userOrigin, userDestination]);

  useEffect(() => {
    if (!bus?.location || !routeStops.length || !busTrip) return;

    const direction = busTrip.direction === 1 ? 'reverse' : 'forward';
    const closestIndex = getClosestStopIndex(
      routeStops,
      {
        latitude: bus.location.latitude,
        longitude: bus.location.longitude,
      },
      0.2
    );

    if (closestIndex !== -1) {
      const lastIndex = lastPassedIndexRef.current;
      const isForwardAdvance = direction === 'forward'
        ? closestIndex > lastIndex
        : closestIndex < lastIndex;

      if (lastIndex === -1 || isForwardAdvance) {
        lastPassedIndexRef.current = closestIndex;
        setLastPassedStop(routeStops[closestIndex]);

        // Determine next stop based on numeric direction
        // Direction 0=forward (higher indices), 1=reverse (lower indices)
        const numericDirection = busTrip.direction === 1 ? 1 : 0;
        let nextIndex = -1;
        if (numericDirection === 0) { // forward
          nextIndex = closestIndex < routeStops.length - 1 ? closestIndex + 1 : -1;
        } else { // reverse
          nextIndex = closestIndex > 0 ? closestIndex - 1 : -1;
        }
        setNextStop(nextIndex !== -1 ? routeStops[nextIndex] : null);
      }
    }

    if (passengerOriginStop && !originNotifiedRef.current) {
      const distanceToOrigin = getDistanceKm(
        bus.location.latitude,
        bus.location.longitude,
        passengerOriginStop.lat,
        passengerOriginStop.lng
      );

      if (distanceToOrigin <= 1) {
        originNotifiedRef.current = true;
        sendNotification(
          'Bus approaching your stop',
          `Bus ${bus.busId} is approaching ${passengerOriginStop.stopName}.`,
          {
            type: 'bus_arrival',
            busId: bus.busId,
            stopName: passengerOriginStop.stopName,
          },
          { showNative: true, showInApp: true, type: 'warning' }
        );
      }

      // Auto-start trip when bus arrives at origin and passenger is on the bus
      if (
        passengerLocation &&
        !passengeTripId &&
        distanceToOrigin <= 0.05 && // Bus is within 50 meters of origin
        getDistanceKm(
          passengerLocation.latitude,
          passengerLocation.longitude,
          bus.location.latitude,
          bus.location.longitude
        ) <= 0.05 // Passenger is within 50 meters of bus
      ) {
        const startTripAutomatically = async () => {
          try {
            const response = await apiClient.post('/api/trip/start', {
              busId: bus.busId,
              departure: userOrigin,
              destination: userDestination,
            });

            const newTripId = response?.data?.id || response?.data?._id || null;
            
            // Update route params with the new trip ID
            route.params = { ...route.params, tripId: newTripId };
            
            sendNotification(
              'Trip Started',
              `Your trip from ${userOrigin} to ${userDestination} has started successfully.`,
              { type: 'trip_started', tripId: newTripId },
              { showNative: true, showInApp: true, type: 'success' }
            );
          } catch (err) {
            console.error('Failed to auto-start trip:', err);
          }
        };

        startTripAutomatically();
      }
    }

    // Notify when bus is approaching destination (1 km away)
    if (
      passengerDestinationStop &&
      passengeTripId &&
      !destinationApproachingRef.current &&
      !destinationReachedRef.current
    ) {
      const distanceToDestination = getDistanceKm(
        bus.location.latitude,
        bus.location.longitude,
        passengerDestinationStop.lat,
        passengerDestinationStop.lng
      );

      if (distanceToDestination <= 1.0 && distanceToDestination > 0.05) {
        destinationApproachingRef.current = true;
        sendNotification(
          'Approaching Destination',
          `Bus ${bus.busId} is approaching ${passengerDestinationStop.stopName}. Get ready to disembark.`,
          {
            type: 'destination_approaching',
            busId: bus.busId,
            stopName: passengerDestinationStop.stopName,
            distance: distanceToDestination.toFixed(2),
          },
          { showNative: true, showInApp: true, type: 'info' }
        );
      }
    }

    // Auto-end trip when bus arrives at destination
    if (
      passengerDestinationStop &&
      passengerLocation &&
      passengeTripId &&
      !destinationReachedRef.current
    ) {
      const distanceToDestination = getDistanceKm(
        bus.location.latitude,
        bus.location.longitude,
        passengerDestinationStop.lat,
        passengerDestinationStop.lng
      );

      // Check if bus is at destination and passenger is still on bus
      if (
        distanceToDestination <= 0.05 && // Bus is within 50 meters of destination
        getDistanceKm(
          passengerLocation.latitude,
          passengerLocation.longitude,
          bus.location.latitude,
          bus.location.longitude
        ) <= 0.05 // Passenger is within 50 meters of bus
      ) {
        destinationReachedRef.current = true;
        
        const endTripAutomatically = async () => {
          try {
            await apiClient.put('/api/trip/end', { tripId: passengeTripId });
            
            sendNotification(
              'Trip Completed',
              `You have arrived at ${userDestination}. Thank you for traveling with us!`,
              { type: 'trip_ended', tripId: passengeTripId, destination: userDestination },
              { showNative: true, showInApp: true, type: 'success' }
            );

            // Navigate to rating screen
            setTimeout(() => {
              navigation.navigate('Rating', {
                tripId: passengeTripId,
                busId: bus.busId,
                driverId: bus.driverId || bus.driver_id || 'unknown',
                busNumber: bus.busId,
              });
            }, 1000);
          } catch (err) {
            console.error('Failed to auto-end trip:', err);
          }
        };

        endTripAutomatically();
      }
    }
}, [bus, busTrip, routeStops, passengerOriginStop, passengerDestinationStop, passengerLocation, passengeTripId, userOrigin, userDestination, route, navigation]);

  const handleEndTrip = async () => {
    try {
      if (!passengeTripId) {
        console.error('No trip ID available to end trip');
        Alert.alert('Error', 'Trip ID not found. Cannot end trip.');
        return;
      }
      await apiClient.put('/api/trip/end', { tripId: passengeTripId });

    } catch (error) {
      console.error('Failed to end trip on the server:', error);
      Alert.alert('Error', 'Failed to end trip. Please try again.');
    } finally {
      // Navigate to rating screen instead of going back
      if (bus && busId) {
        navigation.navigate('Rating', {
          tripId: passengeTripId,
          busId: busId,
          driverId: bus.driverId || bus.driver_id || 'unknown',
          busNumber: bus.busId,
        });
      } else {
        // Fallback if bus data is not available
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
        });
      }
    }
  };

  const handleChooseAnotherBus = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
    });
  };

  // Effect to call prediction model when bus location or route changes
  useEffect(() => {
    if (!bus || !routeDetails || !bus.location) {
      return;
    }

    // Debounce the prediction logic to avoid excessive API calls
    const handler = setTimeout(() => {
      // --- 1. Find Current and Next Stop ---
      const stops = routeStops; // Use the memoized stops with coordinates
      if (!stops || stops.length < 2) {
        console.log("Prediction skipped: Not enough stops in route path.");
        return;
      }

      // --- 2. Prepare Data for Prediction ---
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const month = now.getMonth() + 1; // JS months are 0-indexed
      const day = now.getDate();
      const dayType = (now.getDay() === 0 || now.getDay() === 6) ? 'weekend' : 'weekday';
      const currentRoute = allRoutes.find(r => r.id === bus.routeId);

      // --- 3. Call Prediction APIs ---
      const getPredictions = async () => {
        let currentStop, nextStop, currentStopIndex;
        let direction = 0; // Initialize as numeric: 0=forward, 1=reverse

        // Find the closest stop via GPS as a fallback and for distance checks
        let closestStopIndex = -1;
        let minDistance = Infinity;
        stops.forEach((stop, index) => {
            const distance = getDistanceKm(
              bus.location.latitude,
              bus.location.longitude,
              stop.lat,
              stop.lng
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestStopIndex = index;
            }
        });

        // First, try to determine current stop from the last trip record
        if (bus && bus.currentTrip) {
            try {
                const records = await getLastThreeRecordsFromService(bus.currentTrip);
                if (records && records.length > 0) {
                    const lastVisitedStopName = records[0].Origin;
                    const lastVisitedStopIndex = stops.findIndex(s => s.stopName === lastVisitedStopName);
                    
                    if (lastVisitedStopIndex !== -1) {
                        currentStopIndex = lastVisitedStopIndex;
                        console.log(`Determined current stop index from trip record: ${currentStopIndex}`);
                    }
                }
            } catch (err) {
                console.log("Could not fetch trip history, will use GPS fallback.", err.message);
            }
        }

        // Get direction from busTrip entity (not from trip records)
        if (busTrip) {
            direction = busTrip.direction === 1 ? 1 : 0;
            console.log(`Direction from busTrip: ${direction}`);
        }

        // If we couldn't determine stop from records, use GPS-based closest stop
        if (currentStopIndex === undefined) {
            if (closestStopIndex !== -1) {
                currentStopIndex = closestStopIndex;
                console.log(`Using GPS to determine current stop index: ${currentStopIndex}`);
            } else {
                console.log("Prediction skipped: Could not find any closest stop.");
                return; // Can't proceed without a stop
            }
        }

        // Determine current and next stop based on the definitive index and direction
        // Direction: 0=forward (moving to higher indices), 1=reverse (moving to lower indices)
        if (direction === 0) { // forward - moving toward higher indices
            currentStop = stops[currentStopIndex];
            nextStop = currentStopIndex < stops.length - 1 ? stops[currentStopIndex + 1] : null;
        } else { // reverse - moving toward lower indices
            currentStop = stops[currentStopIndex];
            nextStop = currentStopIndex > 0 ? stops[currentStopIndex - 1] : null;
        }

        if (!currentStop || !nextStop) {
          console.log("Prediction skipped: Could not determine current/next stop (likely at end of route).");
          return;
        }

        // --- Arrival Time Prediction ---
        try {
          const now = new Date();
          const hour = now.getHours();
          const minute = now.getMinutes();
          
          const arrivalTimeMinutes = await predictSegmentETA([currentStop, nextStop], hour, minute);
          setPredictedArrivalTime(arrivalTimeMinutes);
          console.log("Arrival time prediction received:", arrivalTimeMinutes, "minutes");

        } catch (err) {
          console.error("Failed to get arrival time prediction:", err.message);
        }

            // --- Total ETA to User's Origin ---
        if (userOrigin && currentStopIndex !== -1) {
            const destinationIndex = stops.findIndex(s => s.stopName === userOrigin);
            
            if (destinationIndex === -1) {
                console.log("Could not find user destination in stops list.");
                setTotalEtaToDestination(null);
            } else {
                let remainingStops = [];
                // Direction: 0=forward (higher indices), 1=reverse (lower indices)
                if (direction === 0) { // forward direction
                    if (destinationIndex >= currentStopIndex) {
                        remainingStops = stops.slice(currentStopIndex, destinationIndex + 1);
                    }
                } else { // reverse direction
                    if (destinationIndex <= currentStopIndex) {
                        remainingStops = stops.slice(destinationIndex, currentStopIndex + 1).reverse();
                    }
                }

                if (remainingStops.length > 1) {
                    try {
                        const now = new Date();
                        const hour = now.getHours();
                        const minute = now.getMinutes();
                        
                        const totalMinutes = await predictSegmentETA(remainingStops, hour, minute);
                        setTotalEtaToDestination(totalMinutes);
                        console.log(`Total ETA to destination: ${totalMinutes.toFixed(1)} minutes`);
                    } catch (err) {
                        console.error("Failed to get total ETA:", err.message);
                        setTotalEtaToDestination(null);
                    }
                } else {
                    // Bus has passed the destination or is at the destination
                    setTotalEtaToDestination(0);
                }
            }
        }

        // --- Passenger Flow Prediction ---
        if (bus && bus.currentTrip) {
          try {
            // Get the last 3 records for the current trip
            let records = await getLastThreeRecordsFromService(bus.currentTrip);
            let sequence = [];
            const paddingRecord = {
              "month": 0, "day": 0, "Distance_km": 0, "hour": 0, "minute": 0,
              "prev_load": 0, "holiday_type": "none", "day_type": "weekday",
              "trip_direction": "0", "Origin": "PAD", "Route": "PAD"
            };

            // Prepare initial sequence (pad if needed)
            if (records.length < 3) {
              for (let i = 0; i < 3 - records.length; i++) {
                sequence.push({ ...paddingRecord });
              }
              records.forEach(rec => {
                const recordDate = rec && rec.Stamp && typeof rec.Stamp.seconds === 'number'
                  ? new Date(rec.Stamp.seconds * 1000)
                  : new Date();
                sequence.push({
                  "month": recordDate.getMonth() + 1,
                  "day": recordDate.getDate(),
                  "Distance_km": rec.Distance_km || 0,
                  "hour": recordDate.getHours(),
                  "minute": recordDate.getMinutes(),
                  "prev_load": rec.passenger_load || 0,
                  "holiday_type": "none",
                  "day_type": (recordDate.getDay() === 0 || recordDate.getDay() === 6) ? 'weekend' : 'weekday',
                  "trip_direction": busTrip?.direction === 1 ? "1" : "0",
                  "Origin": rec.Origin,
                  "Route": currentRoute?.name || "Unknown Route"
                });
              });
            } else {
              // Use last 3 records, chronological order
              sequence = records.map(rec => {
                const recordDate = rec && rec.Stamp && typeof rec.Stamp.seconds === 'number'
                  ? new Date(rec.Stamp.seconds * 1000)
                  : new Date();
                return {
                  "month": recordDate.getMonth() + 1,
                  "day": recordDate.getDate(),
                  "Distance_km": rec.Distance_km || 0,
                  "hour": recordDate.getHours(),
                  "minute": recordDate.getMinutes(),
                  "prev_load": rec.passenger_load || 0,
                  "holiday_type": "none",
                  "day_type": (recordDate.getDay() === 0 || recordDate.getDay() === 6) ? 'weekend' : 'weekday',
                  "trip_direction": busTrip?.direction === 1 ? "1" : "0",
                  "Origin": rec.Origin,
                  "Route": currentRoute?.name || "Unknown Route"
                };
              }).reverse();
            }

            // Find stops between current and user origin
            let totalNetChange = 0;
            let currentPassengers = bus.occupancy;
            if (userOrigin && currentStopIndex !== undefined) {
              const destinationIndex = stops.findIndex(s => s.stopName === userOrigin);
              let remainingStops = [];
              
              // Direction: 0=forward (higher indices), 1=reverse (lower indices)
              if (direction === 0) { // forward direction
                if (destinationIndex >= currentStopIndex) {
                  remainingStops = stops.slice(currentStopIndex, destinationIndex + 1);
                }
              } else { // reverse direction
                if (destinationIndex <= currentStopIndex) {
                  remainingStops = stops.slice(destinationIndex, currentStopIndex + 1).reverse();
                }
              }

              // For each segment, roll prediction
              for (let i = 0; i < remainingStops.length - 1; i++) {
                // Prepare input for this segment
                // Use last 3 records in sequence
                const passengerFlowInput = { sequence: sequence.slice(-3) };
                const res = await apiClient.post(`${ML_BACKEND_URL}/predict_passenger_flow`, passengerFlowInput);
                // const res = await apiClient.post(`${ML_BACKEND_URL}/predict/passenger-flow`, passengerFlowInput);
                const netChange = res.data.net_change || 0;
                totalNetChange += netChange;
                console.log("Sending for arrival time prediction:", JSON.stringify(passengerFlowInput, null, 2));

                // Prepare next input: shift sequence, add new predicted record
                // Use the last record as template, but update prev_load and Origin/Route
                const lastRecord = { ...sequence[sequence.length - 1] };
                lastRecord.prev_load = (lastRecord.prev_load || 0) + netChange;
                lastRecord.Origin = remainingStops[i + 1].stopName;
                lastRecord.Route = currentRoute?.name || "Unknown Route";
                // Optionally update time fields if needed
                sequence.push(lastRecord);
              }
              setPredictedPassengers(currentPassengers + totalNetChange);
            } else {
              // Fallback: just predict next stop as before
              const passengerFlowInput = { sequence: sequence.slice(-3) };
              const res = await apiClient.post(`${ML_BACKEND_URL}/predict_passenger_flow`, passengerFlowInput);
              // const res = await apiClient.post(`${ML_BACKEND_URL}/predict/passenger-flow`, passengerFlowInput);

              const netChange = res.data.net_change || 0;
                        console.log("Sending for arrival time prediction:", JSON.stringify(passengerFlowInput, null, 2));

              setPredictedPassengers(currentPassengers + netChange);
            }
          } catch (err) {
            console.error("Failed to get passenger flow prediction:", err.response ? err.response.data : err.message);
          }
        } else {
          console.log(`No current trip associated with the bus for passenger flow prediction.`);
        }
      };

      getPredictions();
    }, 3000);

    // Cleanup function to clear the timeout if the component unmounts or dependencies change
    return () => clearTimeout(handler);

  }, [bus, busTrip, routeDetails]); // Rerun when bus, busTrip, or route updates

  if (!passengerLocation || !bus) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{errorMsg || 'Loading trip details...'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapViewComponent 
        buses={[bus]} 
        passengerLocation={passengerLocation}
        routePath={selectedRoutePath}
        initialRegion = {{
          latitude: bus.location.latitude,
          longitude: bus.location.longitude}}
        stops={routeStops}
        routes={allRoutes}
        passengerOriginStop={passengerOriginStop}
        passengerDestinationStop={passengerDestinationStop}
      />
      <View style={styles.tripInfo}>
        <Text style={styles.tripInfoText}>Tracking Bus: {bus.busId}</Text>
        <Text style={styles.tripInfoSubText}>{currentRoute?.name || 'Loading route...'}</Text>
        <Text style={styles.tripInfoSubText}>From: {userOrigin} To: {userDestination}</Text>
        <Text style={styles.tripInfoSubText}>Status: {bus.status}</Text>
        <Text style={styles.tripInfoSubText}>Current Load: {bus.occupancy}/{bus.capacity}</Text>
        <Text style={styles.tripInfoSubText}>
          Last passed stop: {lastPassedStop?.stopName || 'N/A'}
        </Text>
        <Text style={styles.tripInfoSubText}>
          Next stop: {nextStop?.stopName || 'N/A'}
        </Text>
                      
        
        {(predictedArrivalTime !== null || predictedPassengers !== null || totalEtaToDestination !== null) && (
          <View style={styles.predictionsContainer}>
             {totalEtaToDestination !== null && (
              <View style={styles.predictionItem}>
                <Text style={styles.predictionLabel}>Arrival at {userOrigin}</Text>
                <Text style={styles.predictionValue}>~{Math.floor(totalEtaToDestination)}m {Math.round((totalEtaToDestination % 1) * 60)}s</Text>
              </View>
            )}
            {predictedPassengers !== null && (
              <View style={styles.predictionItem}>
                <Text style={styles.predictionLabel}>Est. Crowd</Text>
                <Text style={styles.predictionValue}>{Math.round(predictedPassengers)} pax</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.chooseAnotherBusButton} onPress={handleChooseAnotherBus}>
          <Text style={styles.chooseAnotherBusButtonText}>Choose Another Bus</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endTripButton} onPress={handleEndTrip}>
          <Text style={styles.endTripButtonText}>End Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 10,
    color: 'gray',
  },
  tripInfo: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tripInfoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripInfoSubText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
    marginBottom: 5, 
  },
  predictionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    paddingVertical: 10,
    marginVertical: 5,
  },
  predictionItem: {
    alignItems: 'center',
    flex: 1,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#6e6e73',
    marginBottom: 2,
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  endTripButton: {
    marginTop: 15,
    backgroundColor: '#DC3545',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  endTripButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chooseAnotherBusButton: {
    marginTop: 10,
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  chooseAnotherBusButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CurrentTripScreen;