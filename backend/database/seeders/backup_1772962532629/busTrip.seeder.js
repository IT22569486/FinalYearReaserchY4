const { BusTrip } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'busTrips';

async function seedBusTrips(db) {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const busTrips = [
    new BusTrip({
      tripId: '0001',
      busId: 'NB-6544',
      routeId: 'route_001',
      driverId: 'driver_001',
      direction: 1,
      startTime: now,
      endTime: null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }).toFirestore(),
    new BusTrip({
      tripId: '0002',
      busId: 'NC-2201',
      routeId: 'route_002',
      driverId: 'driver_002',
      direction: -1,
      startTime: now,
      endTime: oneHourLater,
      status: 'completed',
      createdAt: now,
      updatedAt: oneHourLater
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, busTrips);
}

module.exports = {
  seedBusTrips
};
