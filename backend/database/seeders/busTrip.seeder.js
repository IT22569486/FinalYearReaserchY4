const { BusTrip } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'busTrips';

async function seedBusTrips(db) {
  const data = [
    // Document ID: 0Lvq5RMZE17iLFLk0dhx
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772795218, _nanoseconds: 792000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772795216, _nanoseconds: 151000000 },
      tripId: '0069',
      endTime: { _seconds: 1772795892, _nanoseconds: 54000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772795892, _nanoseconds: 506000000 }
    },

    // Document ID: 0q75Gvgw735pE77F5ayc
    {
      tripId: '554',
      busId: 'NB-dd',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: 'driver002',
      status: 'active',
      startTime: '',
      endTime: null,
      currentLocation: {
        lat: 6.9271,
        lng: 79.8612
      },
      createdAt: { _seconds: 1772004498, _nanoseconds: 477000000 },
      direction: 1
    },

    // Document ID: 1KoFKYVBwtkJRj2A6Lg6
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772281047, _nanoseconds: 814000000 },
      direction: 1,
      tripId: '0035',
      createdAt: { _seconds: 1772281050, _nanoseconds: 851000000 },
      endTime: { _seconds: 1772281726, _nanoseconds: 479000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772281728, _nanoseconds: 211000000 }
    },

    // Document ID: 1SY2Ss124C13RIZbHOiz
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772725444, _nanoseconds: 759000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772725444, _nanoseconds: 124000000 },
      tripId: '0052',
      endTime: { _seconds: 1772726534, _nanoseconds: 594000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772726535, _nanoseconds: 481000000 }
    },

    // Document ID: 1oqEaOcoL7SCzSAqdxuf
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772523044, _nanoseconds: 988000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772523043, _nanoseconds: 635000000 },
      tripId: '0048',
      endTime: { _seconds: 1772523692, _nanoseconds: 524000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772523692, _nanoseconds: 817000000 }
    },

    // Document ID: 21GS2zmvTH8zGISF5i4M
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772274410, _nanoseconds: 947000000 },
      direction: 1,
      tripId: '0034',
      createdAt: { _seconds: 1772274412, _nanoseconds: 296000000 },
      endTime: { _seconds: 1772275094, _nanoseconds: 585000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772275095, _nanoseconds: 343000000 }
    },

    // Document ID: 2ukInAu1CiFo5rFp4bjm
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772559673, _nanoseconds: 856000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772559672, _nanoseconds: 529000000 },
      tripId: '0050',
      endTime: { _seconds: 1772560336, _nanoseconds: 205000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772560336, _nanoseconds: 701000000 }
    },

    // Document ID: 2zqJvq8M6fIpOzCaP4ZP
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772283960, _nanoseconds: 669000000 },
      direction: 1,
      tripId: '0036',
      createdAt: { _seconds: 1772283963, _nanoseconds: 758000000 },
      endTime: { _seconds: 1772284649, _nanoseconds: 833000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772284651, _nanoseconds: 861000000 }
    },

    // Document ID: 3AFLfbktt4fEPL5AlnLC
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772923309, _nanoseconds: 291000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772923307, _nanoseconds: 615000000 },
      tripId: '0088',
      endTime: { _seconds: 1772923985, _nanoseconds: 354000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772923985, _nanoseconds: 765000000 }
    },

    // Document ID: 3oHrdIAI0evQi0wEt3Xt
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772765929, _nanoseconds: 254000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772765927, _nanoseconds: 945000000 },
      tripId: '0056',
      endTime: { _seconds: 1772766588, _nanoseconds: 936000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772766589, _nanoseconds: 271000000 }
    },

    // Document ID: 3pzHKa5EUrxkAZrbHjd4
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772186671, _nanoseconds: 164000000 },
      direction: 1,
      tripId: '0009',
      createdAt: { _seconds: 1772186672, _nanoseconds: 581000000 },
      endTime: { _seconds: 1772187332, _nanoseconds: 927000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772187333, _nanoseconds: 354000000 }
    },

    // Document ID: 4RyVOxcJRFmHTN5yTCAg
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772559026, _nanoseconds: 971000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772559025, _nanoseconds: 676000000 },
      status: 'active',
      tripId: '0049',
      updatedAt: { _seconds: 1772559026, _nanoseconds: 971000000 }
    },

    // Document ID: 4vWIxDIzcZ7lQ5F3b8wM
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772818159, _nanoseconds: 864000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772818158, _nanoseconds: 124000000 },
      status: 'active',
      tripId: '0072',
      updatedAt: { _seconds: 1772818159, _nanoseconds: 864000000 }
    },

    // Document ID: 5XZk1jakC3He4yRC2HXi
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772902739, _nanoseconds: 184000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772902737, _nanoseconds: 323000000 },
      tripId: '0085',
      endTime: { _seconds: 1772903429, _nanoseconds: 622000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772903430, _nanoseconds: 859000000 }
    },

    // Document ID: 6t9UqFP5ch06e9mIc1iN
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772922134, _nanoseconds: 277000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772922132, _nanoseconds: 400000000 },
      status: 'active',
      tripId: '0087',
      updatedAt: { _seconds: 1772922134, _nanoseconds: 277000000 }
    },

    // Document ID: 7sPa7uEBwTv4h8PqyJr4
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772272452, _nanoseconds: 289000000 },
      direction: 1,
      tripId: '0033',
      createdAt: { _seconds: 1772272455, _nanoseconds: 315000000 },
      endTime: { _seconds: 1772274333, _nanoseconds: 56000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772274336, _nanoseconds: 483000000 }
    },

    // Document ID: 8BNoKrOIlKMlRYIQ7Bwh
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772198622, _nanoseconds: 780000000 },
      direction: 1,
      tripId: '0012',
      createdAt: { _seconds: 1772198624, _nanoseconds: 382000000 },
      endTime: { _seconds: 1772199284, _nanoseconds: 496000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772199284, _nanoseconds: 984000000 }
    },

    // Document ID: 9HcbkezV5Qkoa8sw9g0m
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772251023, _nanoseconds: 841000000 },
      direction: 1,
      tripId: '0027',
      createdAt: { _seconds: 1772251025, _nanoseconds: 972000000 },
      endTime: { _seconds: 1772251685, _nanoseconds: 114000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772251686, _nanoseconds: 282000000 }
    },

    // Document ID: CHPaEyAWK1oHVSsP05iD
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772250263, _nanoseconds: 61000000 },
      direction: 1,
      tripId: '0026',
      createdAt: { _seconds: 1772250265, _nanoseconds: 292000000 },
      endTime: { _seconds: 1772250924, _nanoseconds: 549000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772250925, _nanoseconds: 709000000 }
    },

    // Document ID: DJUOoSE56aoydEvNYPLp
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772687109, _nanoseconds: 629000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772687107, _nanoseconds: 595000000 },
      tripId: '0051',
      endTime: { _seconds: 1772687878, _nanoseconds: 579000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772687880, _nanoseconds: 65000000 }
    },

    // Document ID: DPiZ6qQHgXDF9oFemIdN
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772203264, _nanoseconds: 510000000 },
      direction: 1,
      tripId: '0015',
      createdAt: { _seconds: 1772203266, _nanoseconds: 405000000 },
      endTime: { _seconds: 1772203926, _nanoseconds: 738000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772203927, _nanoseconds: 631000000 }
    },

    // Document ID: DyJXa6ey4GQnOinffcDp
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772822877, _nanoseconds: 401000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772822875, _nanoseconds: 491000000 },
      tripId: '0076',
      endTime: { _seconds: 1772823548, _nanoseconds: 993000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772823549, _nanoseconds: 731000000 }
    },

    // Document ID: GoQGbMB3mTsRClY6iOpD
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772822168, _nanoseconds: 372000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772822166, _nanoseconds: 479000000 },
      tripId: '0075',
      endTime: { _seconds: 1772822842, _nanoseconds: 657000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772822843, _nanoseconds: 621000000 }
    },

    // Document ID: HEsf1Bab3L30V8UtzID6
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772481953, _nanoseconds: 9000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772481951, _nanoseconds: 685000000 },
      tripId: '0043',
      endTime: { _seconds: 1772482612, _nanoseconds: 204000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772482613, _nanoseconds: 203000000 }
    },

    // Document ID: Hd9firrYYo46e0yQ7EdP
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772270259, _nanoseconds: 910000000 },
      direction: 1,
      tripId: '0032',
      createdAt: { _seconds: 1772270262, _nanoseconds: 656000000 },
      endTime: { _seconds: 1772272413, _nanoseconds: 4000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772272414, _nanoseconds: 727000000 }
    },

    // Document ID: HrGxGmvN5tzhIIGqzX5B
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772314746, _nanoseconds: 705000000 },
      direction: 1,
      tripId: '0040',
      createdAt: { _seconds: 1772314749, _nanoseconds: 139000000 },
      endTime: { _seconds: 1772315407, _nanoseconds: 722000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772315409, _nanoseconds: 119000000 }
    },

    // Document ID: J1OHvn74ptglw1aEONYg
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772131185, _nanoseconds: 112000000 },
      status: 'active',
      direction: 1,
      tripId: '0005',
      createdAt: { _seconds: 1772131187, _nanoseconds: 285000000 }
    },

    // Document ID: J8qQtpOcg0I1Wks9MyKZ
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772481282, _nanoseconds: 500000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772481281, _nanoseconds: 168000000 },
      status: 'active',
      tripId: '0042',
      updatedAt: { _seconds: 1772481282, _nanoseconds: 500000000 }
    },

    // Document ID: JOweAystEc6ed9zjNzrt
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772878076, _nanoseconds: 125000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772878072, _nanoseconds: 519000000 },
      status: 'active',
      tripId: '0080',
      updatedAt: { _seconds: 1772878076, _nanoseconds: 125000000 }
    },

    // Document ID: KSnm3NddNFoiZJtiWEyb
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772768880, _nanoseconds: 893000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772768879, _nanoseconds: 524000000 },
      tripId: '0060',
      endTime: { _seconds: 1772769540, _nanoseconds: 449000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772769540, _nanoseconds: 958000000 }
    },

    // Document ID: Kbg2tr3hlX6dmTpVjRwJ
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772960372, _nanoseconds: 203000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772960370, _nanoseconds: 712000000 },
      tripId: '0092',
      endTime: { _seconds: 1772961664, _nanoseconds: 21000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772961664, _nanoseconds: 768000000 }
    },

    // Document ID: Kn9PCnqqzRyjYKDrLDXN
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772252087, _nanoseconds: 411000000 },
      direction: 1,
      tripId: '0028',
      createdAt: { _seconds: 1772252089, _nanoseconds: 677000000 },
      endTime: { _seconds: 1772253547, _nanoseconds: 531000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772253548, _nanoseconds: 747000000 }
    },

    // Document ID: KojesaQX6YJBcF1FA4Kc
    {
      driverId: 'driver001',
      status: 'active',
      endTime: null,
      currentLocation: {
        lat: 6.9271,
        lng: 79.8612
      },
      occupancy: 32,
      createdAt: { _seconds: 1771992956, _nanoseconds: 237000000 },
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: '',
      tripId: '552',
      updatedAt: { _seconds: 1771993625, _nanoseconds: 371000000 },
      direction: 1
    },

    // Document ID: MJURJBzKS7SHNxG2XeW5
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772211427, _nanoseconds: 481000000 },
      direction: 1,
      tripId: '0021',
      createdAt: { _seconds: 1772211429, _nanoseconds: 395000000 },
      endTime: { _seconds: 1772212089, _nanoseconds: 110000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772212090, _nanoseconds: 27000000 }
    },

    // Document ID: Maxcpsvq643qPdtNAftS
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772793862, _nanoseconds: 342000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772793860, _nanoseconds: 68000000 },
      tripId: '0067',
      endTime: { _seconds: 1772794540, _nanoseconds: 428000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772794541, _nanoseconds: 320000000 }
    },

    // Document ID: OKT2GbrnwZ7PGjD0z33v
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772824800, _nanoseconds: 853000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772824799, _nanoseconds: 61000000 },
      tripId: '0078',
      endTime: { _seconds: 1772825472, _nanoseconds: 971000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772825473, _nanoseconds: 671000000 }
    },

    // Document ID: OZ2kRzPh4i3QfaIwp1SQ
    {
      tripId: '553',
      busId: 'NB-9344',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: 'driver002',
      status: 'active',
      direction: 1,
      startTime: '',
      endTime: null,
      currentLocation: {
        lat: 6.9271,
        lng: 79.8612
      },
      createdAt: { _seconds: 1771994498, _nanoseconds: 430000000 }
    },

    // Document ID: TEqhPSya5S1Kg3I1eQbi
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772726569, _nanoseconds: 635000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772726568, _nanoseconds: 342000000 },
      tripId: '0053',
      endTime: { _seconds: 1772727257, _nanoseconds: 600000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772727257, _nanoseconds: 975000000 }
    },

    // Document ID: Ttaeey4jM8n9AWx1AJvm
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772792539, _nanoseconds: 576000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772792537, _nanoseconds: 405000000 },
      status: 'active',
      tripId: '0065',
      updatedAt: { _seconds: 1772792539, _nanoseconds: 577000000 }
    },

    // Document ID: UyYD8q2u81VQ1ggCdPso
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772769796, _nanoseconds: 402000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772769795, _nanoseconds: 784000000 },
      tripId: '0061',
      endTime: { _seconds: 1772770448, _nanoseconds: 969000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772770449, _nanoseconds: 560000000 }
    },

    // Document ID: VX4Toy4yVGyEiZvmYoj8
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772206934, _nanoseconds: 714000000 },
      direction: 1,
      tripId: '0016',
      createdAt: { _seconds: 1772206936, _nanoseconds: 560000000 },
      endTime: { _seconds: 1772207596, _nanoseconds: 532000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772207597, _nanoseconds: 416000000 }
    },

    // Document ID: VzYiqedDa7C0vHDaoH6u
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772898256, _nanoseconds: 576000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772898254, _nanoseconds: 531000000 },
      status: 'active',
      tripId: '0083',
      updatedAt: { _seconds: 1772898256, _nanoseconds: 576000000 }
    },

    // Document ID: WE2X4mZFHWl7jp5p5aUv
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772766734, _nanoseconds: 493000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772766733, _nanoseconds: 161000000 },
      status: 'active',
      tripId: '0057',
      updatedAt: { _seconds: 1772766734, _nanoseconds: 493000000 }
    },

    // Document ID: WR410JdtaakTiRREvW14
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772793187, _nanoseconds: 335000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772793184, _nanoseconds: 113000000 },
      status: 'active',
      tripId: '0066',
      updatedAt: { _seconds: 1772793187, _nanoseconds: 335000000 }
    },

    // Document ID: YKFR4sPfh16JlU3VFGsn
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772483424, _nanoseconds: 353000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772483422, _nanoseconds: 993000000 },
      tripId: '0045',
      endTime: { _seconds: 1772484088, _nanoseconds: 91000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772484088, _nanoseconds: 385000000 }
    },

    // Document ID: YQzFOx7SpTouCcmgS9b6
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772199475, _nanoseconds: 155000000 },
      direction: 1,
      tripId: '0013',
      createdAt: { _seconds: 1772199476, _nanoseconds: 538000000 },
      endTime: { _seconds: 1772200136, _nanoseconds: 780000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772200137, _nanoseconds: 395000000 }
    },

    // Document ID: YzmYlR7eebnCIxh7DBYp
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772171532, _nanoseconds: 312000000 },
      status: 'active',
      direction: 1,
      tripId: '0006',
      createdAt: { _seconds: 1772171533, _nanoseconds: 558000000 }
    },

    // Document ID: ZWvrlZ1Djqm0bV6eiVI9
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772254951, _nanoseconds: 800000000 },
      direction: 1,
      tripId: '0029',
      createdAt: { _seconds: 1772254954, _nanoseconds: 5000000 },
      endTime: { _seconds: 1772255613, _nanoseconds: 271000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772255614, _nanoseconds: 521000000 }
    },

    // Document ID: ZjORiicmnkCaxj1qtv2B
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772816502, _nanoseconds: 751000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772816500, _nanoseconds: 851000000 },
      tripId: '0070',
      endTime: { _seconds: 1772817179, _nanoseconds: 485000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772817180, _nanoseconds: 35000000 }
    },

    // Document ID: Zjsh6w0Z4kcSWYS0F2s5
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772794629, _nanoseconds: 295000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772794626, _nanoseconds: 161000000 },
      status: 'active',
      tripId: '0068',
      updatedAt: { _seconds: 1772794629, _nanoseconds: 295000000 }
    },

    // Document ID: ZwFXH0ZJSDzXzT4oICXr
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772824031, _nanoseconds: 682000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772824029, _nanoseconds: 947000000 },
      tripId: '0077',
      endTime: { _seconds: 1772824704, _nanoseconds: 719000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772824705, _nanoseconds: 970000000 }
    },

    // Document ID: aJa2Xbum3H4ozOItHy1W
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772207656, _nanoseconds: 781000000 },
      status: 'active',
      direction: 1,
      tripId: '0017',
      createdAt: { _seconds: 1772207658, _nanoseconds: 559000000 }
    },

    // Document ID: b0zwWipExDoIXUasbQ0C
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772197837, _nanoseconds: 838000000 },
      direction: 1,
      tripId: '0011',
      createdAt: { _seconds: 1772197839, _nanoseconds: 327000000 },
      endTime: { _seconds: 1772198499, _nanoseconds: 728000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772198500, _nanoseconds: 172000000 }
    },

    // Document ID: bBvCEktOCjPf4ePYqweG
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772182006, _nanoseconds: 312000000 },
      direction: 1,
      tripId: '0008',
      createdAt: { _seconds: 1772182007, _nanoseconds: 605000000 },
      endTime: { _seconds: 1772182668, _nanoseconds: 157000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772182668, _nanoseconds: 534000000 }
    },

    // Document ID: cQxcWyfOb7oq5JKqVOSL
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772891477, _nanoseconds: 372000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772891475, _nanoseconds: 517000000 },
      tripId: '0081',
      endTime: { _seconds: 1772892153, _nanoseconds: 994000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772892155, _nanoseconds: 86000000 }
    },

    // Document ID: dAluhhgROUyWOjAAsZYK
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772212248, _nanoseconds: 912000000 },
      status: 'active',
      direction: 1,
      tripId: '0022',
      createdAt: { _seconds: 1772212250, _nanoseconds: 789000000 }
    },

    // Document ID: dlSObTr0BDW93gwP4PYb
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772256988, _nanoseconds: 161000000 },
      status: 'active',
      direction: 1,
      tripId: '0031',
      createdAt: { _seconds: 1772256990, _nanoseconds: 382000000 }
    },

    // Document ID: fBDafmkc0wH3aXE2kNzp
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772485969, _nanoseconds: 735000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772485968, _nanoseconds: 432000000 },
      status: 'active',
      tripId: '0046',
      updatedAt: { _seconds: 1772485969, _nanoseconds: 735000000 }
    },

    // Document ID: fOtsVDZuFsu1FLblr6eS
    {
      busId: 'NA-225566',
      createdAt: { _seconds: 1772958974, _nanoseconds: 731000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: '2026-03-06T11:18:12.000Z',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: '2026-03-06T11:06:56.000Z',
      tripId: '0090',
      updatedAt: { _seconds: 1772958974, _nanoseconds: 731000000 },
      status: 'in_transit'
    },

    // Document ID: fgfPgMM9KioqID0WowdK
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772957659, _nanoseconds: 640000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772957657, _nanoseconds: 166000000 },
      tripId: '0089',
      endTime: { _seconds: 1772958336, _nanoseconds: 789000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772958337, _nanoseconds: 242000000 }
    },

    // Document ID: hj0TlckxsptqtfZ3cC1q
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772128610, _nanoseconds: 659000000 },
      direction: -1,
      tripId: '0001',
      createdAt: { _seconds: 1772128612, _nanoseconds: 819000000 },
      endTime: { _seconds: 1772129274, _nanoseconds: 843000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772129275, _nanoseconds: 998000000 }
    },

    // Document ID: i05dLH9OsCN0XK4Av2g3
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772188181, _nanoseconds: 111000000 },
      direction: 1,
      tripId: '0010',
      createdAt: { _seconds: 1772188181, _nanoseconds: 901000000 },
      endTime: { _seconds: 1772188840, _nanoseconds: 475000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772188840, _nanoseconds: 598000000 }
    },

    // Document ID: iV9FZwWAbOov0BOL7jx3
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772959314, _nanoseconds: 574000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772959313, _nanoseconds: 81000000 },
      tripId: '0091',
      endTime: { _seconds: 1772959978, _nanoseconds: 27000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772959978, _nanoseconds: 919000000 }
    },

    // Document ID: ikgrr0mXyIrxyEPHELab
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772248609, _nanoseconds: 567000000 },
      status: 'active',
      direction: 1,
      tripId: '0024',
      createdAt: { _seconds: 1772248611, _nanoseconds: 722000000 }
    },

    // Document ID: j64Jx2XfddTL42BUmUiy
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772874132, _nanoseconds: 396000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772874130, _nanoseconds: 420000000 },
      tripId: '0079',
      endTime: { _seconds: 1772874818, _nanoseconds: 510000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772874819, _nanoseconds: 913000000 }
    },

    // Document ID: jCXrJL7rnsDIKrc9LwEr
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772285982, _nanoseconds: 359000000 },
      direction: 1,
      tripId: '0037',
      createdAt: { _seconds: 1772285985, _nanoseconds: 511000000 },
      endTime: { _seconds: 1772286673, _nanoseconds: 385000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772286675, _nanoseconds: 181000000 }
    },

    // Document ID: jNMAlecctncSDB6zVbRc
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772903749, _nanoseconds: 696000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772903747, _nanoseconds: 201000000 },
      tripId: '0086',
      endTime: { _seconds: 1772904430, _nanoseconds: 399000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772904431, _nanoseconds: 688000000 }
    },

    // Document ID: kQ6853OgzvH2bXhErxCl
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772202571, _nanoseconds: 836000000 },
      direction: 1,
      tripId: '0014',
      createdAt: { _seconds: 1772202573, _nanoseconds: 691000000 },
      endTime: { _seconds: 1772203233, _nanoseconds: 735000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772203234, _nanoseconds: 557000000 }
    },

    // Document ID: kbtSWzkG3p7yVYFKJz7Z
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772790740, _nanoseconds: 608000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772790737, _nanoseconds: 748000000 },
      status: 'active',
      tripId: '0063',
      updatedAt: { _seconds: 1772790740, _nanoseconds: 608000000 }
    },

    // Document ID: mfaJlxc7xqQmh8i6khw0
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772792027, _nanoseconds: 100000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772792025, _nanoseconds: 233000000 },
      status: 'active',
      tripId: '0064',
      updatedAt: { _seconds: 1772792027, _nanoseconds: 100000000 }
    },

    // Document ID: mph0MMN4Rv4Om9ao1zze
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772767915, _nanoseconds: 126000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772767913, _nanoseconds: 851000000 },
      status: 'active',
      tripId: '0059',
      updatedAt: { _seconds: 1772767915, _nanoseconds: 126000000 }
    },

    // Document ID: n6IqZJ2evXxosqelPWDN
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772212893, _nanoseconds: 204000000 },
      direction: 1,
      tripId: '0023',
      createdAt: { _seconds: 1772212895, _nanoseconds: 174000000 },
      endTime: { _seconds: 1772213555, _nanoseconds: 306000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772213556, _nanoseconds: 468000000 }
    },

    // Document ID: nF4SfFvr6XeYuedmlVZk
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772255860, _nanoseconds: 408000000 },
      direction: 1,
      tripId: '0030',
      createdAt: { _seconds: 1772255862, _nanoseconds: 568000000 },
      endTime: { _seconds: 1772256522, _nanoseconds: 126000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772256523, _nanoseconds: 356000000 }
    },

    // Document ID: npdZaFae58zGdKI40Klc
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772249184, _nanoseconds: 147000000 },
      direction: 1,
      tripId: '0025',
      createdAt: { _seconds: 1772249186, _nanoseconds: 354000000 },
      endTime: { _seconds: 1772249845, _nanoseconds: 461000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772249846, _nanoseconds: 625000000 }
    },

    // Document ID: oQuVb2lvXnFWuDvdBAvh
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772732651, _nanoseconds: 22000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772732649, _nanoseconds: 688000000 },
      tripId: '0055',
      endTime: { _seconds: 1772733310, _nanoseconds: 934000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772733311, _nanoseconds: 360000000 }
    },

    // Document ID: p9TRtikA70HpK5SEtqOG
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772131016, _nanoseconds: 971000000 },
      status: 'active',
      direction: 0,
      tripId: '0004',
      createdAt: { _seconds: 1772131019, _nanoseconds: 145000000 }
    },

    // Document ID: pgRPBrOmLWB7uvhEH0mf
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772892500, _nanoseconds: 521000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772892497, _nanoseconds: 512000000 },
      tripId: '0082',
      endTime: { _seconds: 1772893180, _nanoseconds: 5000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772893180, _nanoseconds: 907000000 }
    },

    // Document ID: qE3xgTaWqPG7845jPoxY
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772817461, _nanoseconds: 407000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772817459, _nanoseconds: 470000000 },
      tripId: '0071',
      endTime: { _seconds: 1772818136, _nanoseconds: 941000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772818137, _nanoseconds: 566000000 }
    },

    // Document ID: qo9vGyluDsLdHL3Lr2wU
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772727514, _nanoseconds: 934000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772727513, _nanoseconds: 614000000 },
      tripId: '0054',
      endTime: { _seconds: 1772731739, _nanoseconds: 692000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772731740, _nanoseconds: 70000000 }
    },

    // Document ID: qpt7nV2UuBUlGG4SP259
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772209459, _nanoseconds: 21000000 },
      direction: 1,
      tripId: '0020',
      createdAt: { _seconds: 1772209460, _nanoseconds: 849000000 },
      endTime: { _seconds: 1772210120, _nanoseconds: 643000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772210121, _nanoseconds: 564000000 }
    },

    // Document ID: sGKVSbn7e87h06vLlWAe
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772770622, _nanoseconds: 660000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772770621, _nanoseconds: 337000000 },
      status: 'active',
      tripId: '0062',
      updatedAt: { _seconds: 1772770622, _nanoseconds: 660000000 }
    },

    // Document ID: sJ9wHhYNdZUP8QLk0UCd
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772208821, _nanoseconds: 679000000 },
      status: 'active',
      direction: 1,
      tripId: '0019',
      createdAt: { _seconds: 1772208823, _nanoseconds: 582000000 }
    },

    // Document ID: sp3OLU0u7mJxnC2mksYq
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772899325, _nanoseconds: 193000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772899323, _nanoseconds: 350000000 },
      tripId: '0084',
      endTime: { _seconds: 1772899999, _nanoseconds: 994000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772900001, _nanoseconds: 565000000 }
    },

    // Document ID: tAD4bwbHhSJrTheobUoS
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772208202, _nanoseconds: 712000000 },
      status: 'active',
      direction: 1,
      tripId: '0018',
      createdAt: { _seconds: 1772208204, _nanoseconds: 732000000 }
    },

    // Document ID: tAtz4bjMlOKlKVge8XRS
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772130614, _nanoseconds: 950000000 },
      status: 'active',
      direction: -1,
      tripId: '0002',
      createdAt: { _seconds: 1772130617, _nanoseconds: 93000000 }
    },

    // Document ID: tZfgBYL7fxq7R3YFfWUW
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772340145, _nanoseconds: 396000000 },
      direction: 1,
      tripId: '0041',
      createdAt: { _seconds: 1772340148, _nanoseconds: 370000000 },
      endTime: { _seconds: 1772340808, _nanoseconds: 624000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772340810, _nanoseconds: 649000000 }
    },

    // Document ID: tm8OLaJzL1Z4eVWw9Glm
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772130968, _nanoseconds: 789000000 },
      status: 'active',
      direction: 1,
      tripId: '0003',
      createdAt: { _seconds: 1772130970, _nanoseconds: 944000000 }
    },

    // Document ID: tyu1lN8xbOTnjNU7ZM4r
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772767321, _nanoseconds: 928000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772767320, _nanoseconds: 581000000 },
      status: 'active',
      tripId: '0058',
      updatedAt: { _seconds: 1772767321, _nanoseconds: 928000000 }
    },

    // Document ID: uZqtgEQ8pPq3rD2XqX7L
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772483314, _nanoseconds: 467000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      endTime: null,
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772483313, _nanoseconds: 149000000 },
      status: 'active',
      tripId: '0044',
      updatedAt: { _seconds: 1772483314, _nanoseconds: 467000000 }
    },

    // Document ID: w5aPuPxkXK0CB1EOwVjp
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772172006, _nanoseconds: 890000000 },
      direction: 1,
      tripId: '0007',
      createdAt: { _seconds: 1772172007, _nanoseconds: 632000000 },
      endTime: { _seconds: 1772181452, _nanoseconds: 983000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772181453, _nanoseconds: 409000000 }
    },

    // Document ID: w6QTBnLia8uCuW3ngkTr
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772521700, _nanoseconds: 239000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772521698, _nanoseconds: 908000000 },
      tripId: '0047',
      endTime: { _seconds: 1772522360, _nanoseconds: 735000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772522361, _nanoseconds: 143000000 }
    },

    // Document ID: y1UIBXKXgXL3fBMyqLk9
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772819204, _nanoseconds: 384000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772819202, _nanoseconds: 490000000 },
      tripId: '0073',
      endTime: { _seconds: 1772819872, _nanoseconds: 978000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772819873, _nanoseconds: 424000000 }
    },

    // Document ID: yc6LgTWoyaeCx2KneTL4
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772312912, _nanoseconds: 926000000 },
      direction: 1,
      tripId: '0039',
      createdAt: { _seconds: 1772312915, _nanoseconds: 328000000 },
      endTime: { _seconds: 1772313574, _nanoseconds: 551000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772313575, _nanoseconds: 943000000 }
    },

    // Document ID: yqSCwHCGz0KsjZxx7CS4
    {
      busId: 'NB-6544',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      driverId: '60d5f484f1a2b3c4d5e6f790',
      startTime: { _seconds: 1772311842, _nanoseconds: 25000000 },
      direction: 1,
      tripId: '0038',
      createdAt: { _seconds: 1772311844, _nanoseconds: 469000000 },
      endTime: { _seconds: 1772312504, _nanoseconds: 655000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772312506, _nanoseconds: 55000000 }
    },

    // Document ID: zJE2T0sX0yaSSbsfAisd
    {
      busId: 'NB-6544',
      createdAt: { _seconds: 1772820680, _nanoseconds: 289000000 },
      direction: 1,
      driverId: '60d5f484f1a2b3c4d5e6f790',
      routeId: 'C3bFJjjZI2MFc7ZFpX5b',
      startTime: { _seconds: 1772820678, _nanoseconds: 493000000 },
      tripId: '0074',
      endTime: { _seconds: 1772821353, _nanoseconds: 294000000 },
      status: 'completed',
      updatedAt: { _seconds: 1772821354, _nanoseconds: 97000000 }
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedBusTrips
};
