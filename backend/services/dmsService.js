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
 * Get latest DMS state for all devices (with pagination)
 */
async function getAllDMSStates(limit = 6, page = 1) {
    const snapshot = await db.collection(DMS_COLLECTION).get();
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = all.slice(start, start + limit);
    return { data, total, page: safePage, limit, totalPages };
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
 * Get DMS events/alerts, optionally filtered by device key (with pagination)
 */
async function getDMSEvents(deviceKey = null, limit = 10, page = 1) {
    let query = db.collection(DMS_EVENTS_COLLECTION);

    if (deviceKey) {
        query = query.where('device_key', '==', deviceKey);
    }

    // Get all matching to compute total count, then paginate in memory
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = all.slice(start, start + limit);
    return { data, total, page: safePage, limit, totalPages };
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
