/**
 * Trip Model
 * Represents a passenger's trip
 */

class Trip {
  constructor(data) {
    this.busId = data.busId || '';
    this.currentLocation = data.currentLocation || '';
    this.departure = data.departure || '';
    this.destination = data.destination || '';
    this.passengerId = data.passengerId || '';
    this.startTime = data.startTime || new Date();
    this.status = data.status || 'active';
  }

  toFirestore() {
    return {
      busId: this.busId,
      currentLocation: this.currentLocation,
      departure: this.departure,
      destination: this.destination,
      passengerId: this.passengerId,
      startTime: this.startTime,
      status: this.status
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Trip({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Trip;
