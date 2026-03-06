// mqtt/mqttBroker.js
/**
 * MQTT Broker for CTB Device Communication
 * Handles device health updates, violations, real-time status, and safe speed telemetry
 * Uses Firebase Firestore for persistence
 */

const net = require('net');
const deviceService = require('../services/deviceService');
const violationService = require('../services/violationService');
const fleetService = require('../services/fleetService');
const dmsService = require('../services/dmsService');

// Aedes will be dynamically imported when needed
let aedes = null;

let io = null; // Socket.IO instance for dashboard updates

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
        try {
            if (topic.includes('/dms/telemetry')) {
                await handleDMSTelemetry(topic, payload);
            } else if (topic.includes('/dms/event')) {
                await handleDMSEvent(topic, payload);
            } else if (topic.includes('/safespeed/telemetry')) {
                await handleSafeSpeedTelemetry(topic, payload);
            } else if (topic.includes('/health')) {
                await handleHealthUpdate(topic, payload);
            } else if (topic.includes('/violation')) {
                await handleViolation(topic, payload);
            } else if (topic.includes('/status')) {
                await handleStatusUpdate(topic, payload);
            } else if (topic.includes('/component')) {
                await handleComponentUpdate(topic, payload);
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

    let device = null;
    try {
        // Update device in Firebase
        device = await deviceService.updateDeviceHealth(device_key, {
            busNumber: bus_number,
            routeNumber: route_number,
            ...healthData
        });
        console.log(`Health update saved for ${device_key}`);
    } catch (err) {
        console.warn(`Could not save health to DB: ${err.message}`);
    }

    // ALWAYS notify dashboard via Socket.IO
    if (io) {
        io.emit('deviceHealthUpdate', {
            deviceKey: device_key,
            device: device || { deviceKey: device_key, busNumber: bus_number, routeNumber: route_number },
            health: healthData,
            timestamp: new Date().toISOString()
        });
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

    let violation = null;
    let device = null;

    // Try to get device info (may fail if quota exhausted)
    try {
        device = await deviceService.getDeviceByKey(device_key);
    } catch (devErr) {
        console.warn(`Could not fetch device info: ${devErr.message}`);
    }

    // Build violation data
    const violationData = {
        deviceKey: device_key,
        busNumber: device?.busNumber || payload.bus_number || 'UNKNOWN',
        routeNumber: device?.routeNumber || payload.route_number || '',
        type,
        severity: details?.severity || 'MEDIUM',
        description: details?.description || `${type} violation detected`,
        details: details || {},
        status: 'pending',
        location: payload.location || null,
        createdAt: new Date().toISOString(),
    };

    // Try to save to Firebase (may fail if quota exhausted)
    try {
        violation = await violationService.createViolation({
            deviceKey: device_key,
            busNumber: violationData.busNumber,
            routeNumber: violationData.routeNumber,
            type,
            details: details || {},
            location: payload.location || null
        });
        console.log(`Violation saved to DB: ${violation.id}`);
    } catch (dbErr) {
        console.warn(`Could not save violation to DB (quota?): ${dbErr.message}`);
        // Use local data as the violation object
        violation = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...violationData };
    }

    // ALWAYS notify dashboard via Socket.IO (even if DB write failed)
    if (io) {
        io.emit('newViolation', {
            violation: violation || violationData,
            deviceKey: device_key,
            timestamp: new Date().toISOString()
        });
        console.log(`Violation emitted via Socket.IO: ${type}`);
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
 * Handle safe speed telemetry from device
 * Stores bus data in Firestore and broadcasts to dashboard
 */
async function handleSafeSpeedTelemetry(topic, payload) {
    const parts = topic.split('/');
    const deviceKey = parts[2];

    console.log(`Safe speed telemetry from ${deviceKey}: ${payload.safe_speed} km/h at ${payload.location_name}`);

    try {
        // Store in fleet service
        const busData = await fleetService.upsertBusData(payload);

        // Store telemetry record
        await fleetService.addTelemetryRecord(payload);

        // Notify dashboard via Socket.IO
        if (io) {
            io.emit('bus_update', {
                ...payload,
                device_key: deviceKey,
                status: 'online',
                last_update: new Date().toISOString()
            });

            io.emit('safeSpeedUpdate', {
                deviceKey,
                vehicleId: payload.vehicle_id,
                safeSpeed: payload.safe_speed,
                location: payload.location_name,
                roadCondition: payload.road_condition,
                passengers: payload.passenger_count,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Safe speed telemetry processed for ${payload.vehicle_id}`);
    } catch (err) {
        console.error(`Error processing safe speed telemetry: ${err.message}`);
    }
}

/**
 * Handle DMS telemetry (driver state updates)
 */
async function handleDMSTelemetry(topic, payload) {
    const parts = topic.split('/');
    const deviceKey = parts[2];

    console.log(`DMS telemetry from ${deviceKey}: state=${payload.state}`);

    try {
        await dmsService.upsertDMSState(payload);

        if (io) {
            io.emit('dmsStateUpdate', {
                deviceKey,
                state: payload.state,
                details: payload.details || {},
                timestamp: payload.timestamp || new Date().toISOString()
            });
        }
    } catch (err) {
        console.error(`Error processing DMS telemetry: ${err.message}`);
    }
}

/**
 * Handle DMS events (critical alerts like phone use, sleeping, etc.)
 */
async function handleDMSEvent(topic, payload) {
    const parts = topic.split('/');
    const deviceKey = parts[2];

    console.log(`DMS event from ${deviceKey}: ${payload.type} (${payload.severity})`);

    try {
        const event = await dmsService.addDMSEvent(payload);

        if (io) {
            io.emit('dmsEvent', {
                event,
                deviceKey,
                timestamp: payload.timestamp || new Date().toISOString()
            });
        }
    } catch (err) {
        console.error(`Error processing DMS event: ${err.message}`);
    }
}

module.exports = {
    startMQTTBroker,
    setSocketIO,
    aedes
};
