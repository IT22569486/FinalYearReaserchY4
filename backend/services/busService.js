// services/busService.js
const { db } = require("../firebase"); // Firestore instance
const busesCollection = db.collection("fleet_buses");

// Normalize fleet_buses doc into a shape the frontend expects
function normalizeBus(id, data) {
  // fleet_buses stores lat/lng as top-level latitude/longitude
  const lat = data.latitude || data.location?.latitude || data.location?.lat || null;
  const lng = data.longitude || data.location?.longitude || data.location?.lng || null;
  return {
    id,
    busId: id,
    busNumber: id,
    vehicle_id: id,
    routeNumber: data.route_id || data.routeNumber || null,
    route_id: data.route_id || null,
    status: data.status || 'unknown',
    occupancy: data.passenger_count || data.occupancy || 0,
    capacity: data.capacity || 100,
    speed: data.safe_speed || data.speed || 0,
    // Provide location in both formats for compatibility
    location: lat != null ? { lat, lng, latitude: lat, longitude: lng } : null,
    latitude: lat,
    longitude: lng,
    ...data,
  };
}

async function getAllBuses() {
  const snapshot = await busesCollection.get();
  return snapshot.docs.map(doc => normalizeBus(doc.id, doc.data()));
}

async function getBusByBusId(busId) {
  // Doc ID in fleet_buses IS the vehicle_id
  const docRef = await busesCollection.doc(busId).get();
  if (docRef.exists) return normalizeBus(docRef.id, docRef.data());
  // Fallback: search by vehicle_id field
  const snapshot = await busesCollection.where("vehicle_id", "==", busId).limit(1).get();
  if (snapshot.empty) return null;
  return normalizeBus(snapshot.docs[0].id, snapshot.docs[0].data());
}

async function createBus(busData) {
  const newBus = {
    ...busData,
    occupancy: 0,
    createdAt: new Date(),
  };
  const docRef = await db.collection("buses").add(newBus);
  const bus = await docRef.get();
  return { id: docRef.id, ...bus.data() };
}

async function updateBusLocation(busId, location) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update({ location });
  const updatedBus = await busesCollection.doc(bus.id).get();
  return { id: bus.id, busId: bus.id, busNumber: bus.id, ...updatedBus.data() };
}

async function updateBusOccupancy(busId, occupancy) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update({ occupancy });
  const updatedBus = await busesCollection.doc(bus.id).get();
  return { id: bus.id, busId: bus.id, busNumber: bus.id, ...updatedBus.data() };
}

async function updateBus(busId, updates) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update(updates);
  const updatedBus = await busesCollection.doc(bus.id).get();
  return { id: bus.id, ...updatedBus.data() };
}

async function deleteBus(busId) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).delete();
  return true;
}

module.exports = {
  getAllBuses,
  getBusByBusId,
  createBus,
  updateBusLocation,
  updateBusOccupancy,
  updateBus,
  deleteBus,
};
