// services/dmsService.js
/**
 * Driver Monitoring System (DMS) Service
 * Handles Firestore persistence for DMS telemetry and events
 */

const { db } = require('../firebase');

const DMS_COLLECTION = 'dms_telemetry';
const DMS_EVENTS_COLLECTION = 'dms_events';

/**
 * Store DMS telemetry (latest state per device)
 */
async function upsertDMSState(payload) {
    const { device_key, state, timestamp, details } = payload;
    if (!device_key) throw new Error('Missing device_key');

    const docRef = db.collection(DMS_COLLECTION).doc(device_key);
    const data = {
        device_key,
        state: state || 'UNKNOWN',
        timestamp: timestamp || new Date().toISOString(),
        details: details || {},
        updatedAt: new Date().toISOString(),
    };

    await docRef.set(data, { merge: true });
    return data;
}

/**
 * Store a DMS event / alert
 */
async function addDMSEvent(payload) {
    const { device_key, type, severity, timestamp, details } = payload;
    if (!device_key || !type) throw new Error('Missing device_key or type');

    const data = {
        device_key,
        type,
        severity: severity || 'info',
        timestamp: timestamp || new Date().toISOString(),
        details: details || {},
        createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(DMS_EVENTS_COLLECTION).add(data);
    return { id: docRef.id, ...data };
}

/**
 * Get latest DMS state for all devices
 */
async function getAllDMSStates() {
    const snapshot = await db.collection(DMS_COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get latest DMS state for a specific device
 */
async function getDMSState(deviceKey) {
    const doc = await db.collection(DMS_COLLECTION).doc(deviceKey).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Get DMS events/alerts, optionally filtered by device key
 */
async function getDMSEvents(deviceKey = null, limit = 50) {
    let query = db.collection(DMS_EVENTS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(limit);

    if (deviceKey) {
        query = query.where('device_key', '==', deviceKey);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get DMS statistics (event counts by type)
 */
async function getDMSStatistics(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const snapshot = await db.collection(DMS_EVENTS_COLLECTION)
        .where('createdAt', '>=', since)
        .get();

    const stats = { total: 0, byType: {}, bySeverity: {} };
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.total++;
        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
        stats.bySeverity[data.severity] = (stats.bySeverity[data.severity] || 0) + 1;
    });

    return stats;
}

module.exports = {
    upsertDMSState,
    addDMSEvent,
    getAllDMSStates,
    getDMSState,
    getDMSEvents,
    getDMSStatistics,
};
