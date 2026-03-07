const { db } = require('../../firebase');
const {
  seedUsers,
  seedRoutes,
  seedBuses,
  seedTrips,
  seedRatings,
  seedNotifications,
  seedBusTrips,
  seedBusTripRecords
} = require('./index');

async function runAllSeeders() {
  const results = [];

  results.push({ name: 'users', count: await seedUsers(db) });
  results.push({ name: 'routes', count: await seedRoutes(db) });
  results.push({ name: 'buses', count: await seedBuses(db) });
  results.push({ name: 'busTrips', count: await seedBusTrips(db) });
  results.push({ name: 'trips', count: await seedTrips(db) });
  results.push({ name: 'ratings', count: await seedRatings(db) });
  results.push({ name: 'notifications', count: await seedNotifications(db) });
  results.push({ name: 'bus_trip_records', count: await seedBusTripRecords(db) });

  console.log('Seed summary:');
  results.forEach((item) => {
    console.log(`- ${item.name}: ${item.count}`);
  });
}

if (require.main === module) {
  runAllSeeders()
    .then(() => {
      console.log('Seeding completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllSeeders
};
