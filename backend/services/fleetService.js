// services/fleetService.js
/**
 * Fleet management service for safe speed monitoring
 * Handles bus data, telemetry records, fleet overview, and statistics
 * Uses Firebase Firestore for persistence
 */

const { db, admin } = require("../firebase");

const busesCollection = db.collection("buses");
const liveBusesCollection = db.collection("bus_live_locations");
const telemetryCollection = db.collection("fleet_telemetry");

/**
 * Normalize a bus document from any source into a consistent shape
 * used by the web dashboard. Fields from ESP32 / buses collection are
 * mapped to the same field names the frontend already expects.
 */
function normalizeBus(id, data, source = 'buses') {
    const lat = data.latitude
        || data.location?.latitude || data.location?.lat || null;
    const lng = data.longitude
        || data.location?.longitude || data.location?.lng || null;

    return {
        id,
        vehicle_id: data.vehicle_id || data.busId || data.bus_id || id,
        route_id: data.route_id || data.routeId || data.routeNumber || '',
        latitude: lat,
        longitude: lng,
        location_name: data.location_name || '',
        direction: data.direction || '',
        safe_speed: data.safe_speed || data.speed || 0,
        speed: data.speed || data.safe_speed || 0,
        road_condition: data.road_condition || 'Dry',
        passenger_count: data.passenger_count || data.occupancy || 0,
        passenger_load_kg: data.passenger_load_kg || data.total_weight || 0,
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        status: data.status || 'unknown',
        last_update: data.last_update || data.updatedAt || data.last_updated || null,
        source, // track origin for debugging
    };
}

/**
 * Get all buses from the buses collection, overlaid with live telemetry.
 */
async function getMergedBuses() {
    const [busesSnap, liveSnap] = await Promise.all([
        busesCollection.get(),
        liveBusesCollection.get(),
    ]);

    const map = new Map(); // keyed by vehicle_id

    // 1. buses collection (ESP32 auto-created / admin seeded)
    busesSnap.docs.forEach(doc => {
        const data = doc.data();
        const vid = data.busId || data.vehicle_id || doc.id;
        map.set(vid, normalizeBus(doc.id, data, 'buses'));
    });

    // 3. bus_live_locations (real-time telemetry — overlay live fields)
    liveSnap.docs.forEach(doc => {
        const data = doc.data();
        const vid = data.bus_id || doc.id;
        const existing = map.get(vid);
        if (existing) {
            // Overlay live fields onto the existing entry
            if (data.latitude) existing.latitude = data.latitude;
            if (data.longitude) existing.longitude = data.longitude;
            if (data.speed) { existing.speed = data.speed; existing.safe_speed = existing.safe_speed || data.speed; }
            if (data.passenger_count != null) existing.passenger_count = data.passenger_count;
            if (data.total_weight) existing.passenger_load_kg = data.total_weight;
            if (data.status === 'online') existing.status = 'online';
            if (data.last_updated) existing.last_update = typeof data.last_updated?.toDate === 'function'
                ? data.last_updated.toDate().toISOString() : data.last_updated;
            if (data.route_id) existing.route_id = existing.route_id || data.route_id;
            if (data.route_name) existing.route_name = data.route_name;
        } else {
            // Brand new live-only bus
            map.set(vid, normalizeBus(doc.id, data, 'bus_live_locations'));
        }
    });

    return Array.from(map.values());
}

/**
 * Create or update bus data from telemetry
 */
