const { db } = require("../firebase");
const { Rating } = require("../models");
const ratingsCollection = db.collection("ratings");

// Submit a new rating
const submitRating = async (passengerId, tripId, busId, driverId, ratingData) => {
  const {
    driverRating,
    onTimeToStopRating,
    onTimeToDestinationRating,
    overallRating,
    comment
  } = ratingData;

  // Validate only provided ratings are between 1-5
  const ratings = [
    { name: 'driverRating', value: driverRating },
    { name: 'onTimeToStopRating', value: onTimeToStopRating },
    { name: 'onTimeToDestinationRating', value: onTimeToDestinationRating },
    { name: 'overallRating', value: overallRating },
  ];
  for (let rating of ratings) {
    if (rating.value === undefined || rating.value === null) continue;
    if (rating.value < 1 || rating.value > 5 || !Number.isInteger(rating.value)) {
      throw new Error(`${rating.name} must be an integer between 1 and 5`);
    }
  }

  const rating = new Rating({
    passengerId,
    tripId,
    busId,
    driverId,
    driverRating: driverRating ?? null,
    onTimeToStopRating: onTimeToStopRating ?? null,
    onTimeToDestinationRating: onTimeToDestinationRating ?? null,
    overallRating,
    comment: comment || '',
    createdAt: new Date(),
  });

  const docRef = await ratingsCollection.add(rating.toFirestore());
  return { id: docRef.id, ...rating.toFirestore() };
};

// Get all ratings for a bus
const getRatingsByBusId = async (busId) => {
  const snapshot = await ratingsCollection.where("busId", "==", busId).get();
  return snapshot.docs.map((doc) => {
    const rating = Rating.fromFirestore(doc);
    return { id: doc.id, ...rating.toFirestore() };
  });
};

// Get all ratings for a driver
const getRatingsByDriverId = async (driverId) => {
  const snapshot = await ratingsCollection.where("driverId", "==", driverId).get();
  return snapshot.docs.map((doc) => {
    const rating = Rating.fromFirestore(doc);
    return { id: doc.id, ...rating.toFirestore() };
  });
};

// Get all ratings by a passenger
const getRatingsByPassengerId = async (passengerId) => {
  const snapshot = await ratingsCollection.where("passengerId", "==", passengerId).get();
  return snapshot.docs.map((doc) => {
    const rating = Rating.fromFirestore(doc);
    return { id: doc.id, ...rating.toFirestore() };
  });
};

// Get rating for a specific trip
const getRatingByTripId = async (tripId) => {
  const snapshot = await ratingsCollection.where("tripId", "==", tripId).limit(1).get();
  if (snapshot.empty) return null;
  const rating = Rating.fromFirestore(snapshot.docs[0]);
  return { id: snapshot.docs[0].id, ...rating.toFirestore() };
};

// Calculate average ratings for a bus
const getAverageRatingsForBus = async (busId) => {
  const ratings = await getRatingsByBusId(busId);
  
  if (ratings.length === 0) {
    return null;
  }

  const averages = {
    busId,
    totalRatings: ratings.length,
    averageDriverRating: 0,
    averageOnTimeToStopRating: 0,
    averageOnTimeToDestinationRating: 0,
    averageOverallRating: 0,
  };

  let driverSum = 0, onTimeStopSum = 0, onTimeDestSum = 0, overallSum = 0;
  let driverCount = 0, onTimeStopCount = 0, onTimeDestCount = 0, overallCount = 0;

  ratings.forEach(rating => {
    if (typeof rating.driverRating === 'number') {
      driverSum += rating.driverRating;
      driverCount += 1;
    }
    if (typeof rating.onTimeToStopRating === 'number') {
      onTimeStopSum += rating.onTimeToStopRating;
      onTimeStopCount += 1;
    }
    if (typeof rating.onTimeToDestinationRating === 'number') {
      onTimeDestSum += rating.onTimeToDestinationRating;
      onTimeDestCount += 1;
    }
    if (typeof rating.overallRating === 'number') {
      overallSum += rating.overallRating;
      overallCount += 1;
    }
  });

  averages.averageDriverRating = driverCount ? (driverSum / driverCount).toFixed(2) : null;
  averages.averageOnTimeToStopRating = onTimeStopCount ? (onTimeStopSum / onTimeStopCount).toFixed(2) : null;
  averages.averageOnTimeToDestinationRating = onTimeDestCount ? (onTimeDestSum / onTimeDestCount).toFixed(2) : null;
  averages.averageOverallRating = overallCount ? (overallSum / overallCount).toFixed(2) : null;

  return averages;
};

