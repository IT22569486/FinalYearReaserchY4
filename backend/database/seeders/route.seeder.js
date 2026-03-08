const { Route } = require('../../models');
const { seedCollection } = require('./helpers');

const COLLECTION = 'routes';

async function seedRoutes(db) {
  const routes = [
    new Route({
      name: 'City Loop A',
      googleMapsUrl: 'https://maps.google.com/?q=6.9271,79.8612',
      stops: ['Central Station', 'Town Hall', 'Museum Stop', 'Main Hospital'],
      path: [
        { lat: 6.9271, lng: 79.8612, stopName: 'Central Station' },
        { lat: 6.9199, lng: 79.8648, stopName: 'Town Hall' },
        { lat: 6.9147, lng: 79.9729, stopName: 'Museum Stop' },
        { lat: 6.9095, lng: 79.8892, stopName: 'Main Hospital' }
      ],
      createdAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 }
    }).toFirestore(),
    new Route({
      name: 'City Loop B',
      googleMapsUrl: 'https://maps.google.com/?q=6.9001,79.8500',
      stops: ['North Terminal', 'University', 'Market', 'Depot'],
      path: [
        { lat: 6.9001, lng: 79.85, stopName: 'North Terminal' },
        { lat: 6.892, lng: 79.8721, stopName: 'University' },
        { lat: 6.8876, lng: 79.9011, stopName: 'Market' },
        { lat: 6.8784, lng: 79.8899, stopName: 'Depot' }
      ],
      createdAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 }
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, routes);
}

module.exports = {
  seedRoutes
};