async function upsertBusData(data) {
    const busId = data.busId || data.vehicle_id;
    if (!busId) throw new Error("Missing busId");

    const docRef = busesCollection.doc(busId);
    const doc = await docRef.get();

    if (doc.exists) {
        // Update: only overwrite fields actually present in the incoming data
        // This prevents status-only or partial messages from zeroing out real values
        const updateData = {
            busId: busId,
            status: 'online',
            last_update: new Date().toISOString(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if ('routeId' in data || 'route_id' in data) updateData.routeId = data.routeId || data.route_id;
        if ('latitude' in data) {
            updateData.latitude = data.latitude;
            updateData.location = { lat: data.latitude, lng: data.longitude || 0 };
        }
        if ('longitude' in data) updateData.longitude = data.longitude;
        if ('location_name' in data) updateData.location_name = data.location_name;
        if ('direction' in data) updateData.direction = data.direction;
        if ('safe_speed' in data) updateData.safe_speed = data.safe_speed;
        if ('road_condition' in data) updateData.road_condition = data.road_condition;
        if ('occupancy' in data || 'passenger_count' in data) updateData.occupancy = data.occupancy || data.passenger_count || 0;
        if ('passenger_load_kg' in data) updateData.passenger_load_kg = data.passenger_load_kg;
        if ('temperature' in data) updateData.temperature = data.temperature;
        if ('humidity' in data) updateData.humidity = data.humidity;

        await docRef.update(updateData);
        return { ...doc.data(), ...updateData };
    } else {
        // Create: set all fields with defaults
        const busData = {
            busId: busId,
            routeId: data.routeId || data.route_id || '',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            location: { lat: data.latitude || 0, lng: data.longitude || 0 },
            location_name: data.location_name || 'Unknown',
            direction: data.direction || '',
            safe_speed: data.safe_speed || 0,
            road_condition: data.road_condition || 'Dry',
            occupancy: data.occupancy || data.passenger_count || 0,
            passenger_load_kg: data.passenger_load_kg || 0,
            temperature: data.temperature || 0,
            humidity: data.humidity || 0,
            status: 'online',
            last_update: new Date().toISOString(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await docRef.set(busData);
        return busData;
    }
}

/**
 * Add telemetry record
 */
async function addTelemetryRecord(data) {
    const record = {
        busId: data.busId || data.vehicle_id || '',
        routeId: data.routeId || data.route_id || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        location_name: data.location_name || 'Unknown',
        direction: data.direction || '',
        safe_speed: data.safe_speed || 0,
        road_condition: data.road_condition || 'Dry',
        occupancy: data.occupancy || data.passenger_count || 0,
        passenger_load_kg: data.passenger_load_kg || 0,
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        timestamp: data.timestamp || new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await telemetryCollection.add(record);
    return { id: docRef.id, ...record };
}

/**
 * Get fleet overview statistics
 */
async function getFleetOverview() {
    const buses = await getMergedBuses();
    
    const totalBuses = buses.length;
    const onlineThreshold = new Date(Date.now() - 30000); // 30 seconds

    let onlineBuses = 0;
    let totalSpeed = 0;
    let wetRoads = 0;
    let dryRoads = 0;
    let totalPassengers = 0;

    for (const bus of buses) {
        if (bus.last_update) {
            const lastUpdate = new Date(bus.last_update);
            if (lastUpdate >= onlineThreshold) {
                onlineBuses++;
            }
        }
        if (bus.safe_speed) totalSpeed += bus.safe_speed;
        if (bus.road_condition === 'Wet') wetRoads++;
        else dryRoads++;
        if (bus.occupancy) totalPassengers += bus.occupancy;
    }

    return {
        total_buses: totalBuses,
        online_buses: onlineBuses,
        offline_buses: totalBuses - onlineBuses,
        average_speed: totalBuses > 0 ? Math.round((totalSpeed / totalBuses) * 10) / 10 : 0,
        road_conditions: { wet: wetRoads, dry: dryRoads },
        total_passengers: totalPassengers,
        timestamp: new Date().toISOString()
    };
}

/**
 * Get all buses
 */
async function getAllBuses() {
    const buses = await getMergedBuses();
    const onlineThreshold = new Date(Date.now() - 30000);

    buses.forEach(bus => {
        if (bus.last_update) {
            bus.status = new Date(bus.last_update) >= onlineThreshold ? 'online' : 'offline';
        }
    });

    buses.sort((a, b) => (a.busId || '').localeCompare(b.busId || ''));
    return { buses, count: buses.length };
}

/**
 * Get specific bus details
 */
async function getBusDetails(vehicleId) {
    // Search across all collections for this bus
    const buses = await getMergedBuses();
    const bus = buses.find(b => b.vehicle_id === vehicleId || b.id === vehicleId);
    if (!bus) return null;

    const onlineThreshold = new Date(Date.now() - 30000);
    bus.status = bus.last_update ? new Date(bus.last_update) >= onlineThreshold ? 'online' : 'offline' : 'offline';
    return bus;
}

/**
 * Get bus telemetry history
 */
async function getBusHistory(vehicleId, hours = 24, limit = 100) {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Query by busId (fall back to vehicle_id for old records)
    let snapshot = await telemetryCollection
        .where("busId", "==", vehicleId)
        .limit(limit * 2)
        .get();
    if (snapshot.empty) {
        snapshot = await telemetryCollection
            .where("vehicle_id", "==", vehicleId)
            .limit(limit * 2)
            .get();
    }

    const history = snapshot.docs
        .map(doc => doc.data())
        .filter(record => {
            if (record.timestamp) {
                return new Date(record.timestamp) >= timeThreshold;
            }
            return false;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

    return {
        busId: vehicleId,
        history,
        count: history.length
    };
}

/**
 * Get map data for all buses
 */
async function getMapData() {
    const allBuses = await getMergedBuses();
    const onlineThreshold = new Date(Date.now() - 30000);

    const buses = allBuses
        .filter(bus => bus.latitude && bus.longitude)
        .map(bus => ({
            vehicle_id: bus.vehicle_id,
            latitude: bus.latitude,
            longitude: bus.longitude,
            location_name: bus.location_name,
            safe_speed: bus.safe_speed,
            speed: bus.speed,
            road_condition: bus.road_condition,
            direction: bus.direction,
            passenger_count: bus.passenger_count,
            route_id: bus.route_id,
            route_name: bus.route_name || '',
            status: bus.last_update ? new Date(bus.last_update) >= onlineThreshold ? 'online' : 'offline' : 'offline'
        }));

    return { buses, count: buses.length };
}

/**
 * Get unique routes
 */
async function getRoutes() {
    const buses = await getMergedBuses();
    const routeCounts = {};

    buses.forEach(bus => {
        if (bus.route_id) {
            routeCounts[bus.route_id] = (routeCounts[bus.route_id] || 0) + 1;
        }
    });

    const routes = Object.entries(routeCounts).map(([routeId, count]) => ({
        routeId: routeId,
        bus_count: count
    }));

    return { routes, count: routes.length };
}

/**
 * Get fleet statistics
 */
async function getStatistics() {
    const buses = await getMergedBuses();

    // Speed distribution
    const speedRanges = [
        { label: "0-20 km/h", min: 0, max: 20 },
        { label: "20-40 km/h", min: 20, max: 40 },
        { label: "40-60 km/h", min: 40, max: 60 },
        { label: "60-80 km/h", min: 60, max: 80 },
        { label: "80+ km/h", min: 80, max: 200 }
    ];

    const speedDistribution = speedRanges.map(range => ({
        range: range.label,
        count: buses.filter(b => (b.safe_speed || 0) >= range.min && (b.safe_speed || 0) < range.max).length
    }));

    // Try to get hourly telemetry (today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let hourlyTelemetry = [];
    try {
        const telemetrySnapshot = await telemetryCollection
            .where("timestamp", ">=", todayStart.toISOString())
            .limit(500)
            .get();

        const hourlyCounts = {};
        const hourlySpeeds = {};

        telemetrySnapshot.docs.forEach(doc => {
            const record = doc.data();
            if (record.timestamp) {
                const hour = new Date(record.timestamp).getHours();
                hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
                if (!hourlySpeeds[hour]) hourlySpeeds[hour] = [];
                if (record.safe_speed) hourlySpeeds[hour].push(record.safe_speed);
            }
        });

        hourlyTelemetry = Object.keys(hourlyCounts)
            .map(Number)
            .sort((a, b) => a - b)
            .map(hour => ({
                hour,
                count: hourlyCounts[hour],
                avg_speed: hourlySpeeds[hour]?.length > 0
                    ? Math.round(hourlySpeeds[hour].reduce((a, b) => a + b, 0) / hourlySpeeds[hour].length * 10) / 10
                    : 0
            }));
    } catch (err) {
        console.error('Error getting hourly telemetry:', err.message);
    }

    return {
        speed_distribution: speedDistribution,
        hourly_telemetry: hourlyTelemetry,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    upsertBusData,
    addTelemetryRecord,
    getFleetOverview,
    getAllBuses,
    getBusDetails,
    getBusHistory,
    getMapData,
    getRoutes,
    getStatistics
};
