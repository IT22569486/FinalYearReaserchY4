const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const io = require('socket.io-client');
const { db } = require('../firebase');
const busService = require('../services/busService');
const busTripService = require('../services/busTripService');
const busTripRecordService = require('../services/busTripRecordService');

const parseCliArgs = (rawArgs) => {
  const named = {};
  const positional = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i];

    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const withoutDashes = token.slice(2);
    if (!withoutDashes) continue;

    // Supports --key=value format
    const eqIndex = withoutDashes.indexOf('=');
    if (eqIndex > -1) {
      const key = withoutDashes.slice(0, eqIndex);
      const value = withoutDashes.slice(eqIndex + 1);
      named[key] = value;
      continue;
    }

    // Supports --key value format
    const nextToken = rawArgs[i + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      named[withoutDashes] = nextToken;
      i += 1;
    } else {
      named[withoutDashes] = 'true';
    }
  }

  return { named, positional };
};

const getFirstDefined = (...values) => values.find((v) => v !== undefined && v !== null && String(v).length > 0);

const { named, positional } = parseCliArgs(process.argv.slice(2));

const routeIdRaw = getFirstDefined(named.routeId, named['route-id'], positional[0], '');
const maxBusesRaw = getFirstDefined(named.maxBuses, named['max-buses'], positional[1]);
const forwardCountRaw = getFirstDefined(named.forwardCount, named['forward-count'], positional[2]);
const reverseCountRaw = getFirstDefined(named.reverseCount, named['reverse-count'], positional[3]);
const speedRaw = getFirstDefined(named.speed, positional[4]);
const intervalRaw = getFirstDefined(named.interval, positional[5]);
const startGapRaw = getFirstDefined(named.startGap, named['start-gap'], positional[6]);
const backendUrlRaw = getFirstDefined(named.backendUrl, named['backend-url']);
const verboseRaw = getFirstDefined(named.verbose, 'false');

const speedKmh = Number.parseInt(speedRaw, 10) || 42;
const updateIntervalMs = Number.parseInt(intervalRaw, 10) || 2000;
const routeIdFilter = routeIdRaw || '';
const maxBuses = Number.parseInt(maxBusesRaw, 10) || 0;
const forwardCountParam = Number.parseInt(forwardCountRaw, 10);
const reverseCountParam = Number.parseInt(reverseCountRaw, 10);
const backendUrl = backendUrlRaw || process.env.SIMULATOR_BACKEND_URL || 'http://localhost:3000';
const verbose = String(verboseRaw).toLowerCase() === 'true';
const startGapMs = Number.parseInt(startGapRaw, 10) || 1500;

let shouldStop = false;
let socket;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toNum = (value) => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const interpolate = (lat1, lon1, lat2, lon2, traveled) => {
  const total = getDistanceKm(lat1, lon1, lat2, lon2);
  if (total === 0) {
    return { lat: lat1, lng: lon1 };
  }
  const ratio = Math.min(traveled / total, 1);
  return {
    lat: lat1 + (lat2 - lat1) * ratio,
    lng: lon1 + (lon2 - lon1) * ratio,
  };
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isValidNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;

const getDayType = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
};

const getPeakMultiplier = () => {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) return 1.3;
  if (hour >= 22 || hour <= 5) return 0.6;
  return 1;
};

const passengerFlowForStop = ({ stopIndex, totalStops, capacity, occupancy }) => {
  const peak = getPeakMultiplier();
  const isFirst = stopIndex === 1;
  const isLast = stopIndex === totalStops - 1;

  let boarding = 0;
  let alighting = 0;

  if (isFirst) {
    boarding = Math.min(capacity, Math.round(randomInt(3, 10) * peak));
  } else if (isLast) {
    alighting = occupancy;
  } else {
    const maxAlight = Math.max(0, Math.min(occupancy, Math.round(occupancy * 0.45)));
    alighting = maxAlight > 0 ? randomInt(0, maxAlight) : 0;
    const remaining = Math.max(0, capacity - (occupancy - alighting));
    boarding = Math.min(remaining, Math.max(0, Math.round(randomInt(1, 8) * peak)));
  }

  const nextOccupancy = Math.max(0, Math.min(capacity, occupancy - alighting + boarding));
  return { boarding, alighting, nextOccupancy };
};

const normalizePath = (pathList) => {
  const normalized = [];
  for (const stop of pathList || []) {
    const lat = toNum(stop.lat ?? stop.latitude);
    const lng = toNum(stop.lng ?? stop.longitude);
    if (lat === null || lng === null) continue;
    normalized.push({
      stopName: stop.stopName || stop.name || `Stop-${normalized.length + 1}`,
      lat,
      lng,
    });
  }
  return normalized;
};

const resolveBusRouteId = (bus) => bus.routeId || bus.route_id || bus.Route || '';

