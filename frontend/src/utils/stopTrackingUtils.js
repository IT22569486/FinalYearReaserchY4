import { getLastThreeRecordsOfTrip, getDistanceKm } from '../services/predictionService';

/**
 * Find the closest stop index to a given location using GPS
 * @param {Array} stops - Array of stops with lat/lng
 * @param {Object} location - Location object with lat/lng
 * @returns {number} - Index of closest stop, or -1 if none found
 */
export const findClosestStopIndex = (stops, location) => {
  if (!stops || !stops.length || !location) return -1;

  let closestStopIndex = -1;
  let minDistance = Infinity;
  
  stops.forEach((stop, index) => {
    const distance = getDistanceKm(location.lat, location.lng, stop.lat, stop.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestStopIndex = index;
    }
  });

  return closestStopIndex;
};

/**
 * Get current stop index and direction for a bus
 * Tries trip records first for stop, gets direction from busTrips
 * @param {Object} bus - Bus object with location and currentTrip
 * @param {Array} stops - Array of route stops
 * @param {string} tripId - Current trip ID
 * @param {Array} busTrips - Array of all bus trips (to find direction)
 * @returns {Promise<Object>} - Object with currentStopIndex and direction
 */
export const getCurrentStopIndex = async (bus, stops, tripId, busTrips = []) => {
  let currentStopIndex;
  let direction = 0; // Default to forward direction

  // Try to determine current stop from trip records (more accurate)
  try {
    const records = await getLastThreeRecordsOfTrip(tripId);
    console.log(`JASMLK--------------------------------A1 Fetched trip records for bus ${bus.busId}:`, records);

    if (records && records.length > 0) {
      const lastVisitedStopName = records[0].Origin;
      const lastVisitedStopIndex = stops.findIndex(s => s.stopName === lastVisitedStopName);
      if (lastVisitedStopIndex !== -1) {
        currentStopIndex = lastVisitedStopIndex;
      }
    }
  } catch (err) {
    console.log(`Could not fetch trip records for bus ${bus.busId}, using GPS`);
  }

  // Get direction from busTrip object
  try {
    const busTrip = busTrips.find(trip => trip.tripId === tripId);
    if (busTrip && busTrip.direction !== undefined) {
      direction = parseInt(busTrip.direction) === 1 ? 1 : 0;
    }
  } catch (err) {
    console.log(`Could not find direction from busTrip for tripId ${tripId}`);
  }

  // Fallback to GPS if trip records didn't work
  if (currentStopIndex === undefined) {
    currentStopIndex = findClosestStopIndex(stops, bus.location);
  }

  return { currentStopIndex, direction };
};

/**
 * Calculate remaining stops between current position and destination
 * Handles both cases: before reaching destination and after passing it
 * @param {Array} stops - All route stops
 * @param {number} currentStopIndex - Current stop index
 * @param {number} destinationIndex - Destination stop index
 * @param {number} direction - Direction (0 or 1)
 * @returns {Array} - Array of stops to traverse
 */
export const getRemainingStops = (stops, currentStopIndex, destinationIndex, direction) => {
  let remainingStops = [];
  
  console.log(` getRemainingStops: current=${currentStopIndex}, dest=${destinationIndex}, dir=${direction}`);
  
  // Direction 0 = moving toward HIGHER indices (0->1->2->...)
  // Direction 1 = moving toward LOWER indices (...->2->1->0)
  
  if (direction === 0) { 
    // Going toward higher indices
    if (destinationIndex >= currentStopIndex) {
      remainingStops = stops.slice(currentStopIndex, destinationIndex + 1);
    }
  } else if (direction === 1) { 
    // Going toward lower indices
    if (destinationIndex <= currentStopIndex) {
      remainingStops = stops.slice(destinationIndex, currentStopIndex + 1).reverse();
    }
  }

  console.log(` Remaining stops (${remainingStops.length}):`, remainingStops.map(s => s.stopName).join(' -> '));
  return remainingStops;
};

/**
 * Track last passed stop and next stop for a bus in real-time
 * @param {Object} bus - Bus object with location
 * @param {Array} stops - Route stops array
 * @param {number} direction - Direction (0=forward, 1=reverse)
 * @param {number} lastPassedIndexRef - Ref to last passed stop index
 * @param {number} threshold - Distance threshold in km (default 0.2)
 * @returns {Object} - Object with lastPassedStop and nextStop
 */
export const trackBusStopProgress = (bus, stops, direction, lastPassedIndexRef, threshold = 0.2) => {
  if (!bus?.location || !stops.length) {
    return { lastPassedStop: null, nextStop: null };
  }

  const directionStr = direction === 1 ? 'reverse' : 'forward';
  
  // Find closest stop within threshold
  const closestIndex = findClosestStopWithinThreshold(
    stops,
    {
      latitude: bus.location.latitude,
      longitude: bus.location.longitude,
    },
    threshold
  );

  if (closestIndex !== -1) {
    const lastIndex = lastPassedIndexRef;
    
    // Check if bus has advanced (moved forward in its direction)
    const isForwardAdvance = directionStr === 'forward'
      ? closestIndex > lastIndex
      : closestIndex < lastIndex;

    if (lastIndex === -1 || isForwardAdvance) {
      // Update last passed stop
      const lastPassedStop = stops[closestIndex];
      
      // Calculate next stop
      const nextIndex = getNextStopIndex(closestIndex, directionStr, stops.length);
      const nextStop = nextIndex !== -1 ? stops[nextIndex] : null;

      return { lastPassedStop, nextStop, newIndex: closestIndex };
    }
  }

  // Return current state if no update
  return { 
    lastPassedStop: lastPassedIndexRef !== -1 ? stops[lastPassedIndexRef] : null,
    nextStop: null,
    newIndex: lastPassedIndexRef
  };
};

/**
 * Find closest stop within a distance threshold
 * @param {Array} stops - Route stops
 * @param {Object} location - Location with latitude/longitude
 * @param {number} threshold - Distance threshold in km
 * @returns {number} - Index of closest stop within threshold, or -1
 */
const findClosestStopWithinThreshold = (stops, location, threshold) => {
  let closestIndex = -1;
  let minDistance = Infinity;

  stops.forEach((stop, index) => {
    const distance = getDistanceKm(
      location.latitude,
      location.longitude,
      stop.lat,
      stop.lng
    );
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

/**
 * Get the next stop index based on direction
 * @param {number} currentIndex - Current stop index
 * @param {string} direction - Direction string ('forward' or 'reverse')
 * @param {number} totalStops - Total number of stops
 * @returns {number} - Next stop index, or -1 if at end
 */
const getNextStopIndex = (currentIndex, direction, totalStops) => {
  if (direction === 'forward') {
    return currentIndex + 1 < totalStops ? currentIndex + 1 : -1;
  } else {
    return currentIndex - 1 >= 0 ? currentIndex - 1 : -1;
  }
};
