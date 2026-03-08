/**
 * Rating Model
 * Represents a rating/review for a bus trip
 */

class Rating {
  constructor(data) {
    this.busId = data.busId || '';
    this.comment = data.comment || '';
    this.createdAt = data.createdAt || new Date();
    this.driverId = data.driverId || '';
    this.driverRating = data.driverRating || null;
    this.onTimeToDestinationRating = data.onTimeToDestinationRating || null;
    this.onTimeToStopRating = data.onTimeToStopRating || null;
    this.overallRating = data.overallRating || 0;
    this.passengerId = data.passengerId || '';
    this.tripId = data.tripId || '';
  }

  toFirestore() {
    return {
      busId: this.busId,
      comment: this.comment,
      createdAt: this.createdAt,
      driverId: this.driverId,
      driverRating: this.driverRating,
      onTimeToDestinationRating: this.onTimeToDestinationRating,
      onTimeToStopRating: this.onTimeToStopRating,
      overallRating: this.overallRating,
      passengerId: this.passengerId,
      tripId: this.tripId
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Rating({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Rating;
