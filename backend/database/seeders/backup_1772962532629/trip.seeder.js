const { Trip } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'trips';

async function seedTrips(db) {
  const trips = [
    new Trip({
      busId: 'NB-6544',
      currentLocation: 'Town Hall',
      departure: 'Central Station',
      destination: 'Main Hospital',
      passengerId: 'passenger_001',
      startTime: new Date(),
      status: 'active'
    }).toFirestore(),
    new Trip({
      busId: 'NC-2201',
      currentLocation: 'University',
      departure: 'North Terminal',
      destination: 'Depot',
      passengerId: 'passenger_002',
      startTime: new Date(),
      status: 'active'
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, trips);
}

module.exports = {
  seedTrips
};
