/**
 * Bus Model
 * Represents a bus in the system
 */

class Bus {
  constructor(data) {
    this.busId = data.busId || '';
    this.capacity = data.capacity || 0;
    this.createdAt = data.createdAt || new Date();
    this.currentStop = data.currentStop || '';
    this.currentTrip = data.currentTrip || null;
    this.driverId = data.driverId || '';
    this.location = data.location || { lat: '', lng: '' };
    this.occupancy = data.occupancy || 0;
    this.routeId = data.routeId || '';
    this.status = data.status || 'Idle';
  }

  toFirestore() {
    return {
      busId: this.busId,
      capacity: this.capacity,
      createdAt: this.createdAt,
      currentStop: this.currentStop,
      currentTrip: this.currentTrip,
      driverId: this.driverId,
      location: this.location,
      occupancy: this.occupancy,
      routeId: this.routeId,
      status: this.status
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Bus({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Bus;
