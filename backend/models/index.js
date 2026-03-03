/**
 * Models Index
 * Central export point for all models
 */

const User = require('./User');
const Trip = require('./Trip');
const Route = require('./Route');
const Rating = require('./Rating');
const Notification = require('./Notification');
const Bus = require('./Bus');
const BusTrip = require('./BusTrip');
const BusTripRecord = require('./BusTripRecord');

module.exports = {
  User,
  Trip,
  Route,
  Rating,
  Notification,
  Bus,
  BusTrip,
  BusTripRecord
};
