import React, { useEffect, useState, useMemo } from 'react'; 
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import apiClient from '../api/axiosConfig';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapViewComponent from '../components/MapViewComponent';
import BusSafetyCard from '../components/BusSafetyCard';
import { BACKEND_URL, ML_BACKEND_URL } from '../config';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';
import axios from 'axios';

const socket = io(BACKEND_URL);

// Helper function to calculate distance between two coordinates (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Helper function to get the last 3 records of a trip from Firestore
const getLastThreeRecordsOfTrip = async (tripId) => {
    try {
        const response = await apiClient.get(`/api/bus-trip-records/trip/${tripId}/last-three`);
        return response.data;
    } catch (error) {
        console.error('Error getting last three records of trip:', error);
        throw new Error('Error getting last three records of trip: ' + error.message);
    }
};

const CurrentTripScreen = ({ route }) => {
  const { busId, origin: userOrigin, destination: userDestination, tripId: passengeTripId } = route.params || {};
  
  const [bus, setBus] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeDetails, setRouteDetails] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [predictedPassengers, setPredictedPassengers] = useState(null); 
  const [predictedArrivalTime, setPredictedArrivalTime] = useState(null); 
  const [totalEtaToDestination, setTotalEtaToDestination] = useState(null);
  const navigation = useNavigation();
  const { refreshSession } = useSession(); 

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
    })();

    const fetchInitialData = async () => {
      try {
        await updateLastActivity();
        await refreshSession();

        // Save this bus as the last tracked bus (for HomeScreen safety card)
        await AsyncStorage.setItem('lastTrackedBusId', busId);

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
        setBus(updatedBus);
        // Add to history for sequence-based prediction
        // setTripHistory(prevHistory => [...prevHistory, updatedBus]);
      }
    };
    
    socket.on('busLocationUpdate', handleUpdate);

    return () => socket.off('busLocationUpdate', handleUpdate);
  }, [busId, navigation]);

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

  const handleEndTrip = async () => {
    try {
      if (!passengeTripId) {
        console.error('No trip ID available to end trip');
        Alert.alert('Error', 'Trip ID not found. Cannot end trip.');
        return;
      }
      console.log('Failed to end trip on the server:', passengeTripId);
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

        // Find the closest stop via GPS as a fallback and for distance checks
        let closestStopIndex = -1;
        let minDistance = Infinity;
        const busLat = bus.location?.latitude ?? bus.location?.lat ?? bus.latitude ?? 0;
        const busLng = bus.location?.longitude ?? bus.location?.lng ?? bus.longitude ?? 0;
        stops.forEach((stop, index) => {
            const distance = getDistance(
              busLat,
              busLng,
              stop.lat,
              stop.lng
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestStopIndex = index;
            }
        });

        let direction;
        // First, try to determine current stop from the last trip record
        if (bus && bus.currentTrip) {
            try {
                const records = await getLastThreeRecordsOfTrip(bus.currentTrip);
                if (records && records.length > 0) {
                    const lastVisitedStopName = records[0].Origin;
                    const lastVisitedStopIndex = stops.findIndex(s => s.stopName === lastVisitedStopName);
                    direction = records[0].trip_direction;

                    if (lastVisitedStopIndex !== -1) {
                        currentStopIndex = lastVisitedStopIndex;
                        console.log(`Determined current stop index from trip record: ${currentStopIndex}`);
                    }
                }
            } catch (err) {
                console.log("Could not fetch trip history, will use GPS fallback.", err.message);
            }
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
        if (direction === 0) { // forward
            currentStop = stops[currentStopIndex];
            nextStop = currentStopIndex > 0 ? stops[currentStopIndex - 1] : null;
        } else { // reverse
            currentStop = stops[currentStopIndex];
            nextStop = currentStopIndex < stops.length - 1 ? stops[currentStopIndex + 1] : null;
        }

        if (!currentStop || !nextStop) {
          console.log("Prediction skipped: Could not determine current/next stop (likely at end of route).");
          return;
        }

        // --- Arrival Time Prediction ---
        try {
          const arrivalTimeInput = {
            origin: currentStop.stopName,
            destination: nextStop.stopName,
            distance: getDistance(currentStop.lat, currentStop.lng, nextStop.lat, nextStop.lng),
            hour: hour,
            minute: minute,
          };
          console.log("Sending for arrival time prediction:", JSON.stringify(arrivalTimeInput, null, 2));
          const res = await apiClient.post(`${ML_BACKEND_URL}/predict_arrival_time`, arrivalTimeInput);
          // const res = await apiClient.post(`${ML_BACKEND_URL}/predict/arrival-time`, arrivalTimeInput);          
          console.log("Arrival time prediction received:", res.data);
          if (res.data.predicted_arrival_time_seconds) {
            setPredictedArrivalTime(res.data.predicted_arrival_time_seconds / 60); // Convert to minutes
          }

        } catch (err) {
          console.error("Failed to get arrival time prediction:", err.response ? err.response.data : err.message);
        }

            // --- Total ETA to User's Destination ---
        if (userOrigin && currentStopIndex !== -1) {
            const destinationIndex = stops.findIndex(s => s.stopName === userOrigin);
            
            if (destinationIndex === -1) {
                console.log("Could not find user destination in stops list.");
                setTotalEtaToDestination(null);
            } else {
                let remainingStops = [];
                // Handle based on direction
                if (direction === 0) { // forward direction
                    if (destinationIndex < currentStopIndex) {
                        remainingStops = stops.slice(destinationIndex, currentStopIndex + 1).reverse();
                    }
                } else { // reverse direction
                    if (destinationIndex > currentStopIndex) {
                        remainingStops = stops.slice(currentStopIndex, destinationIndex + 1);
                    }
                }

                if (remainingStops.length > 1) {
                    let totalSeconds = 0;
                    // Loop through remaining segments to predict and sum ETA
                    for (let i = 0; i < remainingStops.length - 1; i++) {
                        const segmentOrigin = remainingStops[i];
                        const segmentDestination = remainingStops[i + 1];
                        try {
                            const arrivalTimeInput = {
                                origin: segmentOrigin.stopName,
                                destination: segmentDestination.stopName,
                                distance: getDistance(segmentOrigin.lat, segmentOrigin.lng, segmentDestination.lat, segmentDestination.lng),
                                hour: hour,
                                minute: minute,
                            };
                            console.log("Sending for arrival time prediction:", JSON.stringify(arrivalTimeInput, null, 2));

                            const res = await apiClient.post(`${ML_BACKEND_URL}/predict_arrival_time`, arrivalTimeInput);
                            // const res = await apiClient.post(`${ML_BACKEND_URL}/predict/arrival-time`, arrivalTimeInput);

                            if (res.data.predicted_arrival_time_seconds) {
                                totalSeconds += res.data.predicted_arrival_time_seconds;
                            }
                        } catch (err) {
                            console.error(`Failed to get ETA for segment ${segmentOrigin.stopName} -> ${segmentDestination.stopName}:`, err.message);
                            totalSeconds = -1;
                            break;
                        }
                    }

                    if (totalSeconds !== -1) {
                        setTotalEtaToDestination(totalSeconds / 60); // Convert to minutes
                    } else {
                        setTotalEtaToDestination(null); // Clear if calculation failed
                    }
                } else {
                    // Bus has passed the destination or is at the destination
                    setTotalEtaToDestination(0);
                    // Check if the bus is very close to the destination stop
                    const destinationStop = stops[destinationIndex];
                    if (destinationStop) {
                        const _busLat = bus.location?.latitude ?? bus.location?.lat ?? bus.latitude ?? 0;
                        const _busLng = bus.location?.longitude ?? bus.location?.lng ?? bus.longitude ?? 0;
                        const distanceToDestination = getDistance(_busLat, _busLng, destinationStop.lat, destinationStop.lng);
                        if (distanceToDestination < 0.1) { // If bus is within 100m of destination
                            Alert.alert("You've Arrived!", `The bus has reached your destination: ${userOrigin}.`, [
                                { text: "OK", onPress: () => handleEndTrip() }
                            ]);
                        }
                    }
                }
            }
        }

        // --- Passenger Flow Prediction ---
        if (bus && bus.currentTrip) {
          try {
            // Get the last 3 records for the current trip
            let records = await getLastThreeRecordsOfTrip(bus.currentTrip);
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
                  "trip_direction": bus.direction === 1 ? "1" : "0",
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
                  "trip_direction": bus.direction === 1 ? "1" : "0",
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
              if (direction === 0) {
                if (destinationIndex < currentStopIndex) {
                  remainingStops = stops.slice(destinationIndex, currentStopIndex + 1).reverse();
                }
              } else {
                if (destinationIndex > currentStopIndex) {
                  remainingStops = stops.slice(currentStopIndex, destinationIndex + 1);
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

  }, [bus, routeDetails]); // Rerun when bus or route updates

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
        initialRegion={(bus.location || bus.latitude) ? {
          latitude: bus.location?.latitude ?? bus.location?.lat ?? bus.latitude,
          longitude: bus.location?.longitude ?? bus.location?.lng ?? bus.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : undefined}
        stops={routeStops}
        routes={allRoutes}
      />
      <ScrollView 
        style={styles.tripInfoContainer}
        contentContainerStyle={styles.tripInfoContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Safety Score Card */}
        <BusSafetyCard 
          busId={bus.busId} 
          route={currentRoute?.name || 'Loading route...'} 
        />

        {/* Existing Trip Info */}
        <View style={styles.tripInfo}>
          <Text style={styles.tripInfoText}>Tracking Bus: {bus.busId}</Text>
          <Text style={styles.tripInfoSubText}>{currentRoute?.name || 'Loading route...'}</Text>
          <Text style={styles.tripInfoSubText}>From: {userOrigin} To: {userDestination}</Text>
          <Text style={styles.tripInfoSubText}>Status: {bus.status}</Text>
          <Text style={styles.tripInfoSubText}>Current Load: {bus.occupancy}/{bus.capacity}</Text>
                        
          
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

          <TouchableOpacity style={styles.endTripButton} onPress={handleEndTrip}>
            <Text style={styles.endTripButtonText}>End Trip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  tripInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
  },
  tripInfoContent: {
    paddingBottom: 20,
  },
  tripInfo: {
    marginHorizontal: 20,
    marginBottom: 10,
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
});

export default CurrentTripScreen;