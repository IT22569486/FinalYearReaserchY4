import apiClient from '../api/axiosConfig';
import { ML_BACKEND_URL } from '../config';
import { getCurrentStopIndex, getRemainingStops } from '../utils/stopTrackingUtils';

// Helper function to get the last 3 records of a trip from Firestore
export const getLastThreeRecordsOfTrip = async (tripId) => {
  try {
    const response = await apiClient.get(`/api/bus-trip-records/trip/${tripId}/last-three`);
    return response.data;
  } catch (error) {
    console.error('Error getting last three records of trip:', error);
    return [];
  }
};

// Helper function to calculate distance between two coordinates
export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Predict ETA for segments between current position and destination
 * @param {Array} remainingStops - Array of stops between current and destination
 * @param {number} hour - Current hour
 * @param {number} minute - Current minute
 * @returns {Promise<number>} - Total ETA in minutes, or -1 if failed
 */
export const predictSegmentETA = async (remainingStops, hour, minute) => {
  if (remainingStops.length <= 1) {
    return remainingStops.length === 1 ? 0 : -1;
  }

  // Parallelize all segment predictions for speed
  const segmentPromises = [];
  for (let i = 0; i < remainingStops.length - 1; i++) {
    const segmentOrigin = remainingStops[i];
    const segmentDestination = remainingStops[i + 1];
    
    const promise = apiClient.post(`${ML_BACKEND_URL}/predict_arrival_time`, {
      origin: segmentOrigin.stopName,
      destination: segmentDestination.stopName,
      distance: getDistanceKm(segmentOrigin.lat, segmentOrigin.lng, segmentDestination.lat, segmentDestination.lng),
      hour: hour,
      minute: minute,
    }).then(res => res.data.predicted_arrival_time_seconds || 0)
      .catch(err => {
        console.log(`ETA prediction failed: ${segmentOrigin.stopName} -> ${segmentDestination.stopName}`);
        return -1;
      });
    
    segmentPromises.push(promise);
  }
  
  // Wait for all predictions in parallel
  const results = await Promise.all(segmentPromises);
  
  // Sum up the times
  let totalSeconds = 0;
  for (const seconds of results) {
    if (seconds === -1) {
      return -1; // Failed
    }
    totalSeconds += seconds;
  }

  return totalSeconds / 60; // Convert to minutes
};

/**
 * Prepare LSTM sequence from trip records
 * @param {Array} records - Trip records
 * @param {number} direction - Trip direction (0=forward, 1=reverse)
 * @param {string} routeName - Route name
 * @returns {Array} - Prepared sequence for LSTM
 */
const prepareSequenceFromRecords = (records, direction, routeName) => {
  // Normalize direction to 0 or 1
  const normalizedDirection = parseInt(direction) === 1 ? 1 : 0;
  
  const paddingRecord = {
    "month": 0, "day": 0, "Distance_km": 0, "hour": 0, "minute": 0,
    "prev_load": 0, "holiday_type": "none", "day_type": "weekday",
    "trip_direction": "0", "Origin": "PAD", "Route": "PAD"
  };

  let sequence = [];

  // Prepare sequence (pad if needed)
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
        "trip_direction": normalizedDirection === 1 ? "1" : "0",
        "Origin": rec.Origin,
        "Route": routeName
      });
    });
  } else {
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
        "trip_direction": normalizedDirection === 1 ? "1" : "0",
        "Origin": rec.Origin,
        "Route": routeName
      };
    }).reverse();
  }

  return sequence;
};

/**
 * Predict passenger flow for remaining stops
 * @param {string} tripId - Current trip ID
 * @param {Array} remainingStops - Stops between current and destination
 * @param {number} direction - Trip direction
 * @param {string} routeName - Route name
 * @param {number} currentOccupancy - Current bus occupancy
 * @returns {Promise<number>} - Predicted passenger count at destination
 */
