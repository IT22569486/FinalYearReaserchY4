const { seedUsers } = require('./user.seeder');
const { seedRoutes } = require('./route.seeder');
const { seedBuses } = require('./bus.seeder');
const { seedTrips } = require('./trip.seeder');
const { seedRatings } = require('./rating.seeder');
const { seedNotifications } = require('./notification.seeder');
const { seedBusTrips } = require('./busTrip.seeder');
const { seedBusTripRecords } = require('./busTripRecord.seeder');

module.exports = {
  seedUsers,
  seedRoutes,
  seedBuses,
  seedTrips,
  seedRatings,
  seedNotifications,
  seedBusTrips,
  seedBusTripRecords
};
