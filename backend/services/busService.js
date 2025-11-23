// services/busService.js
const { db } = require("../firebase"); // Firestore instance
const busesCollection = db.collection("buses");

async function getAllBuses() {
  const snapshot = await busesCollection.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getBusByBusId(busId) {
  const snapshot = await busesCollection.where("busId", "==", busId).get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
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
  return { id: bus.id, ...updatedBus.data() };
}

async function updateBusOccupancy(busId, occupancy) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update({ occupancy });
  const updatedBus = await busesCollection.doc(bus.id).get();
  return { id: bus.id, ...updatedBus.data() };
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