const buildDirectionPlan = (totalBuses) => {
  const hasForward = isValidNonNegativeInt(forwardCountParam);
  const hasReverse = isValidNonNegativeInt(reverseCountParam);

  // Default behavior: alternate directions to keep both sides active.
  if (!hasForward && !hasReverse) {
    return Array.from({ length: totalBuses }, (_, i) => (i % 2 === 0 ? 'forward' : 'reverse'));
  }

  let forwardCount = hasForward ? forwardCountParam : null;
  let reverseCount = hasReverse ? reverseCountParam : null;

  if (forwardCount === null) {
    reverseCount = Math.min(reverseCount, totalBuses);
    forwardCount = Math.max(0, totalBuses - reverseCount);
  }

  if (reverseCount === null) {
    forwardCount = Math.min(forwardCount, totalBuses);
    reverseCount = Math.max(0, totalBuses - forwardCount);
  }

  if (forwardCount + reverseCount > totalBuses) {
    const requestedTotal = forwardCount + reverseCount;
    if (requestedTotal <= 0) {
      forwardCount = totalBuses;
      reverseCount = 0;
    } else if (forwardCount > 0 && reverseCount > 0 && totalBuses >= 2) {
      // Preserve approximate ratio while ensuring both directions stay active.
      forwardCount = Math.max(1, Math.floor((totalBuses * forwardCount) / requestedTotal));
      reverseCount = Math.max(1, totalBuses - forwardCount);
      if (forwardCount + reverseCount > totalBuses) {
        forwardCount = Math.max(1, totalBuses - reverseCount);
      }
    } else if (forwardCount > 0) {
      forwardCount = totalBuses;
      reverseCount = 0;
    } else {
      reverseCount = totalBuses;
      forwardCount = 0;
    }

    console.log(
      `[INFO] Requested split exceeds available buses. Adjusted to forward=${forwardCount}, reverse=${reverseCount} for ${totalBuses} bus(es).`
    );
  }

  const plan = [];
  for (let i = 0; i < forwardCount; i += 1) plan.push('forward');
  for (let i = 0; i < reverseCount; i += 1) plan.push('reverse');

  // If counts don't cover all buses, fill remaining using alternating split.
  while (plan.length < totalBuses) {
    plan.push(plan.length % 2 === 0 ? 'forward' : 'reverse');
  }

  return plan;
};

const loadRoutes = async () => {
  const routesById = new Map();
  let query = db.collection('routes');
  if (routeIdFilter) {
    query = query.where('__name__', '==', routeIdFilter);
  }

  const snapshot = await query.get();
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const path = normalizePath(data.path || []);
    if (path.length >= 2) {
      routesById.set(doc.id, {
        routeId: doc.id,
        name: data.name || `Route ${doc.id}`,
        path,
      });
    }
  });

  return routesById;
};

const emitLocation = (payload) => {
  if (!socket || !socket.connected) return;
  socket.emit('busLocationUpdate', payload);
};

const buildLocationPayload = ({ busId, routeId, currentStop, nextStop, location, segmentIndex, totalSegments, traveled, segmentTotal }) => ({
  busId,
  routeId,
  status: 'in_transit',
  timestamp: new Date(),
  currentStop,
  nextStop,
  location: {
    lat: location.lat,
    lng: location.lng,
    latitude: location.lat,
    longitude: location.lng,
  },
  progress: {
    currentSegment: segmentIndex + 1,
    totalSegments,
    traveledInSegment: Number(traveled.toFixed(3)),
    segmentTotal: Number(segmentTotal.toFixed(3)),
    percentComplete: Number(((traveled / segmentTotal) * 100).toFixed(1)),
  },
});