export const predictPassengerFlow = async (tripId, remainingStops, direction, routeName, currentOccupancy) => {
  try {
    const records = await getLastThreeRecordsOfTrip(tripId);
    let sequence = prepareSequenceFromRecords(records, direction, routeName);

    // Predict passenger flow for each remaining segment
    let totalNetChange = 0;
    if (remainingStops.length > 1) {
      for (let i = 0; i < remainingStops.length - 1; i++) {
        const passengerFlowInput = { sequence: sequence.slice(-3) };
        try {
          const res = await apiClient.post(`${ML_BACKEND_URL}/predict_passenger_flow`, passengerFlowInput);
          const netChange = res.data.net_change || 0;
          totalNetChange += netChange;

          // Update sequence for next prediction
          const lastRecord = { ...sequence[sequence.length - 1] };
          lastRecord.prev_load = (lastRecord.prev_load || 0) + netChange;
          lastRecord.Origin = remainingStops[i + 1].stopName;
          sequence.push(lastRecord);
        } catch (err) {
          console.log(`Passenger flow prediction failed at segment ${i}`);
          break;
        }
      }
    }

    return Math.max(0, (currentOccupancy || 0) + totalNetChange);
  } catch (err) {
    console.log(` Passenger count prediction failed:`, err.message);
    return currentOccupancy || 0;
  }
};

/**
 * Calculate predictions for multiple buses
 * @param {Array} buses - Array of buses to predict for
 * @param {Array} stops - Route stops
 * @param {string} originStopName - Origin stop name
 * @param {Array} routes - All routes
 * @param {Array} busTrips - All bus trips (for direction lookup)
 * @returns {Promise<Object>} - Object with arrivalTimes and passengerCounts keyed by busId
 */
export const calculateBusPredictions = async (buses, stops, originStopName, routes, busTrips = []) => {
  const newArrivalTimes = {};
  const newPassengerCounts = {};

  if (!buses.length || !stops.length || !originStopName) {
    return { arrivalTimes: {}, passengerCounts: {} };
  }

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  for (const bus of buses) {
    try {
      if (!bus.location || !bus.currentTrip) {
        console.log(` Skipping bus ${bus.busId} - no location or currentTrip`);
        continue;
      }

      // Get current stop index and direction
      const { currentStopIndex, direction } = await getCurrentStopIndex(
        bus,
        stops,
        bus.currentTrip,
        busTrips
      );

      if (currentStopIndex === -1) {
        console.log(` No valid stop index for bus ${bus.busId}`);
        continue;
      }

      // Get remaining stops to origin
      const originIndex = stops.findIndex(s => s.stopName === originStopName);
      if (originIndex === -1) {
        console.log(` Origin stop not found: ${originStopName}`);
        continue;
      }

      console.log(` Bus ${bus.busId} position:`, {
        currentStopIndex,
        currentStop: stops[currentStopIndex]?.stopName,
        originIndex,
        originName: originStopName,
        direction: direction === 0 ? 'forward (↓)' : 'reverse (↑)'
      });

      const remainingStops = getRemainingStops(stops, currentStopIndex, originIndex, direction);
      
      if (remainingStops.length === 0) {
        console.log(` Bus ${bus.busId}: No remaining stops to origin - bus may have passed origin or direction mismatch`);
        // Still return current occupancy as fallback
        newPassengerCounts[bus.busId] = bus.occupancy;
        continue;
      }

      // Predict ETA
      const etaMinutes = await predictSegmentETA(remainingStops, hour, minute);
      if (etaMinutes >= 0) {
        newArrivalTimes[bus.busId] = etaMinutes;
        console.log(` Bus ${bus.busId} ETA: ${etaMinutes.toFixed(1)} min`);
      }

      // Predict passenger count
      const route = routes.find(r => r.id === bus.routeId);
      const predictedCount = await predictPassengerFlow(
        bus.currentTrip,
        remainingStops,
        direction,
        route?.name || "Unknown",
        bus.occupancy
      );
      newPassengerCounts[bus.busId] = predictedCount;
      console.log(` Bus ${bus.busId} predicted passengers: ${predictedCount}`);

    } catch (err) {
      console.error(` Error calculating predictions for bus ${bus.busId}:`, err);
    }
  }

  return { arrivalTimes: newArrivalTimes, passengerCounts: newPassengerCounts };
};
