const { Notification } = require('../../models');
const { seedCollection } = require('./helpers');

const COLLECTION = 'notifications';

async function seedNotifications(db) {
  const notifications = [
    new Notification({
      userId: 'passenger_001',
      type: 'bus_arrival',
      title: 'Bus arriving soon',
      message: 'Bus NB-6544 will arrive in 5 minutes.',
      priority: 'high',
      read: false,
      busId: 'NB-6544',
      busNumber: 'NB-6544',
      estimatedArrivalTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      latitude: 6.9271,
      longitude: 79.8612,
      createdAt: new Date()
    }).toFirestore(),
    new Notification({
      userId: 'passenger_002',
      type: 'delay',
      title: 'Route delay notice',
      message: 'Bus NC-2201 is delayed by 8 minutes.',
      priority: 'normal',
      read: false,
      busId: 'NC-2201',
      busNumber: 'NC-2201',
      estimatedArrivalTime: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
      latitude: 6.9001,
      longitude: 79.85,
      createdAt: new Date()
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, notifications);
}

module.exports = {
  seedNotifications
};
