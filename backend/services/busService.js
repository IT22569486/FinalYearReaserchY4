// services/busService.js
const { db } = require("../firebase"); // Firestore instance
const { Bus } = require("../modelsN");
const busesCollection = db.collection("buses");

async function getAllBuses() {
  const snapshot = await busesCollection.get();
  return snapshot.docs.map(doc => {
    const bus = Bus.fromFirestore(doc);
    return { id: doc.id, ...bus.toFirestore() };
  });
}

async function getBusByBusId(busId) {
  const snapshot = await busesCollection.where("busId", "==", busId).get();
  if (snapshot.empty) return null;
  const bus = Bus.fromFirestore(snapshot.docs[0]);
  return { id: snapshot.docs[0].id, ...bus.toFirestore() };
}

async function createBus(busData) {
  const bus = new Bus({
    ...busData,
    occupancy: 0,
    createdAt: new Date(),
  });
  const docRef = await db.collection("buses").add(bus.toFirestore());
  const savedBus = await docRef.get();
  const busObj = Bus.fromFirestore(savedBus);
  return { id: docRef.id, ...busObj.toFirestore() };
}

async function updateBusLocation(busId, location) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update({ location });
  const updatedBus = await busesCollection.doc(bus.id).get();
  const busObj = Bus.fromFirestore(updatedBus);
  return { id: bus.id, ...busObj.toFirestore() };
}

async function updateBusOccupancy(busId, occupancy) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update({ occupancy });
  const updatedBus = await busesCollection.doc(bus.id).get();
  const busObj = Bus.fromFirestore(updatedBus);
  return { id: bus.id, ...busObj.toFirestore() };
}

async function updateBus(busId, updates) {
  const bus = await getBusByBusId(busId);
  if (!bus) return null;

  await busesCollection.doc(bus.id).update(updates);
  const updatedBus = await busesCollection.doc(bus.id).get();
  const busObj = Bus.fromFirestore(updatedBus);
  return { id: bus.id, ...busObj.toFirestore() };
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
