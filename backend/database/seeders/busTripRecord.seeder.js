const { BusTripRecord } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'bus_trip_records';

async function seedBusTripRecords(db) {
  const stamp = new Date().toISOString();

  const records = [
    new BusTripRecord({
      Trip_ID: '0001',
      Trip_Start_Time: stamp,
      busID: 'NB-6544',
      Route: 'City Loop A',
      Origin: 'Central Station',
      Destination: 'Main Hospital',
      Boarding: 12,
      Alighting: 4,
      Distance_km: 8.6,
      Stamp: stamp,
      day_type: 'weekday',
      holiday_type: 'none',
      routeId: 'route_001',
      createdAt: new Date()
    }).toFirestore(),
    new BusTripRecord({
      Trip_ID: '0002',
      Trip_Start_Time: stamp,
      busID: 'NC-2201',
      Route: 'City Loop B',
      Origin: 'North Terminal',
      Destination: 'Depot',
      Boarding: 9,
      Alighting: 7,
      Distance_km: 10.2,
      Stamp: stamp,
      day_type: 'weekday',
      holiday_type: 'none',
      routeId: 'route_002',
      createdAt: new Date()
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, records);
}

module.exports = {
  seedBusTripRecords
};
