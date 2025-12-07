import React, { useEffect, useState, useMemo } from 'react'; // Import useMemo
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapViewComponent from '../components/MapViewComponent';
import { BACKEND_URL, ML_BACKEND_URL } from '../config'; // Import both URLs

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


const CurrentTripScreen = ({ route }) => {
  // The bus to track is passed via navigation parameters
  const { busId } = route.params || {};
  
  const [bus, setBus] = useState(null);
  const [busroute, setRoute] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [predictedPassengers, setPredictedPassengers] = useState(null); // State for passenger prediction
  const [predictedArrivalTime, setPredictedArrivalTime] = useState(null); // State for arrival time prediction
  const navigation = useNavigation(); // Get navigation object

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

    const fetchBus = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/bus/${busId}`);
        setBus(res.data);
      } catch (err) {
        setErrorMsg('Could not find the specified bus.');
        console.error(err);
      }
    };

    fetchBus();

    const handleUpdate = (updatedBus) => {
      if (updatedBus.busId === busId) {
        setBus(updatedBus);
      }
    };
    
    socket.on('busLocationUpdate', handleUpdate);

    return () => socket.off('busLocationUpdate', handleUpdate);
  }, [busId, navigation]);

  // effect to fetch route data *after* bus data is available
  useEffect(() => {
    if (bus && bus.routeId) {
      const fetchRoute = async () => {
        try {
          const res = await axios.get(`${BACKEND_URL}/api/routes/${bus.routeId}`);
          setRoute(res.data);
        } catch (err) {
          setErrorMsg('Could not find the specified route.');
          console.error(err);
        }
      };
      fetchRoute();
    }
  }, [bus]); // This effect runs whenever the 'bus' state changes

  // useMemo must be at the top level of the component
  const selectedRoutePath = useMemo(() => {
    if (!busroute || !busroute.path) {
      return [];
    }
    return busroute.path.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng,
    }));
  }, [busroute]);

  // Extract the stops to display as markers
  const routeStops = useMemo(() => {
    if (!busroute || !busroute.path) {
      return [];
    }
    return busroute.path; // The 'path' array already contains the stops
  }, [busroute]);

  const handleEndTrip = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Tell the backend to set the user's current trip to null
        await axios.post(`${BACKEND_URL}/api/user/end-trip`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Failed to end trip on the server:', error);
    } finally {
      // Reset the navigation stack to the MainTabs, starting on the Routes screen.
      // This prevents the user from navigating back to the ended trip.
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
      });
    }
  };

  // Effect to call prediction model when bus location or route changes
  useEffect(() => {
    if (!bus || !busroute || !bus.location) {
      return;
    }

    // Debounce the prediction logic to avoid excessive API calls
    const handler = setTimeout(() => {
      // --- 1. Find Current and Next Stop ---
      const stops = busroute.path; // Assuming busroute.path is the array of stops
      // if (!stops || stops.length < 2) {
      //   console.log("Prediction skipped: Not enough stops in route path.");
      //   return;
      // }

      // Find the index of the stop the bus is closest to
      let closestStopIndex = -1;
      let minDistance = Infinity;

      stops.forEach((stop, index) => {
        const distance = getDistance(
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
      
      // if (closestStopIndex === -1) {
      //   console.log("Prediction skipped: Could not find a closest stop.");
      //   return;
      // }

      // Determine current and next stop based on direction
      let currentStop, nextStop;
      // Assuming 0 is forward, 1 is reverse
      if (bus.direction === 1) { 
          currentStop = stops[closestStopIndex];
          nextStop = closestStopIndex > 0 ? stops[closestStopIndex - 1] : null;
      } else { 
          currentStop = stops[closestStopIndex];
          nextStop = closestStopIndex < stops.length - 1 ? stops[closestStopIndex + 1] : null;
      }

      // if (!currentStop || !nextStop) {
      //   console.log("Prediction skipped: Could not determine current/next stop (likely at end of route).");
      //   return;
      // }

      // --- 2. Prepare Data for Prediction ---
      const now = new Date();
      const dayType = (now.getDay() === 0 || now.getDay() === 6) ? 'Weekend' : 'Weekday';

      const predictionInput = {
//         // Static or easily derived data
//         Date: now.toISOString().split('T')[0], // "YYYY-MM-DD"
//         Time: now.toTimeString().substring(0, 5), // "HH:MM"
//         Day_Type: dayType,
//         Direction: bus.direction,
//         Trip_No: busroute.tripNo || `Trip_${bus.routeId}`, // Use a fallback if not available
//         Holiday_Type: "None", // Placeholder
// // 1/1/2023,Weekend,,Kad-Kol_1,5:00,1,Kaduwela,Kothalawala,3.2,4,0,4,0,0,0,0,0
//         // Dynamic data based on bus and route
//         Stop: currentStop.stopName,
//         Next_Stop: nextStop.stopName,
//         Distance_to_Next_km: getDistance(currentStop.lat, currentStop.lng, nextStop.lat, nextStop.lng),
        
//         // Placeholders - ensure your model can handle these values
//         Trip_Duration_So_Far_min: bus.tripDuration || 0,
//         Cumulative_Distance_km: bus.cumulativeDistance || 0,
//         Current_Passengers: bus.passengers || 0,

// Static or easily derived data
        Date:  '2023-1-1', // "YYYY-MM-DD"
        Time:  '05:00', // "HH:MM"
        Day_Type: 'Weekend',
        Direction: 0,
        Trip_No: 'TripKol_1', // Use a fallback if not available
        Holiday_Type: "", // Placeholder
// 1/1/2023,Weekend,,Kad-Kol_1,5:00,1,Kaduwela,Kothalawala,3.2,4,0,4,0,0,0,0,0
        // Dynamic data based on bus and route
        Stop: 'Kaduwela',
        Next_Stop: 'Kothalawala',
        Distance_to_Next_km: 3.2,
        
        // Placeholders - ensure your model can handle these values
        Trip_Duration_So_Far_min: 0,
        Cumulative_Distance_km:  0,
        Current_Passengers: 4,
      };

      // --- 3. Call Prediction API ---
      const getPredictions = async () => {
        try {
          console.log("Sending for prediction:", JSON.stringify(predictionInput, null, 2));
          const res = await axios.post(`${ML_BACKEND_URL}/predict`, predictionInput);
          
          console.log("Prediction received:", res.data);
          setPredictedPassengers(res.data.predicted_passengers);
          setPredictedArrivalTime(res.data.predicted_arrival_time_min);

        } catch (err) {
          console.error("Failed to get predictions:", err.response ? err.response.data : err.message);
        }
      };

      getPredictions();
    }, 3000); // Debounce for 3 seconds

    // Cleanup function to clear the timeout if the component unmounts or dependencies change
    return () => clearTimeout(handler);

  }, [bus, busroute]); // Rerun when bus or route data updates

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
        stops={routeStops} // Pass the stops to the map component
      />
      <View style={styles.tripInfo}>
        <Text style={styles.tripInfoText}>Tracking Bus: {bus.busId}</Text>
        <Text style={styles.tripInfoSubText}>Status: {bus.status}</Text>
        
        {/* Display Predictions in a structured container */}
        {(predictedArrivalTime !== null || predictedPassengers !== null) && (
          <View style={styles.predictionsContainer}>
            {predictedArrivalTime !== null && (
              <View style={styles.predictionItem}>
                <Text style={styles.predictionLabel}>Next Stop ETA</Text>
                <Text style={styles.predictionValue}>~{predictedArrivalTime.toFixed(2)} min</Text>
              </View>
            )}
            {predictedPassengers !== null && (
              <View style={styles.predictionItem}>
                <Text style={styles.predictionLabel}>Est. Crowd</Text>
                <Text style={styles.predictionValue}>{predictedPassengers} pax</Text>
              </View>
            )}
          </View>
        )}

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
    marginBottom: 10, 
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