const { db } = require("../firebase");
const { Trip } = require("../modelsN");
const tripsCollection = db.collection("trips");

const startTrip = async (passengerId, tripData) => {
  const { busId, departure, destination } = tripData;
  const trip = new Trip({
    passengerId,
    busId,
    startTime: new Date(),
    departure,
    destination,
    currentLocation: departure,
    status: "active",
  });

  const docRef = await tripsCollection.add(trip.toFirestore());
  return { id: docRef.id, ...trip.toFirestore() };
};

const getTripsByPassengerId = async (passengerId) => {
  const snapshot = await tripsCollection.where("passengerId", "==", passengerId).get();
  return snapshot.docs.map((doc) => {
    const trip = Trip.fromFirestore(doc);
    return { id: doc.id, ...trip.toFirestore() };
  });
};

const getActiveTripByPassengerId = async (passengerId) => {
  const snapshot = await tripsCollection
    .where("passengerId", "==", passengerId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  const trip = Trip.fromFirestore(snapshot.docs[0]);
  return { id: snapshot.docs[0].id, ...trip.toFirestore() };
};

const updateTripLocation = async (tripId, passengerId, currentLocation) => {
  const tripRef = tripsCollection.doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists || tripDoc.data().passengerId !== passengerId || tripDoc.data().status !== "active") {
    return null; 
  }

  await tripRef.update({ currentLocation });
  return { id: tripId, ...tripDoc.data(), currentLocation };
};

const endTrip = async (tripId, passengerId) => {
  const tripRef = tripsCollection.doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists || tripDoc.data().passengerId !== passengerId || tripDoc.data().status !== "active") {
    return null;
  }

  const updates = { status: "completed", endTime: new Date() };
  await tripRef.update(updates);
  return { id: tripId, ...tripDoc.data(), ...updates };
};

const cancelTrip = async (tripId, passengerId) => {
  const tripRef = tripsCollection.doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists || tripDoc.data().passengerId !== passengerId || tripDoc.data().status !== "active") {
    return null;
  }

  const updates = { status: "cancelled" };
  await tripRef.update(updates);
  return { id: tripId, ...tripDoc.data(), ...updates };
};

module.exports = {
  startTrip,
  getTripsByPassengerId,
  getActiveTripByPassengerId,
  updateTripLocation,
  endTrip,
  cancelTrip,
};