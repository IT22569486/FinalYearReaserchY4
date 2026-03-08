const { Route } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'routes';

async function seedRoutes(db) {
  const data = [
    // Document ID: C3bFJjjZI2MFc7ZFpX5b
    {
      createdAt: { _seconds: 1764612474, _nanoseconds: 548000000 },
      googleMapsUrl: 'google.com/maps/dir/?api=1&origin=6.911148407127729%2C79.84917260706425&destination=6.936314690861787%2C79.9832732433697&waypoints=6.910242703263392%2C79.89448194481156%7C6.909477895379088%2C79.89652444695594%7C6.907512320398111%2C79.90023756909977%7C6.902222023209447%2C79.91588329050046%7C6.903981490372648%2C79.95520660822763',
      name: '177 - Kollupitiya to Kaduwela',
      updatedAt: { _seconds: 1766869915, _nanoseconds: 512000000 },
      path: [
        {
          lat: 6.910977993021268,
          lng: 79.8491946496919,
          stopName: 'Kollupitiya'
        },
        {
          lng: 79.86848767343555,
          lat: 6.911381108769149,
          stopName: 'Senbreejat'
        },
        {
          stopName: 'Borella',
          lat: 6.911191444176908,
          lng: 79.87948389035374
        },
        {
          lat: 6.910069542801562,
          stopName: 'rajagiriya',
          lng: 79.8944031195351
        },
        {
          stopName: 'Athukotte',
          lng: 79.90699166387222,
          lat: 6.903649837270821
        },
        {
          lng: 79.91581364997685,
          lat: 6.902159018909317,
          stopName: 'Battaramulla'
        },
        {
          lng: 79.92907165819223,
          stopName: 'Koswatta',
          lat: 6.907777641635932
        },
        {
          stopName: 'Malabe',
          lng: 79.95503600665295,
          lat: 6.903967948649582
        },
        {
          stopName: 'Pittugala',
          lat: 6.9093963341580755,
          lng: 79.9707591524291
        },
        {
          stopName: 'Kothalawala',
          lat: 6.924964,
          lng: 79.978545
        },
        {
          lng: 79.983204793623,
          lat: 6.936665957378365,
          stopName: 'Kaduwela'
        }
      ],
      stops: [
        'Kollupitiya',
        'Senbreejat',
        'Borella',
        'rajagiriya',
        'Athukotte',
        'Battaramulla',
        'Koswatta',
        'Malabe',
        'Pittugala',
        'Kothalawala',
        'Kaduwela'
      ]
    },

    // Document ID: nEECnlYy3Z5aJhaolNF4
    {
      name: '69 - Pettah to dHomagama via Kottawaa',
      path: [
        {
          lat: 6.9271,
          lng: 79.8612,
          stopName: 'Pettah'
        },
        {
          lat: 6.9187,
          lng: 79.857,
          stopName: 'Fort'
        },
        {
          lat: 6.913,
          lng: 79.862,
          stopName: 'Slave Island'
        },
        {
          lat: 6.912,
          lng: 79.864,
          stopName: 'Lake House'
        },
        {
          lat: 6.908,
          lng: 79.867,
          stopName: 'Ibbanwala Junction'
        },
        {
          lat: 6.904,
          lng: 79.8625,
          stopName: 'Town Hall'
        },
        {
          lat: 6.889,
          lng: 79.8575,
          stopName: 'Thummulla'
        },
        {
          lat: 6.879,
          lng: 79.854,
          stopName: 'Thimbirigasyaya Junction'
        },
        {
          lat: 6.873,
          lng: 79.853,
          stopName: 'Havelock City'
        },
        {
          lat: 6.872,
          lng: 79.848,
          stopName: 'Kirillapone'
        },
        {
          lat: 6.869,
          lng: 79.881,
          stopName: 'Nugegoda'
        },
        {
          lat: 6.874,
          lng: 79.885,
          stopName: 'Delkanda'
        },
        {
          lat: 6.8612,
          lng: 79.948,
          stopName: 'Navinna'
        },
        {
          lat: 6.853,
          lng: 79.9564,
          stopName: 'Maharagama'
        },
        {
          lat: 6.849,
          lng: 79.9781,
          stopName: 'Pannipitiya'
        },
        {
          lat: 6.8438,
          lng: 79.9715,
          stopName: 'Kottawa'
        },
        {
          lat: 6.8416,
          lng: 80.0032,
          stopName: 'Homagama'
        }
      ],
      stops: [
        'Pettah',
        'Fort',
        'Slave Island',
        'Lake House',
        'Ibbanwala Junction',
        'Town Hall',
        'Thummulla',
        'Thimbirigasyaya Junction',
        'Havelock City',
        'Kirillapone',
        'Nugegoda',
        'Delkanda',
        'Navinna',
        'Maharagama',
        'Pannipitiya',
        'Kottawa',
        'Homagama'
      ],
      createdAt: { _seconds: 1763665093, _nanoseconds: 925000000 },
      googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=6.935686%2C79.8552347&destination=6.8517034%2C80.0328721&waypoints=6.9174803%2C79.8648039%7C6.9148029%2C79.8775185%7C6.9046459%2C79.9528916%7C6.8696414%2C80.0003851%7C6.8647882%2C80.0236094',
      updatedAt: { _seconds: 1771529184, _nanoseconds: 256000000 }
    },

    // Document ID: yiHGpJej66UNdAiKqcPn
    {
      name: '144 - Pettah to dHomagama via Kottawaa',
      path: [
        {
          lat: 6.9271,
          lng: 79.8612,
          stopName: 'Pettah'
        },
        {
          lat: 6.9187,
          lng: 79.857,
          stopName: 'Fort'
        },
        {
          lat: 6.913,
          lng: 79.862,
          stopName: 'Slave Island'
        },
        {
          lat: 6.912,
          lng: 79.864,
          stopName: 'Lake House'
        },
        {
          lat: 6.908,
          lng: 79.867,
          stopName: 'Ibbanwala Junction'
        },
        {
          lat: 6.904,
          lng: 79.8625,
          stopName: 'Town Hall'
        },
        {
          lat: 6.889,
          lng: 79.8575,
          stopName: 'Thummulla'
        },
        {
          lat: 6.879,
          lng: 79.854,
          stopName: 'Thimbirigasyaya Junction'
        },
        {
          lat: 6.873,
          lng: 79.853,
          stopName: 'Havelock City'
        },
        {
          lat: 6.872,
          lng: 79.848,
          stopName: 'Kirillapone'
        },
        {
          lat: 6.869,
          lng: 79.881,
          stopName: 'Nugegoda'
        },
        {
          lat: 6.874,
          lng: 79.885,
          stopName: 'Delkanda'
        },
        {
          lat: 6.8612,
          lng: 79.948,
          stopName: 'Navinna'
        },
        {
          lat: 6.853,
          lng: 79.9564,
          stopName: 'Maharagama'
        },
        {
          lat: 6.849,
          lng: 79.9781,
          stopName: 'Pannipitiya'
        },
        {
          lat: 6.8438,
          lng: 79.9715,
          stopName: 'Kottawa'
        },
        {
          lat: 6.8416,
          lng: 80.0032,
          stopName: 'Homagama'
        }
      ],
      stops: [
        'Pettah',
        'Fort',
        'Slave Island',
        'Lake House',
        'Ibbanwala Junction',
        'Town Hall',
        'Thummulla',
        'Thimbirigasyaya Junction',
        'Havelock City',
        'Kirillapone',
        'Nugegoda',
        'Delkanda',
        'Navinna',
        'Maharagama',
        'Pannipitiya',
        'Kottawa',
        'Homagama'
      ],
      createdAt: { _seconds: 1763922263, _nanoseconds: 376000000 },
      googleMapsUrl: 'google.com/maps/dir/?api=1&origin=6.911148407127729%2C79.84917260706425&destination=6.936314690861787%2C79.9832732433697&waypoints=6.910242703263392%2C79.89448194481156%7C6.909477895379088%2C79.89652444695594%7C6.907512320398111%2C79.90023756909977%7C6.902222023209447%2C79.91588329050046%7C6.903981490372648%2C79.95520660822763',
      updatedAt: { _seconds: 1771519414, _nanoseconds: 89000000 }
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedRoutes
};
