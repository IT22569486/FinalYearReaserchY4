// mqtt/mqttBroker.js
/**
 * MQTT Broker for CTB Device Communication
 * Handles device health updates, violations, real-time status,
 * and bus GPS/passenger tracking
 * Uses Firebase Firestore for persistence
 */

const net = require('net');
const deviceService = require('../services/deviceService');
const violationService = require('../services/violationService');
const busService = require('../services/busService');
const routeService = require('../services/routeService');
const { db } = require('../firebase');

// Aedes will be dynamically imported when needed
let aedes = null;

let io = null; // Socket.IO instance for dashboard updates

// Cache for route names
const routeCache = new Map();

/**
 * Set Socket.IO instance for real-time dashboard updates
 */
function setSocketIO(socketIO) {
    io = socketIO;
}

/**
 * Start MQTT broker
 */
async function startMQTTBroker(mqttPort = 1883, wsPort = 8083) {
    try {
        // Require aedes (CommonJS module in v0.x)
        const Aedes = require('aedes');
        aedes = Aedes();
        
        // Create TCP server for MQTT
        const mqttServer = net.createServer(aedes.handle);
        
        mqttServer.listen(mqttPort, () => {
            console.log(`MQTT Broker:     mqtt://localhost:${mqttPort}`);
        });
        
        // Handle client connections
        aedes.on('client', (client) => {
            console.log(`MQTT Client connected: ${client.id}`);
        });

    // Handle client disconnections
    aedes.on('clientDisconnect', async (client) => {
        console.log(`MQTT Client disconnected: ${client.id}`);
        
        // Try to mark device as offline if client ID contains device key
        if (client.id && client.id.startsWith('CTB-')) {
            try {
                await deviceService.updateDeviceStatus(client.id, 'offline');
                
                // Notify dashboard
                if (io) {
                    io.emit('deviceStatusUpdate', {
                        deviceKey: client.id,
                        status: 'offline'
                    });
                }
            } catch (err) {
                console.error('Error updating device status on disconnect:', err);
            }
        }
    });

    // Handle published messages
    aedes.on('publish', async (packet, client) => {
        if (!client) return; // Ignore internal messages
        
        const topic = packet.topic;
        let payload;
        
        try {
            payload = JSON.parse(packet.payload.toString());
        } catch (err) {
            console.error('Invalid JSON payload:', packet.payload.toString());
            return;
        }

        console.log(`MQTT Message: ${topic}`);

        // Route messages based on topic
        // IMPORTANT: /status must be checked BEFORE /safespeed because
        // status topic is .../safespeed/status which matches both patterns
        try {
            if (topic.includes('/health')) {
                await handleHealthUpdate(topic, payload);
            } else if (topic.includes('/violation')) {
                await handleViolation(topic, payload);
            } else if (topic.includes('/status')) {
                await handleStatusUpdate(topic, payload);
            } else if (topic.includes('/telemetry') || topic.includes('/safespeed')) {
                await handleTelemetry(topic, payload);
            } else if (topic.includes('/component')) {
                await handleComponentUpdate(topic, payload);
            } else if (topic.match(/^bus\/[^\/]+\/gps$/)) {
                await handleBusGPS(topic, payload);
            } else if (topic.match(/^bus\/[^\/]+\/passenger$/)) {
                await handleBusPassenger(topic, payload);
            } else if (topic.match(/^bus\/[^\/]+\/telemetry$/)) {
                await handleBusTelemetry(topic, payload);
            }
        } catch (err) {
            console.error(`Error handling MQTT message: ${err.message}`);
        }
    });

    // Handle subscriptions
    aedes.on('subscribe', (subscriptions, client) => {
        console.log(`Client ${client.id} subscribed to:`, 
            subscriptions.map(s => s.topic).join(', '));
    });

        return aedes;
    } catch (error) {
        console.warn('MQTT Broker disabled (aedes not available):', error.message);
        console.warn('Device monitoring features will work, but MQTT broker is disabled.');
        return null;
    }  
}

