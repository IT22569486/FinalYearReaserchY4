const { Bus } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'buses';

async function seedBuses(db) {
  const buses = [
    new Bus({
      busId: 'NB-6544',
      capacity: 54,
      currentStop: 'Central Station',
      currentTrip: null,
      driverId: 'driver_001',
      location: { lat: 6.9271, lng: 79.8612 },
      occupancy: 22,
      routeId: 'route_001',
      status: 'Idle',
      createdAt: new Date()
    }).toFirestore(),
    new Bus({
      busId: 'NC-2201',
      capacity: 48,
      currentStop: 'North Terminal',
      currentTrip: null,
      driverId: 'driver_002',
      location: { lat: 6.9001, lng: 79.85 },
      occupancy: 15,
      routeId: 'route_002',
      status: 'Idle',
      createdAt: new Date()
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, buses);
}

module.exports = {
  seedBuses
};
