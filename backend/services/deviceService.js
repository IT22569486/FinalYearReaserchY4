// services/deviceService.js
// Device monitoring service using Firebase Firestore
const { db, admin } = require("../firebase");
const devicesCollection = db.collection("devices");
const healthLogsCollection = db.collection("healthLogs");

/**
 * Get all devices
 */
async function getAllDevices() {
  const snapshot = await devicesCollection.orderBy("lastSeen", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get device by device key
 */
async function getDeviceByKey(deviceKey) {
  // Guard against undefined/null deviceKey
  if (!deviceKey) return null;

  const snapshot = await devicesCollection.where("deviceKey", "==", deviceKey).limit(1).get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Create or update device (auto-registration)
 */
async function upsertDevice(deviceData) {
  let { deviceKey, busNumber, routeNumber, ...rest } = deviceData;

  // Filter out undefined values from rest object
  const filteredRest = Object.fromEntries(
    Object.entries(rest).filter(([_, value]) => value !== undefined)
  );

  // Generate deviceKey if not provided (e.g., from dashboard registration)
  if (!deviceKey) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    deviceKey = `CTB-DASHBOARD-${timestamp}-${random}`;
  }

  // Check if device exists
  const existing = await getDeviceByKey(deviceKey);

  if (existing) {
    // Update existing device
    await devicesCollection.doc(existing.id).update({
      ...filteredRest,
      busNumber: busNumber || existing.busNumber,
      routeNumber: routeNumber || existing.routeNumber,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updated = await devicesCollection.doc(existing.id).get();
    return { id: existing.id, ...updated.data() };
  } else {
    // Create new device
    const newDevice = {
      deviceKey,
      busNumber: busNumber || 'UNKNOWN',
      routeNumber: routeNumber || 'UNKNOWN',
      status: 'offline',
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...filteredRest
    };
    const docRef = await devicesCollection.add(newDevice);
    const doc = await docRef.get();
    return { id: docRef.id, ...doc.data() };
  }
}

/**
 * Update device status
 */
async function updateDeviceStatus(deviceKey, status) {
  const device = await getDeviceByKey(deviceKey);
  if (!device) return null;

  await devicesCollection.doc(device.id).update({
    status,
    lastSeen: admin.firestore.FieldValue.serverTimestamp()
  });

  const updated = await devicesCollection.doc(device.id).get();
  return { id: device.id, ...updated.data() };
}

/**
 * Update device health data
 */
async function updateDeviceHealth(deviceKey, healthData) {
  const device = await getDeviceByKey(deviceKey);
  if (!device) {
    // Auto-register device if not exists
    return await upsertDevice({
      deviceKey,
      ...healthData,
      status: 'online'
    });
  }

  // Update device with health data
  await devicesCollection.doc(device.id).update({
    ...healthData,
    status: 'online',
    lastSeen: admin.firestore.FieldValue.serverTimestamp()
  });

  // Log health data
  await healthLogsCollection.add({
    deviceKey,
    deviceId: device.id,
    ...healthData,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  const updated = await devicesCollection.doc(device.id).get();
  return { id: device.id, ...updated.data() };
}

/**
 * Get device health logs
 */
async function getDeviceHealthLogs(deviceKey, limit = 100) {
  // Simple query without orderBy to avoid index requirement
  const snapshot = await healthLogsCollection
    .where("deviceKey", "==", deviceKey)
    .limit(limit * 2) // Get more to sort in memory
    .get();

  // Sort in memory and limit
  const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return logs
    .sort((a, b) => {
      const timeA = a.timestamp?._seconds || 0;
      const timeB = b.timestamp?._seconds || 0;
      return timeB - timeA;
    })
    .slice(0, limit);
}

/**
 * Delete device
 */
async function deleteDevice(deviceKey) {
  const device = await getDeviceByKey(deviceKey);
  if (!device) return null;

  await devicesCollection.doc(device.id).delete();
  return true;
}

/**
 * Get online devices count
 */
async function getOnlineDevicesCount() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const snapshot = await devicesCollection
    .where("lastSeen", ">=", fiveMinutesAgo)
    .get();
  return snapshot.size;
}

module.exports = {
  getAllDevices,
  getDeviceByKey,
  upsertDevice,
  updateDeviceStatus,
  updateDeviceHealth,
  getDeviceHealthLogs,
  deleteDevice,
  getOnlineDevicesCount
};
