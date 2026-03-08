const { User } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'users';

async function seedUsers(db) {
  const users = [
    new User({
      name: 'Admin User',
      email: 'admin@example.com',
      mobileNo: '0770000001',
      nic: '900000001V',
      dob: '1990-01-01',
      bloodGroup: 'O+',
      password: 'hashed_password_placeholder',
      role: 'admin',
      createdAt: new Date()
    }).toFirestore(),
    new User({
      name: 'Driver User',
      email: 'driver@example.com',
      mobileNo: '0770000002',
      nic: '910000002V',
      dob: '1991-02-02',
      bloodGroup: 'A+',
      password: 'hashed_password_placeholder',
      role: 'driver',
      createdAt: new Date()
    }).toFirestore(),
    new User({
      name: 'Passenger User',
      email: 'passenger@example.com',
      mobileNo: '0770000003',
      nic: '920000003V',
      dob: '1992-03-03',
      bloodGroup: 'B+',
      password: 'hashed_password_placeholder',
      role: 'passenger',
      createdAt: new Date()
    }).toFirestore()
  ];

  return seedCollection(db, COLLECTION, users);
}

module.exports = {
  seedUsers
};
