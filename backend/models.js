// models.js — Firestore model classes

class User {
  constructor(data = {}) {
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.mobileNo = data.mobileNo || '';
    this.nic = data.nic || '';
    this.dob = data.dob || '';
    this.bloodGroup = data.bloodGroup || '';
    this.role = data.role || 'passenger';
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      mobileNo: this.mobileNo,
      nic: this.nic,
      dob: this.dob,
      bloodGroup: this.bloodGroup,
      role: this.role,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new User({ ...data });
  }
}

class Bus {
  constructor(data = {}) {
    this.busId = data.busId || data.vehicle_id || '';
    this.routeId = data.routeId || data.route_id || '';
    this.driverId = data.driverId || '';
    this.busNumber = data.busNumber || data.busId || data.vehicle_id || '';
    this.capacity = data.capacity || 50;
    this.occupancy = data.occupancy || data.passenger_count || 0;
    this.status = data.status || 'unknown';
    this.currentStop = data.currentStop || '';
    this.currentTrip = data.currentTrip || '';
    this.location = data.location || null;
    this.latitude = data.latitude || 0;
    this.longitude = data.longitude || 0;
    this.safe_speed = data.safe_speed || 0;
    this.road_condition = data.road_condition || 'Dry';
    this.direction = data.direction || '';
    this.location_name = data.location_name || '';
    this.temperature = data.temperature || 0;
    this.humidity = data.humidity || 0;
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      busId: this.busId,
      routeId: this.routeId,
      driverId: this.driverId,
      busNumber: this.busNumber,
      capacity: this.capacity,
      occupancy: this.occupancy,
      status: this.status,
      currentStop: this.currentStop,
      currentTrip: this.currentTrip,
      location: this.location,
      latitude: this.latitude,
      longitude: this.longitude,
      safe_speed: this.safe_speed,
      road_condition: this.road_condition,
      direction: this.direction,
      location_name: this.location_name,
      temperature: this.temperature,
      humidity: this.humidity,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Bus({ ...data });
  }
}

class Trip {
  constructor(data = {}) {
    this.passengerId = data.passengerId || '';
    this.busId = data.busId || '';
    this.startTime = data.startTime || null;
    this.endTime = data.endTime || null;
    this.departure = data.departure || '';
    this.destination = data.destination || '';
    this.currentLocation = data.currentLocation || null;
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      passengerId: this.passengerId,
      busId: this.busId,
      startTime: this.startTime,
      endTime: this.endTime,
      departure: this.departure,
      destination: this.destination,
      currentLocation: this.currentLocation,
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Trip({ ...data });
  }
}

class Route {
  constructor(data = {}) {
    this.name = data.name || '';
    this.path = data.path || [];
    this.stops = data.stops || [];
    this.googleMapsUrl = data.googleMapsUrl || '';
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      name: this.name,
      path: this.path,
      stops: this.stops,
      googleMapsUrl: this.googleMapsUrl,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Route({ ...data });
  }
}

class Rating {
  constructor(data = {}) {
    this.passengerId = data.passengerId || '';
    this.tripId = data.tripId || '';
    this.busId = data.busId || '';
    this.driverId = data.driverId || '';
    this.safetyRating = data.safetyRating || 0;
    this.comfortRating = data.comfortRating || 0;
    this.punctualityRating = data.punctualityRating || 0;
    this.comment = data.comment || '';
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      passengerId: this.passengerId,
      tripId: this.tripId,
      busId: this.busId,
      driverId: this.driverId,
      safetyRating: this.safetyRating,
      comfortRating: this.comfortRating,
      punctualityRating: this.punctualityRating,
      comment: this.comment,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Rating({ ...data });
  }
}

class Notification {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.type = data.type || '';
    this.title = data.title || '';
    this.message = data.message || '';
    this.priority = data.priority || 'normal';
    this.read = data.read || false;
    this.busId = data.busId || '';
    this.busNumber = data.busNumber || '';
    this.latitude = data.latitude || null;
    this.longitude = data.longitude || null;
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      priority: this.priority,
      read: this.read,
      busId: this.busId,
      busNumber: this.busNumber,
      latitude: this.latitude,
      longitude: this.longitude,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Notification({ ...data });
  }
}

class BusTrip {
  constructor(data = {}) { this._data = { ...data }; }
  toFirestore() { return { ...this._data }; }
  static fromFirestore(doc) { return new BusTrip(doc.data()); }
}

class BusTripRecord {
  constructor(data = {}) { this._data = { ...data }; }
  toFirestore() { return { ...this._data }; }
  static fromFirestore(doc) { return new BusTripRecord(doc.data()); }
}

module.exports = { User, Bus, Trip, Route, Rating, Notification, BusTrip, BusTripRecord };
