const { User } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'users';

async function seedUsers(db) {
  const data = [
    // Document ID: 1ibjDVcNl9p611yCTfDV
    {
      name: 'Sachith',
      email: 'sk@gmail.com',
      password: '$2b$10$x0abNlk.CmtZ8aXqZb0TUeWAv4mB315NUKi0AIkaDEj5wsGwp6Bp2',
      mobileNo: '0766364158',
      nic: '',
      dob: '',
      bloodGroup: '',
      createdAt: { _seconds: 1772962335, _nanoseconds: 116000000 }
    },

    // Document ID: 1rALLhnUE41kKXNE8uzq
    {
      name: 'System Admin',
      email: 'admin@smartbus.lk',
      password: '$2b$10$89PkqSwBCzdOeCzLfgXOHe8FGNbBWMyw0znMRTU97pJyshD4ZONzu',
      role: 'admin',
      createdAt: { _seconds: 1772953789, _nanoseconds: 849000000 }
    },

    // Document ID: 2S8fsBYBg3UZ55ftw03c
    {
      name: 'Jayaisuru ',
      email: 'kholi@gmail.com',
      password: '$2b$10$CHiBefqxHgQHTEhDqJBya.PeQFOfKsQOff.r2rSqdaVWvUK1jOASW',
      createdAt: { _seconds: 1764907424, _nanoseconds: 37000000 }
    },

    // Document ID: 8Mdv4FoEAjD4Zn6XzjZB
    {
      email: 'ccfccddwsssc@gmail.com',
      password: '$2b$10$OsMtJhUJgE2QP78GhqY/guGOMbPIIk2hWPRhqKemqm5BA5eFubJdy',
      name: 'des',
      dob: '2000-10-03',
      nic: '123rdedcsf123',
      bloodGroup: 'dcs',
      mobileNo: '+94719011933',
      role: 'passenger',
      createdAt: { _seconds: 1759428357, _nanoseconds: 511000000 }
    },

    // Document ID: JUln1d2JFOqscrvXeH07
    {
      name: 'kkkks',
      email: 'ccfccddxsxwsssc@gmail.com',
      password: '$2b$10$gu9HclLyQbdSS5D0VY0WLOROt3dy1ikzCVYNwnLk90M599aBKTvf.',
      createdAt: { _seconds: 1763665052, _nanoseconds: 470000000 }
    },

    // Document ID: c5TslfLgx0VoJb5IieGJ
    {
      auth0Id: 'google-oauth2|100510602883838245806',
      email: 'jayaisurusamarakoon7@gmail.com',
      name: 'jayaisurusamarakoon7@gmail.com',
      profilePictureUrl: null,
      createdAt: { _seconds: 1764610132, _nanoseconds: 466000000 }
    },

    // Document ID: cjQGqCibPRuWaVCWX0di
    {
      auth0Id: 'google-oauth2|100510602883838245806',
      email: 'jayaisurusamarakoon7@gmail.com',
      name: 'jayaisurusamarakoon7@gmail.com',
      profilePictureUrl: null,
      createdAt: { _seconds: 1764610130, _nanoseconds: 904000000 }
    },

    // Document ID: eBBYSKAsY0RHSHqYrpSC
    {
      email: 'ccfccddwsc@gmail.com',
      password: '$2b$10$S0jRxJ.VXHXwHX4LGpNmW.7ccWeX64kEBp6A.hGvSg19lCw02J2d2',
      name: 'des',
      dob: '2000-10-03',
      nic: '123rdedcsf123',
      bloodGroup: 'dcs',
      mobileNo: '+94719011933',
      role: 'passenger',
      createdAt: { _seconds: 1759292658, _nanoseconds: 172000000 }
    },

    // Document ID: eNkmi20myFcFJYGeITL8
    {
      bloodGroup: '',
      createdAt: { _seconds: 1772481875, _nanoseconds: 822000000 },
      dob: '',
      email: 'jayaisuru@gmail.com',
      mobileNo: '',
      name: 'Jayaisuru ',
      nic: '',
      password: '$2b$10$gRfTWSZ2x2nQVk9N/U5z0eOUX6uCBhLRvdcnF8sqEQbDW7.f7f1dW',
      role: 'passenger'
    },

    // Document ID: fh8pUJWn0r008Y7uHd15
    {
      dob: '2000-10-03',
      nic: '123rdedcsf123',
      mobileNo: '+94719011933',
      role: 'passenger',
      createdAt: { _seconds: 1759213606, _nanoseconds: 814000000 },
      bloodGroup: 'drcexcs',
      password: '1234',
      name: '5fds',
      age: 2,
      email: 'jjj@gmail.com'
    },

    // Document ID: lwR9S9gJzEvhVucXe57g
    {
      name: 'des',
      email: 'jjjj@gmail.com',
      password: '$2b$10$o/RTQwy43ZkBlqeinUEZC.QB5dIYGwtXIXZ9.QoA8tpjjSsNTHrnW',
      createdAt: { _seconds: 1763911558, _nanoseconds: 382000000 },
      bloodGroup: 'O+',
      dob: '2000-10-03',
      nic: '200027701928',
      mobileNo: '0719011933'
    },

    // Document ID: qXBmGcnyZnBUp31GV7B5
    {
      name: 'jjjjj',
      email: 'jjjjj@gmail.com',
      password: '$2b$10$HMePZjjOk8eN3wpomaGTTuY2ljnUoUFNXDBYbTdh8Twdx796djRzm',
      createdAt: { _seconds: 1771511672, _nanoseconds: 47000000 }
    },

    // Document ID: wiFVeNzVGI4cWJtALyw1
    {
      email: 'ccfccc@gmail.com',
      password: '$2b$10$NYn7eaJXTDGgLlZJGaXLJOrXTa0MhvcA0Pjr5Y2MTpf43Dj3nWp.S',
      name: 'des',
      dob: '2000-10-03',
      nic: '123rdedcsf123',
      bloodGroup: 'dcs',
      mobileNo: '+94719011933',
      role: 'passenger',
      createdAt: { _seconds: 1759247806, _nanoseconds: 669000000 }
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedUsers
};