const simulateSingleBus = async (bus, routeData, direction) => {
  const busId = bus.busId || bus.vehicle_id || bus.id;
  const basePath = routeData.path;
  const routePath = direction === 'reverse' ? [...basePath].reverse() : [...basePath];

  if (routePath.length < 2) {
    console.log(`[SKIP] ${busId} route ${routeData.routeId} has less than 2 valid points.`);
    return;
  }

  let occupancy = Number.isFinite(bus.occupancy) ? bus.occupancy : 0;
  const capacity = Number.isFinite(bus.capacity) ? bus.capacity : 60;
  const tripStartTime = new Date();
  let tripId = null;

  try {
    const tripData = {
      busId,
      routeId: routeData.routeId,
      driverId: bus.driverId || 'simulator',
      startTime: tripStartTime,
      status: 'active',
      direction: direction === 'reverse' ? 1 : 0,
    };
    const createdTrip = await busTripService.createTrip(tripData);
    tripId = createdTrip.tripId;

    await busService.updateBus(busId, {
      status: 'in_transit',
      currentTrip: tripId,
      currentStop: routePath[0].stopName,
      occupancy,
      routeId: routeData.routeId,
    });

    console.log(`[START] ${busId} on ${routeData.routeId} (${direction}), trip ${tripId}`);

    for (let segmentIndex = 0; segmentIndex < routePath.length - 1; segmentIndex += 1) {
      if (shouldStop) break;

      const current = routePath[segmentIndex];
      const next = routePath[segmentIndex + 1];
      const segmentDistance = getDistanceKm(current.lat, current.lng, next.lat, next.lng);
      const distancePerTick = (speedKmh * updateIntervalMs) / (1000 * 3600);
      let traveled = 0;

      while (traveled < segmentDistance && !shouldStop) {
        const point = interpolate(current.lat, current.lng, next.lat, next.lng, traveled);

        emitLocation(
          buildLocationPayload({
            busId,
            routeId: routeData.routeId,
            currentStop: current.stopName,
            nextStop: next.stopName,
            location: point,
            segmentIndex,
            totalSegments: routePath.length - 1,
            traveled,
            segmentTotal: segmentDistance || 0.0001,
          })
        );

        if (verbose) {
          console.log(`  [${busId}] ${current.stopName} -> ${next.stopName} (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`);
        }

        traveled += distancePerTick;
        await wait(updateIntervalMs);
      }

      const now = new Date();
      const flow = passengerFlowForStop({
        stopIndex: segmentIndex + 1,
        totalStops: routePath.length,
        capacity,
        occupancy,
      });
      occupancy = flow.nextOccupancy;

      await busTripRecordService.addBusTripRecord({
        busID: busId,
        busId,
        Trip_ID: tripId,
        Trip_Start_Time: tripStartTime.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        Origin: current.stopName,
        Destination: next.stopName,
        Distance_km: Number(segmentDistance.toFixed(3)),
        Boarding: flow.boarding,
        Alighting: flow.alighting,
        Stamp: now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        Route: routeData.name,
        day_type: getDayType(now),
        holiday_type: 'none',
        routeId: routeData.routeId,
        direction,
      });

      await busService.updateBus(busId, {
        currentStop: next.stopName,
        occupancy,
        status: 'in_transit',
        location: {
          lat: next.lat,
          lng: next.lng,
          latitude: next.lat,
          longitude: next.lng,
        },
      });
    }

    await busTripService.updateTrip(tripId, {
      status: shouldStop ? 'cancelled' : 'completed',
      endTime: new Date(),
    });

    await busService.updateBus(busId, {
      status: 'Idle',
      currentTrip: null,
    });

    console.log(`[DONE] ${busId} trip ${tripId} ${shouldStop ? '(stopped early)' : 'completed'}`);
  } catch (error) {
    console.error(`[ERROR] ${busId} failed:`, error.message);
    try {
      await busService.updateBus(busId, { status: 'Idle', currentTrip: null });
    } catch (cleanupErr) {
      console.error(`[WARN] ${busId} cleanup failed:`, cleanupErr.message);
    }
  }
};

const start = async () => {
  console.log('Multi Bus Route Simulator');
  console.log('=========================');
  console.log(`Backend URL: ${backendUrl}`);
  console.log(`Speed: ${speedKmh} km/h`);
  console.log(`Update interval: ${updateIntervalMs} ms`);
  console.log(`Route filter: ${routeIdFilter || 'all routes'}`);
  console.log(`Max buses: ${maxBuses > 0 ? maxBuses : 'no limit'}`);
  console.log(`Forward count: ${isValidNonNegativeInt(forwardCountParam) ? forwardCountParam : 'auto'}`);
  console.log(`Reverse count: ${isValidNonNegativeInt(reverseCountParam) ? reverseCountParam : 'auto'}`);
  console.log('');

  const routesById = await loadRoutes();
  if (!routesById.size) {
    throw new Error('No valid routes found. Make sure routes have a non-empty path with lat/lng.');
  }

  const buses = await busService.getAllBuses();
  const candidates = buses
    .map((bus) => ({ bus, routeId: resolveBusRouteId(bus) }))
    .filter((x) => x.routeId && routesById.has(x.routeId));

  if (!candidates.length) {
    throw new Error('No buses found with routeId matching available routes.');
  }

  const selected = maxBuses > 0 ? candidates.slice(0, maxBuses) : candidates;
  console.log(`Found ${selected.length} bus(es) to simulate.`);
  const directionPlan = buildDirectionPlan(selected.length);
  const forwardTotal = directionPlan.filter((d) => d === 'forward').length;
  const reverseTotal = directionPlan.filter((d) => d === 'reverse').length;
  console.log(`Direction split -> forward: ${forwardTotal}, reverse: ${reverseTotal}`);

  socket = io(backendUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  console.log(`Socket connected (${socket.id}).`);

  const tasks = [];
  for (let i = 0; i < selected.length; i += 1) {
    const { bus, routeId } = selected[i];
    const routeData = routesById.get(routeId);
    const direction = directionPlan[i];

    // Slightly stagger starts so they do not all emit at the exact same instant.
    tasks.push(
      (async () => {
        await wait(i * startGapMs);
        await simulateSingleBus(bus, routeData, direction);
      })()
    );
  }

  await Promise.all(tasks);

  if (socket && socket.connected) {
    socket.disconnect();
  }

  console.log('All selected bus simulations completed.');
};

const shutdown = async (signal) => {
  if (shouldStop) return;
  shouldStop = true;
  console.log(`\nReceived ${signal}. Stopping simulations...`);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Simulator failed:', error.message);
    if (socket && socket.connected) {
      socket.disconnect();
    }
    process.exit(1);
  });
