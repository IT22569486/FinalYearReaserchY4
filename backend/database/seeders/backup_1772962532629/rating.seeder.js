const { Rating } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'ratings';

async function seedRatings(db) {
  const ratings = [
    new Rating({
      busId: 'NB-6544',
      driverId: 'driver_001',
      passengerId: 'passenger_001',
      tripId: '0001',
      overallRating: 4,
      driverRating: 5,
      onTimeToStopRating: 4,
      onTimeToDestinationRating: 3,
      comment: 'Comfortable ride and polite driver.',
      createdAt: new Date()
    }).toFirestore(),
    new Rating({
      busId: 'NC-2201',
      driverId: 'driver_002',
      passengerId: 'passenger_002',
      tripId: '0002',
      overallRating: 5,
      driverRating: 5,
      onTimeToStopRating: 5,
      onTimeToDestinationRating: 5,
      comment: 'Very punctual service.',
      createdAt: new Date()
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, ratings);
}

module.exports = {
  seedRatings
};
