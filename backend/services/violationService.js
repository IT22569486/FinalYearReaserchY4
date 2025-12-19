// services/violationService.js
// Violation tracking service using Firebase Firestore
const { db, admin } = require("../firebase");
const violationsCollection = db.collection("violations");

/**
 * Create a new violation
 */
async function createViolation(violationData) {
  const { deviceKey, type, details, ...rest } = violationData;
  
  const newViolation = {
    deviceKey,
    type,
    details: details || {},
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...rest
  };
  
  const docRef = await violationsCollection.add(newViolation);
  const doc = await docRef.get();
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
  getViolationById,
  updateViolationStatus,
  getViolationStats,
  deleteViolation
};
