// services/violationService.js
// Violation tracking service using Firebase Firestore
const { db, admin } = require("../firebase");
const violationsCollection = db.collection("violations");

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
  return { id: docRef.id, ...doc.data() };
}

/**
 * Get all violations — no composite index needed (filter in memory)
 */
async function getAllViolations(filters = {}) {
  let query = violationsCollection;

  // Apply single-field filters only (avoids composite index requirement)
  if (filters.deviceKey) {
    query = query.where("deviceKey", "==", filters.deviceKey);
  } else if (filters.type) {
    query = query.where("type", "==", filters.type);
  } else if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.get();
  let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // In-memory filtering for remaining filters
  if (filters.deviceKey && filters.type) results = results.filter(r => r.type === filters.type);
  if (filters.deviceKey && filters.status) results = results.filter(r => r.status === filters.status);

  // Sort newest first
  results.sort((a, b) => {
    const ta = a.createdAt?._seconds || a.createdAt?.seconds || 0;
    const tb = b.createdAt?._seconds || b.createdAt?.seconds || 0;
    return tb - ta;
  });

  if (filters.limit) results = results.slice(0, filters.limit);
  return results;
}

/**
 * Get violations by device key — with pagination support
 */
async function getViolationsByDevice(deviceKey, limit = 50, page = 1) {
  const snapshot = await violationsCollection
    .where("deviceKey", "==", deviceKey)
    .get();

  const allViolations = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const timeA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const timeB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  const total = allViolations.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  const violations = allViolations.slice(start, start + limit);

  return { violations, total, page: safePage, totalPages };
}

/**
 * Get violations grouped by bus for the summary page
 */
async function getSummaryByBus() {
  const snapshot = await violationsCollection.get();

  const busMap = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime() / 1000;

  snapshot.docs.forEach(doc => {
    const v = { id: doc.id, ...doc.data() };
    const key = v.deviceKey || v.busNumber || 'UNKNOWN';

    if (!busMap[key]) {
      busMap[key] = {
        deviceKey: v.deviceKey || '',
        busNumber: v.busNumber || v.deviceKey || 'UNKNOWN',
        routeNumber: v.routeNumber || '',
        totalViolations: 0,
        todayCount: 0,
        pendingCount: 0,
        byType: {},
        bySeverity: {},
        latestViolation: null,
        latestTimestamp: 0,
      };
    }

    const entry = busMap[key];
    entry.totalViolations++;

    const vTs = v.createdAt?._seconds || v.createdAt?.seconds || 0;
    if (vTs >= todayTs) entry.todayCount++;
    if (v.status === 'pending') entry.pendingCount++;

    const t = v.type || 'UNKNOWN';
    entry.byType[t] = (entry.byType[t] || 0) + 1;

    const sev = v.severity || 'MEDIUM';
    entry.bySeverity[sev] = (entry.bySeverity[sev] || 0) + 1;

    if (vTs > entry.latestTimestamp) {
      entry.latestTimestamp = vTs;
      entry.latestViolation = { id: v.id, type: t, severity: sev, createdAt: v.createdAt };
    }
  });

  return Object.values(busMap).sort((a, b) => b.totalViolations - a.totalViolations);
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

  return stats;
}

/**
 * Delete violation
 */
async function deleteViolation(violationId) {
  const docRef = violationsCollection.doc(violationId);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  await docRef.delete();
  return true;
}

module.exports = {
  createViolation,
  getAllViolations,
  getViolationsByDevice,
  getSummaryByBus,
  getViolationById,
  updateViolationStatus,
  getViolationStats,
  deleteViolation
};
