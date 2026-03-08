const admin = require("firebase-admin");
const db = admin.firestore();
const { BusTrip } = require("../modelsN");

const COLLECTION = "busTrips";
const COUNTER_COLLECTION = "counters";
const COUNTER_DOC = "tripIdCounter";

// Helper function to get next trip ID
const getNextTripId = async () => {
    const counterRef = db.collection(COUNTER_COLLECTION).doc(COUNTER_DOC);
    
    return db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextId = 1;
        if (counterDoc.exists) {
            nextId = (counterDoc.data().lastTripId || 0) + 1;
        }
        
        // Update the counter
        transaction.set(counterRef, { lastTripId: nextId }, { merge: true });
        
        // Return zero-padded tripId (e.g., "0001", "0002", etc.)
        return nextId.toString().padStart(4, '0');
    });
};

// Create new trip
exports.createTrip = async (tripData) => {
    // Generate sequential tripId
    const tripId = await getNextTripId();
    
    const busTrip = new BusTrip({
        ...tripData,
        tripId: tripId,
        status: tripData.status || "scheduled",
        createdAt: new Date()
    });
    
    const docRef = await db.collection(COLLECTION).add(busTrip.toFirestore());

    const doc = await docRef.get();
    const trip = BusTrip.fromFirestore(doc);
    return { id: doc.id, ...trip.toFirestore() };
};

// Get all trips
exports.getAllTrips = async () => {
    const snapshot = await db.collection(COLLECTION)
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map(doc => {
        const trip = BusTrip.fromFirestore(doc);
        return { id: doc.id, ...trip.toFirestore() };
    });
};

// Get trip by ID (query by tripId field)
exports.getTripById = async (tripId) => {
    const snapshot = await db.collection(COLLECTION)
        .where("tripId", "==", tripId)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const trip = BusTrip.fromFirestore(doc);
    return { id: doc.id, ...trip.toFirestore() };
};

// Get trips by busId
exports.getTripsByBusId = async (busId) => {
    const snapshot = await db.collection(COLLECTION)
        .where("busId", "==", busId)
        .get();

    return snapshot.docs.map(doc => {
        const trip = BusTrip.fromFirestore(doc);
        return { id: doc.id, ...trip.toFirestore() };
    });
};

// Get trips by routeId
exports.getTripsByRouteId = async (routeId) => {
    const snapshot = await db.collection(COLLECTION)
        .where("routeId", "==", routeId)
        .get();

    return snapshot.docs.map(doc => {
        const trip = BusTrip.fromFirestore(doc);
        return { id: doc.id, ...trip.toFirestore() };
    });
};

// Get trips by driverId
exports.getTripsByDriverId = async (driverId) => {
    const snapshot = await db.collection(COLLECTION)
        .where("driverId", "==", driverId)
        .get();

    return snapshot.docs.map(doc => {
        const trip = BusTrip.fromFirestore(doc);
        return { id: doc.id, ...trip.toFirestore() };
    });
};

// Update trip
exports.updateTrip = async (tripId, updateData) => {
    // Find the document by tripId field
    const snapshot = await db.collection(COLLECTION)
        .where("tripId", "==", tripId)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const docRef = snapshot.docs[0].ref;

    await docRef.update({
        ...updateData,
        updatedAt: new Date()
    });

    const updatedDoc = await docRef.get();
    const trip = BusTrip.fromFirestore(updatedDoc);

    return {
        id: updatedDoc.id,
        ...trip.toFirestore()
    };
};

// Delete trip
exports.deleteTrip = async (tripId) => {
    // Find the document by tripId field
    const snapshot = await db.collection(COLLECTION)
        .where("tripId", "==", tripId)
        .limit(1)
        .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
};

// Start trip
exports.startTrip = async (tripId) => {
    return exports.updateTrip(tripId, {
        status: "active",
        startTime: new Date()
    });
};

// End trip
exports.endTrip = async (tripId) => {
    return exports.updateTrip(tripId, {
        status: "completed",
        endTime: new Date()
    });
};