/**
 * Handle device health updates
 */
async function handleHealthUpdate(topic, payload) {
    const { device_key, bus_number, route_number, ...healthData } = payload;
    
    if (!device_key) {
        console.error('Health update missing device_key');
        return;
    }

    console.log(`Health update from ${device_key}`);

    try {
        // Update device in Firebase
        const device = await deviceService.updateDeviceHealth(device_key, {
            busNumber: bus_number,
            routeNumber: route_number,
            ...healthData
        });

        // Notify dashboard via Socket.IO
        if (io) {
            io.emit('deviceHealthUpdate', {
                deviceKey: device_key,
                device: device,
                health: healthData,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Health update processed for ${device_key}`);
    } catch (err) {
        console.error(`Error processing health update: ${err.message}`);
    }
}

/**
 * Handle violation reports
 */
async function handleViolation(topic, payload) {
    const { device_key, type, details } = payload;
    
    if (!device_key || !type) {
        console.error('Violation missing device_key or type');
        return;
    }

    console.log(`Violation from ${device_key}: ${type}`);

    try {
        // Get device info
        const device = await deviceService.getDeviceByKey(device_key);
        
        // Create violation in Firebase
        const violation = await violationService.createViolation({
            deviceKey: device_key,
            busNumber: device?.busNumber || payload.bus_number,
            routeNumber: device?.routeNumber || payload.route_number,
            type,
            details: details || {},
            location: payload.location || null
        });

        // Notify dashboard via Socket.IO
        if (io) {
            io.emit('newViolation', {
                violation,
                deviceKey: device_key,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Violation recorded: ${violation.id}`);
    } catch (err) {
        console.error(`Error processing violation: ${err.message}`);
    }
}

/**
 * Handle device status updates
 */
async function handleStatusUpdate(topic, payload) {
    const { device_key, status } = payload;
    
    if (!device_key || !status) {
        console.error('Status update missing device_key or status');
        return;
    }

    console.log(`Status update from ${device_key}: ${status}`);

    try {
        await deviceService.updateDeviceStatus(device_key, status);

        // Notify dashboard
        if (io) {
            io.emit('deviceStatusUpdate', {
                deviceKey: device_key,
                status,
                timestamp: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error(`Error processing status update: ${err.message}`);
    }
}

/**
 * Handle component status updates
 */
async function handleComponentUpdate(topic, payload) {
    const { component, status, details } = payload;
    
    // Extract device key from topic: ctb/bus/{device_key}/component
    const parts = topic.split('/');
    const deviceKey = parts[2];
    
    console.log(`Component update from ${deviceKey}: ${component} = ${status}`);

    // Notify dashboard
    if (io) {
        io.emit('componentUpdate', {
            deviceKey,
            component,
            status,
            details,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Get route name by ID (with caching)
 */
async function getRouteName(routeId) {
    if (!routeId) return 'Unknown';
    
    const cacheKey = String(routeId);
    if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey);
    }
    
    try {
        const route = await routeService.getRouteById(cacheKey);
        if (route && route.name) {
            routeCache.set(cacheKey, route.name);
            return route.name;
        }
    } catch (err) {
        console.error(`Error fetching route ${routeId}: ${err.message}`);
    }
    
    return `Route ${routeId}`;
}

/**
 * Handle bus GPS location updates
 * Topic: bus/{bus_id}/gps
 */
async function handleBusGPS(topic, payload) {
    // Extract bus_id from topic
    const parts = topic.split('/');
    const busId = parts[1];
    
    const { route_id, latitude, longitude, speed, timestamp } = payload;
    
    console.log(`GPS update from bus ${busId}: lat=${latitude}, lng=${longitude}, speed=${speed}`);
    
    try {
        // Get route name
        const routeName = await getRouteName(route_id);
        
        // Auto-create bus if it doesn't exist yet
        await ensureBusExists(busId, payload);

        // Store in Firebase - bus_live_locations collection
        const locationRef = db.collection('bus_live_locations').doc(busId);
        await locationRef.set({
            bus_id: busId,
            route_id: route_id || null,
            route_name: routeName,
            latitude: latitude,
            longitude: longitude,
            speed: speed || 0,
            status: 'online',
            last_updated: new Date(),
            device_timestamp: timestamp
        }, { merge: true });
        
        // Also update the main buses collection if it exists
        try {
            const busData = await busService.getBusByBusId(busId);
            if (busData) {
                await busService.updateBusLocation(busId, {
                    lat: latitude,
                    lng: longitude,
                    latitude: latitude,
                    longitude: longitude
                });
            }
        } catch (err) {
            // Bus might not exist in buses collection, that's okay
        }
        
        // Broadcast via Socket.IO
        if (io) {
            const broadcastData = {
                bus_id: busId,
                busId: busId,
                route_id: route_id,
                route_name: routeName,
                latitude: latitude,
                longitude: longitude,
                speed: speed || 0,
                location: { lat: latitude, lng: longitude },
                timestamp: new Date().toISOString()
            };
            
            // Emit to all connected clients
            io.emit('bus_location_update', broadcastData);
            
            // Also emit to bus-specific room
            io.to(busId).emit('bus_location_update', broadcastData);
            
            // Legacy event name for compatibility
            io.emit('busLocationUpdate', broadcastData);
        }
        
        console.log(`GPS processed for bus ${busId}`);
        
    } catch (err) {
        console.error(`Error processing GPS update: ${err.message}`);
    }
}

/**
 * Handle bus passenger data updates
 * Topic: bus/{bus_id}/passenger
 */
async function handleBusPassenger(topic, payload) {
    // Extract bus_id from topic
    const parts = topic.split('/');
    const busId = parts[1];
    
    const {
        route_id,
        latitude,
        longitude,
        total_weight,
        in_count,
        out_count,
        total_passenger_count,
        timestamp
    } = payload;
    
    console.log(`Passenger update from bus ${busId}: in=${in_count}, out=${out_count}, total=${total_passenger_count}`);
    
    try {
        // Get route name
        const routeName = await getRouteName(route_id);
        
        // Store passenger event in Firebase
        const eventRef = db.collection('bus_passenger_events').doc();
        await eventRef.set({
            bus_id: busId,
            route_id: route_id || null,
            route_name: routeName,
            latitude: latitude,
            longitude: longitude,
            total_weight: total_weight || 0,
            in_count: in_count || 0,
            out_count: out_count || 0,
            total_passenger_count: total_passenger_count || 0,
            timestamp: new Date(),
            device_timestamp: timestamp
        });
        
        // Update live location with passenger count
        const locationRef = db.collection('bus_live_locations').doc(busId);
        await locationRef.set({
            passenger_count: total_passenger_count || 0,
            total_weight: total_weight || 0,
            last_passenger_update: new Date()
        }, { merge: true });
        
        // Update bus occupancy if bus exists
        try {
            await busService.updateBusOccupancy(busId, total_passenger_count || 0);
        } catch (err) {
            // Bus might not exist in buses collection
        }
        
        // Broadcast via Socket.IO
        if (io) {
            const broadcastData = {
                bus_id: busId,
                busId: busId,
                route_id: route_id,
                route_name: routeName,
                latitude: latitude,
                longitude: longitude,
                total_weight: total_weight || 0,
                in_count: in_count || 0,
                out_count: out_count || 0,
                total_passenger_count: total_passenger_count || 0,
                passenger_count: total_passenger_count || 0,
                timestamp: new Date().toISOString()
            };
            
            // Emit to all connected clients
            io.emit('passenger_update', broadcastData);
            
            // Also emit to bus-specific room
            io.to(busId).emit('passenger_update', broadcastData);
        }
        
        console.log(`Passenger data processed for bus ${busId}`);
        
    } catch (err) {
        console.error(`Error processing passenger update: ${err.message}`);
    }
}

/**
 * Ensure a bus document exists in the 'buses' collection.
 * Auto-creates on first ESP32 telemetry; updates location/speed on subsequent.
 */
async function ensureBusExists(busId, payload) {
    try {
        const snap = await db.collection('buses').where('busId', '==', busId).limit(1).get();
        const lat = payload.latitude;
        const lng = payload.longitude;
        const location = (lat != null && lng != null)
            ? { lat, lng, latitude: lat, longitude: lng }
            : null;

        if (!snap.empty) {
            // Update live fields
            const update = {
                occupancy: payload.passenger_count || 0,
                speed: payload.speed || 0,
                status: 'active',
                updatedAt: new Date().toISOString(),
            };
            if (location) update.location = location;
            if (payload.route_id) {
                update.routeId = payload.route_id;
                update.routeNumber = payload.route_id;
            }
            await snap.docs[0].ref.update(update);
        } else {
            // Create new bus
            const now = new Date().toISOString();
            await db.collection('buses').add({
                busId,
                busNumber: busId,
                routeId: payload.route_id || null,
                routeNumber: payload.route_id || null,
                capacity: 60,
                occupancy: payload.passenger_count || 0,
                status: 'active',
                location,
                speed: payload.speed || 0,
                createdAt: now,
                updatedAt: now,
            });
            console.log(`Auto-created bus '${busId}' in 'buses' collection`);
        }
    } catch (err) {
        console.error(`ensureBusExists error for ${busId}: ${err.message}`);
    }
}

/**
 * Handle combined telemetry from ESP32 v8
 * Topic: bus/{bus_id}/telemetry
 * Payload: { bus_id, route_id, latitude, longitude, speed, passenger_count, total_weight, gps_valid, timestamp }
 */
async function handleBusTelemetry(topic, payload) {
    const parts = topic.split('/');
    const busId = parts[1];

    const { route_id, latitude, longitude, speed, passenger_count, total_weight, gps_valid, timestamp } = payload;

    console.log(`Telemetry from bus ${busId}: lat=${latitude}, lng=${longitude}, speed=${speed}, passengers=${passenger_count}`);

    try {
        const routeName = await getRouteName(route_id);

        // 1. Auto-create / update bus in 'buses' collection
        await ensureBusExists(busId, payload);

        // 2. Update bus_live_locations (real-time tracking)
        const locationRef = db.collection('bus_live_locations').doc(busId);
        await locationRef.set({
            bus_id: busId,
            route_id: route_id || null,
            route_name: routeName,
            latitude,
            longitude,
            speed: speed || 0,
            passenger_count: passenger_count || 0,
            total_weight: total_weight || 0,
            gps_valid: gps_valid !== false,
            status: 'online',
            last_updated: new Date(),
            device_timestamp: timestamp,
        }, { merge: true });

        // 3. Broadcast via Socket.IO
        if (io) {
            const broadcastData = {
                bus_id: busId,
                busId,
                route_id,
                route_name: routeName,
                latitude,
                longitude,
                speed: speed || 0,
                passenger_count: passenger_count || 0,
                total_weight: total_weight || 0,
                gps_valid: gps_valid !== false,
                location: { lat: latitude, lng: longitude },
                timestamp: new Date().toISOString(),
            };
            io.emit('bus_location_update', broadcastData);
            io.to(busId).emit('bus_location_update', broadcastData);
            io.emit('busLocationUpdate', broadcastData);
        }

        console.log(`Telemetry processed for bus ${busId}`);
    } catch (err) {
        console.error(`Error processing telemetry: ${err.message}`);
    }
}

module.exports = {
    startMQTTBroker,
    setSocketIO,
    aedes
};
