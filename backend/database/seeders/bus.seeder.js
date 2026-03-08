const { Bus } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'buses';

async function seedBuss(db) {
  const data = [
    // Document ID: 89Mjdm1o9DAupeQlhumG
    {
      busId: 'Bus001',
      busNumber: 'Bus001',
      routeId: 'ROUTE001',
      routeNumber: 'ROUTE001',
      capacity: 60,
      status: 'active',
      location: {
        lat: 0,
        lng: 0,
        latitude: 0,
        longitude: 0
      },
      speed: 0,
      createdAt: '2026-03-08T09:29:42.482Z',
      occupancy: 4,
      updatedAt: '2026-03-08T09:35:33.273Z'
    },

    // Document ID: NA-225566
    {
      busId: 'NA-225566',
      location_name: 'Unknown',
      road_condition: 'Dry',
      status: 'online',
      createdAt: { _seconds: 1772955402, _nanoseconds: 795000000 },
      temperature: 30,
      humidity: 75,
      safe_speed: 40,
      currentTrip: '9999',
      direction: 'Kaduwela_to_Kollupitiya',
      occupancy: 17,
      passenger_load_kg: 1020,
      latitude: 6.925070248,
      last_update: '2026-03-08T08:46:13.556Z',
      location: {
        lat: 6.925070248,
        lng: 79.97862329
      },
      longitude: 79.97862329,
      updatedAt: { _seconds: 1772959574, _nanoseconds: 48000000 },
      routeId: 'C3bFJjjZI2MFc7ZFpX5b'
    },

    // Document ID: XxC2QG9HCkovHvZgYshp
    {
      createdAt: '2026-03-08T09:29:42.379546',
      status: 'active',
      location: {
        lat: 0,
        latitude: 0,
        lng: 0,
        longitude: 0
      },
      capacity: 60,
      busNumber: 'Bus001',
      busId: 'Bus001',
      routeNumber: 'ROUTE001',
      speed: 0,
      updatedAt: '2026-03-08T09:29:42.379546',
      routeId: 'ROUTE001',
      occupancy: 1
    },

    // Document ID: ZuV0TpySemgyky0JS6Bt
    {
      driverId: '60d5f484f1a2b3c4d5e6f790',
      capacity: 35,
      createdAt: { _seconds: 1764612505, _nanoseconds: 859000000 },
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      location: {
        lat: '6.9111484',
        lng: '79.8491726'
      },
      busId: 'NB-6544',
      currentTrip: '0092',
      status: 'Running',
      occupancy: 5,
      currentStop: 'Koswatta'
    },

    // Document ID: boAJz9aLzGuiWKhBg4Nu
    {
      busId: 'Bjggjj',
      occupancy: 0,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      capacity: 35,
      status: 'maintenance',
      location: {
        lat: '6.92713',
        lng: '79.8612'
      },
      createdAt: { _seconds: 1763664562, _nanoseconds: 372000000 },
      routeId: 'nEECnlYy3Z5aJhaolNF4'
    },

    // Document ID: ru2qbY6uB4myoT4BsDeL
    {
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      occupancy: 0,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      capacity: 35,
      status: 'Running',
      location: {
        lat: '6.92713',
        lng: '79.8612'
      },
      createdAt: { _seconds: 1771955839, _nanoseconds: 88000000 },
      busId: 'NB-9344',
      currentTrip: '553'
    },

    // Document ID: xS9oeVimiApJbRhqshbe
    {
      busId: 'Bjjj',
      routeId: '687d415fcded236ade57f8f3',
      occupancy: 0,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      capacity: 35,
      status: 'maintenance',
      createdAt: { _seconds: 1763662400, _nanoseconds: 394000000 },
      location: {
        lat: '6.92713',
        lng: '79.5612'
      }
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedBuss
};
