/**
 * Bus Movement Simulation Script
 * Simulates a bus moving along a route and emits real-time location updates via Socket.IO
 * 
 * Usage:
 * node simulateBusMovement.js --busId BUS001 --routeId route123 --speed 50
 * 
 * Options:
 * --busId: Bus ID to simulate (required)
 * --routeId: Route ID (required)
 * --speed: Speed in km/h (default: 50)
 * --interval: Update interval in ms (default: 2000)
 * --direction: Direction of travel - 'forward' or 'reverse' (default: forward)
 * --verbose: Enable verbose logging (default: false)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const io = require('socket.io-client');
const axios = require('axios');
const { db } = require('../firebase');
const busService = require('../services/busService');
const busTripService = require('../services/busTripService');
const busTripRecordService = require('../services/busTripRecordService');

// const BACKEND_URL = 'http://165.245.190.214:3000';
const BACKEND_URL = 'http://192.168.1.2:3000';



// Parse command-line arguments
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  params[key] = args[i + 1];
}

const busId = params.busId;
const routeId = params.routeId;
const speed = parseInt(params.speed) || 50; // km/h
const updateInterval = parseInt(params.interval) || 2000; // ms
const direction = params.direction || 'forward'; // 'forward' or 'reverse'
const verbose = params.verbose === 'true';

if (!busId || !routeId) {
  console.error('ERROR: --busId and --routeId are required');
  console.error('Usage: node simulateBusMovement.js --busId BUS001 --routeId route123 --speed 50 --direction forward');
  process.exit(1);
}

if (direction !== 'forward' && direction !== 'reverse') {
  console.error('ERROR: --direction must be either "forward" or "reverse"');
  process.exit(1);
}

console.log('Bus Movement Simulator');
console.log('==========================');
console.log(`Bus ID: ${busId}`);
console.log(`Route ID: ${routeId}`);
console.log(`Speed: ${speed} km/h`);
console.log(`Update Interval: ${updateInterval} ms`);
console.log(`Direction: ${direction}`);
console.log('\n');

// ============================================
// Helper Functions
// ============================================

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getInterpolatedLocation = (lat1, lon1, lat2, lon2, distance) => {
  const totalDistance = getDistanceKm(lat1, lon1, lat2, lon2);
  if (totalDistance === 0) return { latitude: lat1, longitude: lon1 };

  const ratio = Math.min(distance / totalDistance, 1);
  return {
    latitude: lat1 + (lat2 - lat1) * ratio,
    longitude: lon1 + (lon2 - lon1) * ratio,
  };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// Main Simulation
// ============================================

let socket;
let routePath = [];
let currentPathIndex = 0;
let distanceInCurrentSegment = 0;
let isSimulating = false;
let busTripId = null; // Store the created trip ID
let busData = null; // Store bus data
let tripStartTime = null; // Store trip start time
let currentOccupancy = 0; // Track live occupancy during simulation

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getPeakMultiplier = () => {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) return 1.35;
  if (hour >= 22 || hour <= 5) return 0.55;
  return 1;
};

const simulatePassengerFlowAtStop = ({ stopIndex, totalStops, capacity, occupancy }) => {
  const peakMultiplier = getPeakMultiplier();
  const remainingCapacity = Math.max(0, capacity - occupancy);
  const isFirstStop = stopIndex === 1;
  const isLastStop = stopIndex === totalStops - 1;
  const inFirstThird = stopIndex <= Math.ceil((totalStops - 1) / 3);
  const inLastThird = stopIndex >= Math.floor((totalStops - 1) * 2 / 3);

  let alighting = 0;
  let boarding = 0;

  if (isFirstStop) {
    alighting = 0;
    boarding = Math.min(remainingCapacity, Math.max(0, Math.round(randomInt(4, 12) * peakMultiplier)));
  } else if (isLastStop) {
    alighting = occupancy;
    boarding = 0;
  } else {
    const maxAlight = Math.max(0, Math.min(occupancy, Math.round(occupancy * (inLastThird ? 0.55 : 0.35))));
    alighting = maxAlight > 0 ? randomInt(0, maxAlight) : 0;

    const afterAlightOccupancy = Math.max(0, occupancy - alighting);
    const roomAfterAlight = Math.max(0, capacity - afterAlightOccupancy);
    const baseBoardRange = inFirstThird ? [3, 10] : [1, 7];
    boarding = Math.min(
      roomAfterAlight,
      Math.max(0, Math.round(randomInt(baseBoardRange[0], baseBoardRange[1]) * peakMultiplier))
    );
  }

  const nextOccupancy = Math.max(0, Math.min(capacity, occupancy - alighting + boarding));
  return { boarding, alighting, nextOccupancy };
};

const initializeSimulation = async () => {
  try {
    console.log('Fetching route details...');
    
    // Fetch route from Firestore
    const routeDoc = await db.collection('routes').doc(routeId).get();
    if (!routeDoc.exists) {
      throw new Error(`Route ${routeId} not found in Firestore`);
    }

    const routeData = routeDoc.data();
    routePath = routeData.path || [];

    if (!routePath.length) {
      throw new Error(`Route ${routeId} has no path defined`);
    }

    // Reverse the route if direction is 'reverse'
    if (direction === 'reverse') {
      routePath = routePath.reverse();
      console.log('Route reversed for backward travel');
    }

    // Fetch bus data
    console.log('Fetching bus data...');
    busData = await busService.getBusByBusId(busId);
    if (!busData) {
      throw new Error(`Bus ${busId} not found`);
    }

    currentOccupancy = Number.isFinite(busData.occupancy) ? busData.occupancy : 0;

    // Create a new BusTrip
    console.log('Creating new bus trip...');
    tripStartTime = new Date();
    const tripData = {
      busId: busId,
      routeId: routeId,
      driverId: busData.driverId || 'simulator',
      startTime: tripStartTime,
      status: 'active',
      direction: direction === 'reverse' ? 1 : 0,
    };
    
    const createdTrip = await busTripService.createTrip(tripData);
    busTripId = createdTrip.tripId;
    console.log(`Bus Trip created with ID: ${busTripId}`);

    // Update Bus document with currentTrip
    await busService.updateBus(busId, {
      currentTrip: busTripId,  // Store the string tripId
      status: 'in_transit',
      occupancy: currentOccupancy,
    });

    console.log(`Route loaded with ${routePath.length} stops`);
    console.log(`\nRoute Stops:`);
    routePath.forEach((stop, index) => {
      console.log(`  ${index + 1}. ${stop.stopName} (${stop.lat}, ${stop.lng})`);
    });
    console.log('\n');

    // Initialize Socket.IO connection
    console.log('Connecting to WebSocket server...');
    socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Connected to server via Socket.IO\n');
      console.log('Starting bus movement simulation...\n');
      isSimulating = true;
      startBusMovement();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    socket.on('disconnect', () => {
      console.log('\n Disconnected from server');
      isSimulating = false;
    });

  } catch (error) {
    console.error('Initialization failed:', error.message);
    process.exit(1);
  }
};

const startBusMovement = async () => {
  let segmentIndex = 0;
  let previousStop = routePath[0];
  
  while (isSimulating && segmentIndex < routePath.length - 1) {
    const currentStop = routePath[segmentIndex];
    const nextStop = routePath[segmentIndex + 1];

    const segmentDistance = getDistanceKm(
      currentStop.lat,
      currentStop.lng,
      nextStop.lat,
      nextStop.lng
    );

    const speedPerUpdate = (speed * updateInterval) / (1000 * 3600); // km per update
    let traveledDistance = 0;

    if (verbose) {
      console.log(`\nSegment ${segmentIndex + 1}/${routePath.length - 1}`);
      console.log(`   ${currentStop.stopName} → ${nextStop.stopName}`);
      console.log(`   Distance: ${segmentDistance.toFixed(2)} km`);
    }

    while (traveledDistance < segmentDistance && isSimulating) {
      const location = getInterpolatedLocation(
        currentStop.lat,
        currentStop.lng,
        nextStop.lat,
        nextStop.lng,
        traveledDistance
      );

      const busUpdate = {
        busId: busId,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        routeId: routeId,
        route_id: routeId,
        currentTrip: busTripId,
        direction: direction === 'reverse' ? 1 : 0,
        status: 'in_transit',
        timestamp: new Date(),
        currentStop: currentStop.stopName,
        nextStop: nextStop.stopName,
        progress: {
          currentSegment: segmentIndex + 1,
          totalSegments: routePath.length - 1,
          traveledInSegment: traveledDistance.toFixed(3),
          segmentTotal: segmentDistance.toFixed(3),
          percentComplete: ((traveledDistance / segmentDistance) * 100).toFixed(1),
        },
      };

      if (verbose) {
        console.log(
          `   ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ` +
          `(${busUpdate.progress.percentComplete}% of segment)`
        );
      } else {
        process.stdout.write('.');
      }

      // Emit via Socket.IO
      socket.emit('busLocationUpdate', busUpdate);
    // // Update Bus document with currentTrip
    //   await busService.updateBus(busId, busUpdate);
      traveledDistance += speedPerUpdate;
      await delay(updateInterval);
    }

    // Bus reached the next stop - create a BusTripRecord
    segmentIndex++;
    try {
      const recordTimestamp = new Date();
      const currentLocation = routePath[segmentIndex] || nextStop;
      
      const stopIndex = segmentIndex;
      const capacity = Number.isFinite(busData.capacity) ? busData.capacity : 60;
      const passengerFlow = simulatePassengerFlowAtStop({
        stopIndex,
        totalStops: routePath.length,
        capacity,
        occupancy: currentOccupancy,
      });

      currentOccupancy = passengerFlow.nextOccupancy;

      const busTripRecord = {
        busID: busId,
        Trip_ID: busTripId,  // Use the string tripId directly (e.g., "0001", "0002")
        Trip_Start_Time: tripStartTime.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        Origin: currentStop.stopName,
        Destination: currentLocation.stopName,
        Distance_km: segmentDistance,
        Boarding: passengerFlow.boarding,
        Alighting: passengerFlow.alighting,
        Stamp: recordTimestamp.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        Route: `Route ${routeId}`, // You may want to fetch actual route name
        day_type: getDayType(recordTimestamp),
        holiday_type: 'none', // Can be updated based on actual holiday calendar
        routeId: routeId,
      };

      const createdRecord = await busTripRecordService.addBusTripRecord(busTripRecord);
      if (verbose) {
        console.log(
          `\n✓ Trip record created for stop: ${currentLocation.stopName} | ` +
          `Boarding: ${passengerFlow.boarding}, Alighting: ${passengerFlow.alighting}, Occupancy: ${currentOccupancy}/${capacity}`
        );
      }
    } catch (error) {
      console.error(`Error creating trip record:`, error.message);
    }

    // Update Bus currentStop
    try {
      await busService.updateBus(busId, {
        currentStop: routePath[segmentIndex]?.stopName || 'End of Route',
        occupancy: currentOccupancy,
      });
    } catch (error) {
      console.error(`Error updating bus current stop:`, error.message);
    }
  }

  if (isSimulating) {
    console.log('\n\nBus reached the end of route');
    console.log('Stopping simulation...\n');
    isSimulating = false;

    // Update trip status to completed
    try {
      await busTripService.updateTrip(busTripId, {
        status: 'completed',
        endTime: new Date(),
      });
      console.log('Bus trip marked as completed');
    } catch (error) {
      console.error('Error updating trip status:', error.message);
    }

    // Update bus status
    try {
      await busService.updateBus(busId, {
        status: 'Idle',
        currentTrip: null,
      });
    } catch (error) {
      console.error('Error updating bus status:', error.message);
    }
  }

  socket.disconnect();
  process.exit(0);
};

// Helper function to determine day type
const getDayType = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return 'weekend';
  }
  return 'weekday';
};

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', () => {
  console.log('\n\n Stopping simulation (SIGINT)...');
  isSimulating = false;
  if (socket) {
    socket.disconnect();
  }
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n\n Stopping simulation (SIGTERM)...');
  isSimulating = false;
  if (socket) {
    socket.disconnect();
  }
  setTimeout(() => process.exit(0), 1000);
});

// ============================================
// Start
// ============================================

initializeSimulation();
