// services/violationService.js
// Violation tracking service using Firebase Firestore
const { db, admin } = require("../firebase");
const violationsCollection = db.collection("violations");

// In-memory cache to reduce Firestore reads (resets on new violations or server restart)
let _summaryCache = null;
let _statsCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

function invalidateCache() {
  _summaryCache = null;
  _statsCache = null;
  _cacheTimestamp = 0;
}
function isCacheValid() {
  return (Date.now() - _cacheTimestamp) < CACHE_TTL;
}

/**
 * Create a new violation
 */
async function createViolation(violationData) {
  const { deviceKey, type, details, ...rest } = violationData;

  // Extract severity from details if present, default to MEDIUM
  const severity = details?.severity || 'MEDIUM';

  const newViolation = {
    deviceKey,
    type,
    severity,
    details: details || {},
    description: details?.description || `${type} violation detected`,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...rest
  };

  const docRef = await violationsCollection.add(newViolation);
  const doc = await docRef.get();
  invalidateCache(); // Clear cache when new violation added
  return { id: docRef.id, ...doc.data() };
}

/**
 * Get all violations
 */
async function getAllViolations(filters = {}) {
  let query = violationsCollection.orderBy("createdAt", "desc");

  if (filters.deviceKey) {
    query = query.where("deviceKey", "==", filters.deviceKey);
  }

  if (filters.type) {
    query = query.where("type", "==", filters.type);
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get violations by device key
 */
async function getViolationsByDevice(deviceKey, limit = 50) {
  // Simple query without orderBy to avoid index requirement
  const snapshot = await violationsCollection
    .where("deviceKey", "==", deviceKey)
    .limit(limit * 2) // Get more to sort in memory
    .get();

  // Sort in memory and limit
  const violations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return violations
    .sort((a, b) => {
      const timeA = a.createdAt?._seconds || 0;
      const timeB = b.createdAt?._seconds || 0;
      return timeB - timeA;
    })
    .slice(0, limit);
}

/**
 * Get violation by ID
 */
async function getViolationById(violationId) {
  const doc = await violationsCollection.doc(violationId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Update violation status
 */
async function updateViolationStatus(violationId, status, notes = '') {
  const docRef = violationsCollection.doc(violationId);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  invalidateCache(); // Clear cache when violation updated
  await docRef.update({
    status,
    notes,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updated = await docRef.get();
  return { id: violationId, ...updated.data() };
}

/**
 * Get violation statistics
 */
async function getViolationStats(deviceKey = null) {
  // Return cached result if valid and no device filter
  if (!deviceKey && _statsCache && isCacheValid()) {
    return _statsCache;
  }

  let query = violationsCollection;

  if (deviceKey) {
    query = query.where("deviceKey", "==", deviceKey);
  }

  const snapshot = await query.get();

  const stats = {
    total: snapshot.size,
    byType: {},
    byStatus: {},
    today: 0
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  snapshot.docs.forEach(doc => {
    const data = doc.data();

    // Count by type
    stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;

    // Count by status
    stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

    // Count today's violations
    if (data.createdAt && data.createdAt.toDate() >= today) {
      stats.today++;
    }
  });

  if (!deviceKey) {
    _statsCache = stats;
    _cacheTimestamp = Date.now();
  }
  return stats;
}

/**
 * Get violation summary grouped by bus
 * Returns: [ { busNumber, routeNumber, deviceKey, totalViolations, todayCount, byType, latestViolation } ]
 */
async function getViolationSummaryByBus() {
  // Return cached result if valid
  if (_summaryCache && isCacheValid()) {
    return _summaryCache;
  }

  const snapshot = await violationsCollection.get();

  const busMap = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  snapshot.docs.forEach(doc => {
    const d = doc.data();
    const bus = d.busNumber || d.deviceKey || 'UNKNOWN';

    if (!busMap[bus]) {
      busMap[bus] = {
        busNumber: d.busNumber || 'UNKNOWN',
        routeNumber: d.routeNumber || '',
        deviceKey: d.deviceKey || '',
        totalViolations: 0,
        todayCount: 0,
        pendingCount: 0,
        byType: {},
        bySeverity: {},
        latestViolation: null,
        latestTimestamp: 0,
      };
    }

    const entry = busMap[bus];
    entry.totalViolations++;

    // Count by type
    if (d.type) entry.byType[d.type] = (entry.byType[d.type] || 0) + 1;

    // Count by severity
    const sev = d.severity || d.details?.severity || 'MEDIUM';
    entry.bySeverity[sev] = (entry.bySeverity[sev] || 0) + 1;

    // Count pending
    if (d.status === 'pending') entry.pendingCount++;

    // Count today
    if (d.createdAt && d.createdAt.toDate && d.createdAt.toDate() >= today) {
      entry.todayCount++;
    }

    // Track latest violation
    const ts = d.createdAt?._seconds || d.createdAt?.seconds || 0;
    if (ts > entry.latestTimestamp) {
      entry.latestTimestamp = ts;
      entry.latestViolation = { id: doc.id, type: d.type, severity: sev, createdAt: d.createdAt };
    }
  });

  // Convert to array sorted by totalViolations desc
  const result = Object.values(busMap).sort((a, b) => b.totalViolations - a.totalViolations);
  _summaryCache = result;
  _cacheTimestamp = Date.now();
  return result;
}

/**
 * Delete violation
 */
async function deleteViolation(violationId) {
  const docRef = violationsCollection.doc(violationId);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  await docRef.delete();
  invalidateCache(); // Clear cache when violation deleted
  return true;
}

module.exports = {
  createViolation,
  getAllViolations,
  getViolationsByDevice,
  getViolationById,
  updateViolationStatus,
  getViolationStats,
  getViolationSummaryByBus,
  deleteViolation
};
