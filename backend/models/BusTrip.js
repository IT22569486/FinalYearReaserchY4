/**
 * BusTrip Model
 * Represents a bus trip
 */

class BusTrip {
  constructor(data) {
    this.busId = data.busId || '';
    this.createdAt = data.createdAt || new Date();
    this.direction = data.direction || 1;
    this.driverId = data.driverId || '';
    this.endTime = data.endTime || null;
    this.routeId = data.routeId || '';
    this.startTime = data.startTime || new Date();
    this.status = data.status || 'active';
    this.tripId = data.tripId || '';
    this.updatedAt = data.updatedAt || new Date();
  }

  toFirestore() {
    return {
      busId: this.busId,
      createdAt: this.createdAt,
      direction: this.direction,
      driverId: this.driverId,
      endTime: this.endTime,
      routeId: this.routeId,
      startTime: this.startTime,
      status: this.status,
      tripId: this.tripId,
      updatedAt: this.updatedAt
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new BusTrip({
      id: doc.id,
      ...data
    });
  }
}

module.exports = BusTrip;
