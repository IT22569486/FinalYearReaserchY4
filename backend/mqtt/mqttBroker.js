// mqtt/mqttBroker.js
/**
 * MQTT Broker for CTB Device Communication
 * Handles device health updates, violations, and real-time status
 * Uses Firebase Firestore for persistence
 */

const net = require('net');
const deviceService = require('../services/deviceService');
const violationService = require('../services/violationService');

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
            if (topic.includes('/health')) {
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

module.exports = {
    startMQTTBroker,
    setSocketIO,
    aedes
};
