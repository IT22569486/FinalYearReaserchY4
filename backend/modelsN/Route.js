/**
 * Route Model
 * Represents a bus route with stops and path information
 */

class Route {
  constructor(data) {
    this.createdAt = data.createdAt || { _nanoseconds: 0, _seconds: 0 };
    this.googleMapsUrl = data.googleMapsUrl || '';
    this.name = data.name || '';
    this.path = data.path || []; // Array of { lat, lng, stopName }
    this.stops = data.stops || []; // Array of stop names
  }

  toFirestore() {
    return {
      createdAt: this.createdAt,
      googleMapsUrl: this.googleMapsUrl,
      name: this.name,
      path: this.path,
      stops: this.stops
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Route({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Route;