// Calculate average ratings for a driver
const getAverageRatingsForDriver = async (driverId) => {
  const ratings = await getRatingsByDriverId(driverId);
  
  if (ratings.length === 0) {
    return null;
  }

  const averages = {
    driverId,
    totalRatings: ratings.length,
    averageDriverRating: 0,
    averageOnTimeToStopRating: 0,
    averageOnTimeToDestinationRating: 0,
    averageOverallRating: 0,
  };

  let driverSum = 0, onTimeStopSum = 0, onTimeDestSum = 0, overallSum = 0;
  let driverCount = 0, onTimeStopCount = 0, onTimeDestCount = 0, overallCount = 0;

  ratings.forEach(rating => {
    if (typeof rating.driverRating === 'number') {
      driverSum += rating.driverRating;
      driverCount += 1;
    }
    if (typeof rating.onTimeToStopRating === 'number') {
      onTimeStopSum += rating.onTimeToStopRating;
      onTimeStopCount += 1;
    }
    if (typeof rating.onTimeToDestinationRating === 'number') {
      onTimeDestSum += rating.onTimeToDestinationRating;
      onTimeDestCount += 1;
    }
    if (typeof rating.overallRating === 'number') {
      overallSum += rating.overallRating;
      overallCount += 1;
    }
  });

  averages.averageDriverRating = driverCount ? (driverSum / driverCount).toFixed(2) : null;
  averages.averageOnTimeToStopRating = onTimeStopCount ? (onTimeStopSum / onTimeStopCount).toFixed(2) : null;
  averages.averageOnTimeToDestinationRating = onTimeDestCount ? (onTimeDestSum / onTimeDestCount).toFixed(2) : null;
  averages.averageOverallRating = overallCount ? (overallSum / overallCount).toFixed(2) : null;

  return averages;
};

// Update a rating
const updateRating = async (ratingId, passengerId, updatedData) => {
  const ratingRef = ratingsCollection.doc(ratingId);
  const ratingDoc = await ratingRef.get();

  if (!ratingDoc.exists) {
    throw new Error('Rating not found');
  }

  if (ratingDoc.data().passengerId !== passengerId) {
    throw new Error('Not authorized to update this rating');
  }

  const updates = {};
  if (updatedData.driverRating) updates.driverRating = updatedData.driverRating;
  if (updatedData.onTimeToStopRating) updates.onTimeToStopRating = updatedData.onTimeToStopRating;
  if (updatedData.onTimeToDestinationRating) updates.onTimeToDestinationRating = updatedData.onTimeToDestinationRating;
  if (updatedData.overallRating) updates.overallRating = updatedData.overallRating;
  if (updatedData.comment) updates.comment = updatedData.comment;

  await ratingRef.update(updates);
  const updatedDoc = await ratingRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
};

// Delete a rating
const deleteRating = async (ratingId, passengerId) => {
  const ratingRef = ratingsCollection.doc(ratingId);
  const ratingDoc = await ratingRef.get();

  if (!ratingDoc.exists) {
    throw new Error('Rating not found');
  }

  if (ratingDoc.data().passengerId !== passengerId) {
    throw new Error('Not authorized to delete this rating');
  }

  await ratingRef.delete();
  return { message: 'Rating deleted successfully' };
};

module.exports = {
  submitRating,
  getRatingsByBusId,
  getRatingsByDriverId,
  getRatingsByPassengerId,
  getRatingByTripId,
  getAverageRatingsForBus,
  getAverageRatingsForDriver,
  updateRating,
  deleteRating,
};
