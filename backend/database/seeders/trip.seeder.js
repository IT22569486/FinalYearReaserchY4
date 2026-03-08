const { Trip } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'trips';

async function seedTrips(db) {
  const data = [
    // Document ID: 04P2nk3nj2jvsh3Z9P1O
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769619298, _nanoseconds: 627000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1769619316, _nanoseconds: 114000000 },
      status: 'completed'
    },

    // Document ID: 0F0IA1bijfY99APik59D
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772340431, _nanoseconds: 735000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: 0bgPWWQ9ZNXJEKLVQ34V
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772961515, _nanoseconds: 708000000 },
      endTime: { _seconds: 1772961659, _nanoseconds: 996000000 },
      status: 'completed'
    },

    // Document ID: 0dI8Z2vfS3yrMtKKWZZu
    {
      status: 'active',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767592891, _nanoseconds: 508000000 }
    },

    // Document ID: 17eq5Q2qF93AYvhky08g
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772286439, _nanoseconds: 436000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: 197w0c7cH2eUwcXfWNPQ
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772315148, _nanoseconds: 86000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772315270, _nanoseconds: 180000000 },
      status: 'completed'
    },

    // Document ID: 1OaJhIv26f1w8DHSA7zI
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772188347, _nanoseconds: 699000000 },
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      currentLocation: 'Athukotte',
      status: 'active'
    },

    // Document ID: 1YdWXg7cZBGNvwjZyMqr
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772766040, _nanoseconds: 565000000 },
      status: 'active'
    },

    // Document ID: 1YqdguhcebZMK4v3bxlk
    {
      status: 'active',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      busId: 'BUS00346w42',
      departure: 'Senbreejat',
      startTime: { _seconds: 1767588476, _nanoseconds: 715000000 },
      currentLocation: 'Senbreejat'
    },

    // Document ID: 1lRFH6q35suBn0Oniwmq
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772172108, _nanoseconds: 250000000 },
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      currentLocation: 'Athukotte',
      status: 'active'
    },

    // Document ID: 2fwYANn1iWxCsLgjJKig
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772769343, _nanoseconds: 352000000 },
      endTime: { _seconds: 1772769428, _nanoseconds: 578000000 },
      status: 'completed'
    },

    // Document ID: 2h4l6OPX7maq4cPaATYa
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771600133, _nanoseconds: 309000000 },
      departure: 'Borella',
      destination: 'Malabe',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: 2mq4PI7QbgSMFmd7kwQM
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772041576, _nanoseconds: 159000000 },
      departure: 'Rajagiriya',
      destination: 'Borella',
      currentLocation: 'Rajagiriya',
      status: 'active'
    },

    // Document ID: 2uVzjuwqu5sVaFzbiSX5
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824145, _nanoseconds: 709000000 },
      status: 'active'
    },

    // Document ID: 3FGxLsJpcW2IHHR9HnZr
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771598923, _nanoseconds: 137000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1771599865, _nanoseconds: 335000000 },
      status: 'completed'
    },

    // Document ID: 3HGEEqHdbc6NnqZqZlKI
    {
      busId: 'NB-6544',
      currentLocation: 'Battaramulla',
      departure: 'Battaramulla',
      destination: 'Borella',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772793958, _nanoseconds: 327000000 },
      status: 'active'
    },

    // Document ID: 3Vq10uLxAlfC2BTGhex7
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772817870, _nanoseconds: 297000000 },
      status: 'active'
    },

    // Document ID: 3obV5qmV7kB6LzCod1Uo
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772878455, _nanoseconds: 143000000 },
      endTime: { _seconds: 1772878655, _nanoseconds: 343000000 },
      status: 'completed'
    },

    // Document ID: 3sDp27eYQWd41RKdSiOg
    {
      startTime: { _seconds: 1767519696, _nanoseconds: 806000000 },
      busId: 'BUS00346w42',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      status: 'active',
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      departure: 'Senbreejat'
    },

    // Document ID: 41Amst4mYidJwGxNzSsC
    {
      busId: 'NB-6544',
      currentLocation: 'Battaramulla',
      departure: 'Battaramulla',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772819568, _nanoseconds: 974000000 },
      status: 'active'
    },

    // Document ID: 4FwQjmrx8pkaK3b1MRFF
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772792565, _nanoseconds: 722000000 },
      status: 'active'
    },

    // Document ID: 4NKxjFqkdZNTg8RRXwto
    {
      currentLocation: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767590625, _nanoseconds: 310000000 },
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      endTime: { _seconds: 1767590805, _nanoseconds: 485000000 },
      status: 'completed'
    },

    // Document ID: 56c0Pgjes9yAWN4cUzxc
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772795265, _nanoseconds: 271000000 },
      status: 'active'
    },

    // Document ID: 592cL1nYJDGMgXGWYRfG
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770912905, _nanoseconds: 624000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1770912950, _nanoseconds: 666000000 },
      status: 'completed'
    },

    // Document ID: 5LRyFyTajWye0Kl6vHah
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Koswatta',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772816564, _nanoseconds: 615000000 },
      endTime: { _seconds: 1772816816, _nanoseconds: 954000000 },
      status: 'completed'
    },

    // Document ID: 5S6PotKgxtx0WZy0jrqw
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772115336, _nanoseconds: 572000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772115364, _nanoseconds: 325000000 },
      status: 'completed'
    },

    // Document ID: 6Mnl4LTanUgp52xP4jHF
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772198288, _nanoseconds: 43000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772198458, _nanoseconds: 406000000 },
      status: 'completed'
    },

    // Document ID: 6nFYKyIAzGr1GTUW0Idw
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770914065, _nanoseconds: 617000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770914076, _nanoseconds: 887000000 },
      status: 'completed'
    },

    // Document ID: 6qEH8QpZHGa7IoHc8E0w
    {
      busId: 'NB-6544',
      currentLocation: 'Athukotte',
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772904181, _nanoseconds: 74000000 },
      endTime: { _seconds: 1772904425, _nanoseconds: 561000000 },
      status: 'completed'
    },

    // Document ID: 6xooT9sShaqkWkWfoI4Y
    {
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      startTime: { _seconds: 1767591337, _nanoseconds: 151000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      endTime: { _seconds: 1767591499, _nanoseconds: 323000000 },
      status: 'completed'
    },

    // Document ID: 76NkNQuxVphYfDk8WnE2
    {
      passengerId: '4woroVWB8FSR4xS4TwChXjt6LdC2',
      busId: '6872a8175e413196d6e2e829',
      startTime: { _seconds: 1759431654, _nanoseconds: 258000000 },
      departure: 'Colombo Fort',
      destination: 'Kandy',
      currentLocation: 'Colombo Fort',
      status: 'active'
    },

    // Document ID: 7K7Udu23zUTUydqT2K7x
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      busId: 'BUS00346w42',
      status: 'active',
      departure: 'Senbreejat',
      startTime: { _seconds: 1767520602, _nanoseconds: 317000000 },
      currentLocation: 'Senbreejat'
    },

    // Document ID: 82VXo4EprRbfYjSw17NP
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772899512, _nanoseconds: 935000000 },
      endTime: { _seconds: 1772899700, _nanoseconds: 168000000 },
      status: 'completed'
    },

    // Document ID: 86iCjM3Xtv9QEENNgwZK
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772770662, _nanoseconds: 868000000 },
      endTime: { _seconds: 1772770780, _nanoseconds: 450000000 },
      status: 'completed'
    },

    // Document ID: 86pjrS1cH7sNoczHafKa
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772903279, _nanoseconds: 505000000 },
      endTime: { _seconds: 1772903343, _nanoseconds: 746000000 },
      status: 'completed'
    },

    // Document ID: 8EjbRAL6x5YCYHh4N0lV
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772733246, _nanoseconds: 114000000 },
      status: 'active'
    },

    // Document ID: 8IKdQyO0cpZY5VMErodL
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770913400, _nanoseconds: 113000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1770913426, _nanoseconds: 871000000 },
      status: 'completed'
    },

    // Document ID: 8kWwnZP8a5luYZ2LTcgb
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771591147, _nanoseconds: 449000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: 8lnXZvsvPj2x8tTeAH3U
    {
      busId: 'NB-6544',
      currentLocation: 'Athukotte',
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772687309, _nanoseconds: 872000000 },
      status: 'active'
    },

    // Document ID: 8t0xwDlzTFocxgCLMNBs
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772769110, _nanoseconds: 90000000 },
      status: 'active'
    },

    // Document ID: 9FHlBV1Olut9cJGMQzLG
    {
      currentLocation: 'Senbreejat',
      startTime: { _seconds: 1767595222, _nanoseconds: 797000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      busId: 'BUS00346w42',
      status: 'active'
    },

    // Document ID: 9IbfXHAOVUKSr0rCJFLy
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772793345, _nanoseconds: 504000000 },
      endTime: { _seconds: 1772793565, _nanoseconds: 906000000 },
      status: 'completed'
    },

    // Document ID: 9jqf9HcbD5T6dKHrWWIP
    {
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1767591051, _nanoseconds: 214000000 },
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      endTime: { _seconds: 1767591123, _nanoseconds: 692000000 },
      status: 'completed'
    },

    // Document ID: 9u6P4wd64MZqjkoKfuYF
    {
      departure: 'Borella',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      status: 'active',
      busId: 'BUS00346w42',
      currentLocation: 'Borella',
      destination: 'Kollupitiya',
      startTime: { _seconds: 1767518787, _nanoseconds: 19000000 }
    },

    // Document ID: 9xUQyxbj4xfL85VXR8J0
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772825370, _nanoseconds: 955000000 },
      endTime: { _seconds: 1772825468, _nanoseconds: 949000000 },
      status: 'completed'
    },

    // Document ID: AEEOQf38japB2taO0h3z
    {
      startTime: { _seconds: 1767607752, _nanoseconds: 392000000 },
      departure: 'Borella',
      busId: 'BUS00346w42',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      status: 'active',
      currentLocation: 'Borella'
    },

    // Document ID: AjKXs4A8HYSPHxUr4ex6
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Pittugala',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772792063, _nanoseconds: 707000000 },
      status: 'active'
    },

    // Document ID: BJJVSuuaTDQvNRJYjUWf
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770923618, _nanoseconds: 464000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1770923630, _nanoseconds: 466000000 },
      status: 'completed'
    },

    // Document ID: Bkz98jHo18aEMrTKkGr3
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772188415, _nanoseconds: 93000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: CAWFwnm3ys7XR3NT2Mvp
    {
      busId: '6872a8175e413196d6e2e829',
      startTime: { _seconds: 1759293371, _nanoseconds: 686000000 },
      departure: 'Colombo Fort',
      destination: 'Kandy',
      currentLocation: 'Colombo Fort',
      status: 'active',
      passenger_Id: ''
    },

    // Document ID: CDmUPFtDQExhwZbGIWID
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771591300, _nanoseconds: 866000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: CeZ1Dmv50dqN63sRuMbB
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771918571, _nanoseconds: 972000000 },
      departure: 'Battaramulla',
      destination: 'Kollupitiya',
      currentLocation: 'Battaramulla',
      endTime: { _seconds: 1771918607, _nanoseconds: 998000000 },
      status: 'completed'
    },

    // Document ID: DRsyVal4uxGfmbHkkIAJ
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770920455, _nanoseconds: 846000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1770920556, _nanoseconds: 113000000 },
      status: 'completed'
    },

    // Document ID: Dsl0pkdJPbjJFa4Shxoi
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      departure: 'Senbreejat',
      startTime: { _seconds: 1767588756, _nanoseconds: 546000000 },
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      endTime: { _seconds: 1767588760, _nanoseconds: 46000000 },
      status: 'completed'
    },

    // Document ID: DzDKI5EVg5Pp2MYVBpGq
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-9344',
      startTime: { _seconds: 1772007983, _nanoseconds: 366000000 },
      departure: 'Rajagiriya',
      destination: 'Senbreejat',
      currentLocation: 'Rajagiriya',
      status: 'active'
    },

    // Document ID: E3fJiVbM0gmpiQUP7dwc
    {
      status: 'active',
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      departure: 'Borella',
      currentLocation: 'Borella',
      startTime: { _seconds: 1767520701, _nanoseconds: 274000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g'
    },

    // Document ID: EGLwVrNW2B9S4zJg5tQo
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772209980, _nanoseconds: 428000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: EVYe1ojONW6F4j4PwaPm
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772207338, _nanoseconds: 718000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772207500, _nanoseconds: 991000000 },
      status: 'completed'
    },

    // Document ID: EbPePMxwHNT7kyK0e2F7
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      startTime: { _seconds: 1767591518, _nanoseconds: 448000000 },
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      status: 'completed',
      endTime: { _seconds: 1767592255, _nanoseconds: 750000000 }
    },

    // Document ID: EjAOtuUrfaTKeVNwNZIj
    {
      departure: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      startTime: { _seconds: 1767524905, _nanoseconds: 914000000 },
      busId: 'BUS00346w42',
      endTime: { _seconds: 1767524919, _nanoseconds: 295000000 },
      status: 'completed'
    },

    // Document ID: FOktnbabuau5QbuUcL5l
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772182403, _nanoseconds: 671000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: FTbbC3YXyqWfX3hfzUjq
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772523117, _nanoseconds: 541000000 },
      status: 'active'
    },

    // Document ID: FUasF0ut6VrkhGzD7bUg
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770921219, _nanoseconds: 1000000 },
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      currentLocation: 'Athukotte',
      endTime: { _seconds: 1770921395, _nanoseconds: 851000000 },
      status: 'completed'
    },

    // Document ID: FhNq5QJqNkQC52jdyHPX
    {
      startTime: { _seconds: 1767608583, _nanoseconds: 126000000 },
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      status: 'active',
      currentLocation: 'Senbreejat'
    },

    // Document ID: Fqu0E21eCU1JiOcLv672
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772208440, _nanoseconds: 778000000 },
      departure: 'Borella',
      destination: 'Senbreejat',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: Ft5kERsaR6Lf4ql50uUN
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824145, _nanoseconds: 725000000 },
      status: 'active'
    },

    // Document ID: GGi2F8pFBieBKu9BZXNW
    {
      departure: 'Senbreejat',
      startTime: { _seconds: 1767521056, _nanoseconds: 943000000 },
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      status: 'active',
      currentLocation: 'Senbreejat'
    },

    // Document ID: GoEMA5sHvxi3hCDc03Aw
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772818235, _nanoseconds: 18000000 },
      endTime: { _seconds: 1772818362, _nanoseconds: 512000000 },
      status: 'completed'
    },

    // Document ID: GwmxaJu8NTzbEAZnYYQg
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772211920, _nanoseconds: 562000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: HCZjHUAOTPQpxPWAlkvA
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772198081, _nanoseconds: 818000000 },
      departure: 'Malabe',
      destination: 'Kollupitiya',
      currentLocation: 'Malabe',
      endTime: { _seconds: 1772198159, _nanoseconds: 941000000 },
      status: 'completed'
    },

    // Document ID: HTFF48jdgypGI3UoB3sc
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772171831, _nanoseconds: 252000000 },
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      currentLocation: 'Athukotte',
      endTime: { _seconds: 1772171953, _nanoseconds: 342000000 },
      status: 'completed'
    },

    // Document ID: I2INYx2kMvPyxmIEJbay
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770834792, _nanoseconds: 148000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770834835, _nanoseconds: 132000000 },
      status: 'completed'
    },

    // Document ID: I3Lfeqsx9jaB9Vo8Vjzc
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772182402, _nanoseconds: 323000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: I6nKKJ93rihKOMVSHsL2
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Athukotte',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772769820, _nanoseconds: 191000000 },
      endTime: { _seconds: 1772770194, _nanoseconds: 764000000 },
      status: 'completed'
    },

    // Document ID: Ia70RnD2Aw6iHnL9sAYH
    {
      status: 'active',
      startTime: { _seconds: 1767520753, _nanoseconds: 279000000 },
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      departure: 'Senbreejat',
      currentLocation: 'Senbreejat'
    },

    // Document ID: IhxOtfp5JrUVd6g4TaGm
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772899376, _nanoseconds: 854000000 },
      status: 'active'
    },

    // Document ID: IoVlHTrERDgx2BU11meY
    {
      startTime: { _seconds: 1767591138, _nanoseconds: 354000000 },
      busId: 'BUS00346w42',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1767591313, _nanoseconds: 659000000 },
      status: 'completed'
    },

    // Document ID: JUiBTSX4lf7fk4gSnVzf
    {
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      startTime: { _seconds: 1767606489, _nanoseconds: 262000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      endTime: { _seconds: 1767606820, _nanoseconds: 548000000 },
      status: 'completed'
    },

    // Document ID: Jdd4vLE4N1tNSi4hfNdi
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Borella',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772892587, _nanoseconds: 774000000 },
      status: 'active'
    },

    // Document ID: KIsYf8fFb2N9wXWr1AQq
    {
      currentLocation: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      departure: 'Borella',
      busId: 'BUS00346w42',
      status: 'active',
      startTime: { _seconds: 1767518897, _nanoseconds: 587000000 }
    },

    // Document ID: Kvc8pfU2DTin60S7APQK
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772795271, _nanoseconds: 357000000 },
      endTime: { _seconds: 1772795289, _nanoseconds: 573000000 },
      status: 'completed'
    },

    // Document ID: LDGzaCezxXZgdGpiXLh5
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824147, _nanoseconds: 120000000 },
      endTime: { _seconds: 1772824231, _nanoseconds: 879000000 },
      status: 'completed'
    },

    // Document ID: LIiqzxFHq6DracK71Up7
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770923345, _nanoseconds: 572000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770923477, _nanoseconds: 420000000 },
      status: 'completed'
    },

    // Document ID: LcqYfhEEpvsYRxQbVvsD
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772249113, _nanoseconds: 984000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772249166, _nanoseconds: 572000000 },
      status: 'completed'
    },

    // Document ID: Ltzs9dhU3MTyXzns2E6m
    {
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      currentLocation: 'Senbreejat',
      startTime: { _seconds: 1767588777, _nanoseconds: 280000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      endTime: { _seconds: 1767589529, _nanoseconds: 968000000 },
      status: 'completed'
    },

    // Document ID: M5mtmSN9QbCVCVQkPilu
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824914, _nanoseconds: 687000000 },
      status: 'active'
    },

    // Document ID: MxBHRPDwS8qYHAzpZ2m1
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772340433, _nanoseconds: 13000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772340903, _nanoseconds: 435000000 },
      status: 'completed'
    },

    // Document ID: NhVAPWxZapXY78OGf1UQ
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772188124, _nanoseconds: 932000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: NyU9RSnt0c6faLvqTji4
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772874249, _nanoseconds: 207000000 },
      status: 'active'
    },

    // Document ID: OBdfly4L8sXJCb0NHcJx
    {
      busId: 'BUS00346w42',
      startTime: { _seconds: 1767590108, _nanoseconds: 752000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      endTime: { _seconds: 1767590334, _nanoseconds: 795000000 },
      status: 'completed'
    },

    // Document ID: OIdrzGW4N8Wjht5ahN3p
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'Bjggjj',
      startTime: { _seconds: 1771520569, _nanoseconds: 296000000 },
      departure: 'Fort',
      destination: 'Pettah',
      currentLocation: 'Fort',
      endTime: { _seconds: 1771520592, _nanoseconds: 671000000 },
      status: 'completed'
    },

    // Document ID: OOlZaly2ZASjBYWBbDg8
    {
      startTime: { _seconds: 1767590826, _nanoseconds: 861000000 },
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      endTime: { _seconds: 1767591032, _nanoseconds: 601000000 },
      status: 'completed'
    },

    // Document ID: Obty7uVVQ5xFZx3LlLfS
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772043442, _nanoseconds: 301000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1772043466, _nanoseconds: 537000000 },
      status: 'completed'
    },

    // Document ID: OfGbvr1ggTyTaVBZ0OcN
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770918210, _nanoseconds: 622000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770918247, _nanoseconds: 515000000 },
      status: 'completed'
    },

    // Document ID: OhPrXSEobmnVExRVRs2R
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769619500, _nanoseconds: 237000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1769619518, _nanoseconds: 471000000 },
      status: 'completed'
    },

    // Document ID: PPLUyQ0UwpqwJFSV6jAs
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Athukotte',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772794049, _nanoseconds: 369000000 },
      endTime: { _seconds: 1772794278, _nanoseconds: 263000000 },
      status: 'completed'
    },

    // Document ID: PbmoIjeyCcg9vNt72BEB
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772272570, _nanoseconds: 466000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: Q5wv7XkuNLz6ZCYSpKZo
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772767430, _nanoseconds: 92000000 },
      endTime: { _seconds: 1772767686, _nanoseconds: 530000000 },
      status: 'completed'
    },

    // Document ID: Qk38zCMtWCEzLLd7wSAL
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772186957, _nanoseconds: 921000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772186989, _nanoseconds: 928000000 },
      status: 'completed'
    },

    // Document ID: R8wUc9DJ3m1GFPn7JDim
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770915872, _nanoseconds: 835000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770915883, _nanoseconds: 574000000 },
      status: 'completed'
    },

    // Document ID: RP2kvjEbWvf0CfYXAcuM
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772559098, _nanoseconds: 458000000 },
      endTime: { _seconds: 1772559167, _nanoseconds: 806000000 },
      status: 'completed'
    },

    // Document ID: Rb2b4bMlus2Zx7nZ8i1b
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772768893, _nanoseconds: 581000000 },
      status: 'active'
    },

    // Document ID: RqmeC1urNpp8SiYhZiPp
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824145, _nanoseconds: 719000000 },
      status: 'active'
    },

    // Document ID: Rw7k2QNmshdPWcpCov6B
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772199992, _nanoseconds: 768000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772200014, _nanoseconds: 951000000 },
      status: 'completed'
    },

    // Document ID: RykIV2J3MgwbST6KpJRy
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824145, _nanoseconds: 721000000 },
      status: 'active'
    },

    // Document ID: S3ykYmoK1vJmbBxHcssk
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772131345, _nanoseconds: 601000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: SJdWaotjOQSiXrRKkhrX
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772172028, _nanoseconds: 488000000 },
      departure: 'Pittugala',
      destination: 'Koswatta',
      currentLocation: 'Pittugala',
      endTime: { _seconds: 1772172046, _nanoseconds: 896000000 },
      status: 'completed'
    },

    // Document ID: SUAoJ5EwLtNBG5tlUF22
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772208840, _nanoseconds: 656000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      status: 'active'
    },

    // Document ID: TCnZfVKUQqZ0kh1hXREF
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772207704, _nanoseconds: 681000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: TUenm7mq0awxSj8ONlXv
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772792569, _nanoseconds: 733000000 },
      endTime: { _seconds: 1772792743, _nanoseconds: 765000000 },
      status: 'completed'
    },

    // Document ID: TmfFD4zPqYx4IRgxYtNt
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824146, _nanoseconds: 786000000 },
      status: 'active'
    },

    // Document ID: TwDtb6iiDNu6aOoyf3dg
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772820721, _nanoseconds: 394000000 },
      endTime: { _seconds: 1772822151, _nanoseconds: 29000000 },
      status: 'completed'
    },

    // Document ID: UBz6YfyKFtmCfXiy9QDC
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772249290, _nanoseconds: 639000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: UUgPEAxTQVb5jvEBbEOJ
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772817514, _nanoseconds: 983000000 },
      endTime: { _seconds: 1772817654, _nanoseconds: 112000000 },
      status: 'completed'
    },

    // Document ID: UVTjNSSeWBXqX22xjWLz
    {
      currentLocation: 'Senbreejat',
      status: 'active',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767520661, _nanoseconds: 951000000 }
    },

    // Document ID: UW0HeD79hqIMACulnFGg
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772272568, _nanoseconds: 224000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: UwW91guwJAD6cnJonc10
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772213190, _nanoseconds: 838000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772213332, _nanoseconds: 636000000 },
      status: 'completed'
    },

    // Document ID: V2iVoRFoQafOO0TUoNDV
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769618988, _nanoseconds: 308000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1769619032, _nanoseconds: 312000000 },
      status: 'completed'
    },

    // Document ID: WSjbtiOkme8PrrmKsdUk
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772252350, _nanoseconds: 594000000 },
      departure: 'Battaramulla',
      destination: 'Kollupitiya',
      currentLocation: 'Battaramulla',
      status: 'active'
    },

    // Document ID: Wf4VEXTpOrnNydU4yJtF
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770148504, _nanoseconds: 905000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1770148525, _nanoseconds: 192000000 },
      status: 'completed'
    },

    // Document ID: WfUjXhZkekvhvCVbz6f6
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772312604, _nanoseconds: 288000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772312618, _nanoseconds: 318000000 },
      status: 'completed'
    },

    // Document ID: WjFQprvzWDjgXfU6O9mx
    {
      busId: 'NB-6544',
      currentLocation: 'Battaramulla',
      departure: 'Battaramulla',
      destination: 'Borella',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772891549, _nanoseconds: 924000000 },
      endTime: { _seconds: 1772892237, _nanoseconds: 135000000 },
      status: 'completed'
    },

    // Document ID: XNut74srHSlISoXOI1he
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772248687, _nanoseconds: 137000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1772248900, _nanoseconds: 102000000 },
      status: 'completed'
    },

    // Document ID: XRpLeZmQO1vdgJFpX2NL
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769686822, _nanoseconds: 971000000 },
      departure: 'Borella',
      destination: 'Senbreejat',
      currentLocation: 'Borella',
      endTime: { _seconds: 1769686857, _nanoseconds: 368000000 },
      status: 'completed'
    },

    // Document ID: Xbmy9UfBOT5KNieuFoNb
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772203163, _nanoseconds: 368000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: XcynrvHLyz8YyKiSGOY3
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Athukotte',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772732693, _nanoseconds: 345000000 },
      endTime: { _seconds: 1772732762, _nanoseconds: 404000000 },
      status: 'completed'
    },

    // Document ID: XjAh2zeyUoMta3VKb06A
    {
      busId: '6872a8175e413196d6e2e829',
      startTime: { _seconds: 1767515409, _nanoseconds: 496000000 },
      status: 'active',
      destination: 'Kandy',
      currentLocation: 'Colombo Fort',
      departure: 'Colombo Fort',
      passengerId: '8Mdv4FoEAjD4Zn6XzjZB'
    },

    // Document ID: YDkwEnUHOzBIXjDudXiR
    {
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      status: 'active',
      startTime: { _seconds: 1767520926, _nanoseconds: 692000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Senbreejat',
      busId: 'BUS00346w42'
    },

    // Document ID: YJWgk6kICvWqRiH6WL95
    {
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      status: 'active',
      startTime: { _seconds: 1767589533, _nanoseconds: 78000000 },
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya'
    },

    // Document ID: YWoiaoocMPiGV0FFkxGs
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772727566, _nanoseconds: 887000000 },
      endTime: { _seconds: 1772727601, _nanoseconds: 119000000 },
      status: 'completed'
    },

    // Document ID: Ya5EifjlUnzITv6WiktE
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772481451, _nanoseconds: 173000000 },
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'rajagiriya',
      endTime: { _seconds: 1772481744, _nanoseconds: 299000000 },
      status: 'completed'
    },

    // Document ID: YkOU3CjEcl9iUjonCN52
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772794683, _nanoseconds: 729000000 },
      status: 'active'
    },

    // Document ID: Z7yNeFT1aCLctSYQqbGd
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'rajagiriya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772486054, _nanoseconds: 137000000 },
      endTime: { _seconds: 1772486063, _nanoseconds: 381000000 },
      status: 'completed'
    },

    // Document ID: ZDmluLzr2GPQKqcTQmiK
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'eNkmi20myFcFJYGeITL8',
      startTime: { _seconds: 1772483471, _nanoseconds: 278000000 },
      endTime: { _seconds: 1772483478, _nanoseconds: 911000000 },
      status: 'completed'
    },

    // Document ID: ZVGY62OWMCxvCY2xi7lF
    {
      currentLocation: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767589589, _nanoseconds: 71000000 },
      busId: 'BUS00346w42',
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      endTime: { _seconds: 1767590089, _nanoseconds: 536000000 },
      status: 'completed'
    },

    // Document ID: a9ah8uBjkiMkUPUmf82I
    {
      departure: 'Senbreejat',
      status: 'active',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767517590, _nanoseconds: 910000000 },
      currentLocation: 'Senbreejat',
      busId: 'BUS00346w42'
    },

    // Document ID: aBTHPp0QiJulwPmhgamv
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772923494, _nanoseconds: 599000000 },
      status: 'active'
    },

    // Document ID: aUF80pvAe34ISKkit0Vu
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Kollupitiya',
      passengerId: 'eNkmi20myFcFJYGeITL8',
      startTime: { _seconds: 1772481975, _nanoseconds: 386000000 },
      endTime: { _seconds: 1772482148, _nanoseconds: 476000000 },
      status: 'completed'
    },

    // Document ID: amcJsWVEStLpJj0t3bJx
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769619370, _nanoseconds: 208000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1769619416, _nanoseconds: 262000000 },
      status: 'completed'
    },

    // Document ID: atVBvdr25Ku0DqMJZMOZ
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772793652, _nanoseconds: 856000000 },
      status: 'active'
    },

    // Document ID: bDKndOw81Wj3odWhIfBP
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772794334, _nanoseconds: 148000000 },
      endTime: { _seconds: 1772794535, _nanoseconds: 75000000 },
      status: 'completed'
    },

    // Document ID: bVNACIpT5ZkmsDYf8jLI
    {
      busId: 'NB-6544',
      currentLocation: 'Athukotte',
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772727216, _nanoseconds: 955000000 },
      endTime: { _seconds: 1772727329, _nanoseconds: 779000000 },
      status: 'completed'
    },

    // Document ID: bcd3E2s4Q8gNDMvcXaRj
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772523095, _nanoseconds: 934000000 },
      status: 'active'
    },

    // Document ID: bk6HFjc4ikWfHWrdy9O8
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770913759, _nanoseconds: 352000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1770913789, _nanoseconds: 2000000 },
      status: 'completed'
    },

    // Document ID: cqhkHpx85tATRsJnOJ6U
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772284307, _nanoseconds: 997000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772284439, _nanoseconds: 781000000 },
      status: 'completed'
    },

    // Document ID: d4aMZZB7G6NktVGwOvdd
    {
      destination: 'Kollupitiya',
      departure: 'Senbreejat',
      busId: 'BUS00346w42',
      currentLocation: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1767607179, _nanoseconds: 901000000 },
      endTime: { _seconds: 1767607673, _nanoseconds: 896000000 },
      status: 'completed'
    },

    // Document ID: dOvHJitD9eB9HKOFO6Oh
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1771999999, _nanoseconds: 92000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772000050, _nanoseconds: 720000000 },
      status: 'completed'
    },

    // Document ID: diJkVdXk9m3nLtKdGRqS
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772209004, _nanoseconds: 962000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      status: 'active'
    },

    // Document ID: eXFzVuCMuiLCryakVmBg
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772559198, _nanoseconds: 967000000 },
      status: 'active'
    },

    // Document ID: esKfrXxOxxrDJvF4ss4l
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772766002, _nanoseconds: 949000000 },
      endTime: { _seconds: 1772766294, _nanoseconds: 721000000 },
      status: 'completed'
    },

    // Document ID: euxiNwD82JmJGuuqTIES
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772523120, _nanoseconds: 245000000 },
      endTime: { _seconds: 1772523131, _nanoseconds: 246000000 },
      status: 'completed'
    },

    // Document ID: exFdDAynVtEZzFMGdGlg
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772199645, _nanoseconds: 94000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772199959, _nanoseconds: 882000000 },
      status: 'completed'
    },

    // Document ID: fdtywvUg4EHb9RO3OVZE
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772794687, _nanoseconds: 324000000 },
      endTime: { _seconds: 1772794831, _nanoseconds: 352000000 },
      status: 'completed'
    },

    // Document ID: fzfPEe7tDltrWikuTKov
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Athukotte',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772822902, _nanoseconds: 391000000 },
      status: 'active'
    },

    // Document ID: g3OweAWbM1lAQFptGx7C
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769622057, _nanoseconds: 278000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1769622064, _nanoseconds: 287000000 },
      status: 'completed'
    },

    // Document ID: hQW714xMbV36rZGcpP0G
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-9344',
      startTime: { _seconds: 1772200369, _nanoseconds: 663000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772200378, _nanoseconds: 642000000 },
      status: 'completed'
    },

    // Document ID: hj5pjBmDJNKJgJUT8wLI
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772208634, _nanoseconds: 63000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: hv6dkYQ6cSmbHkWTy1Ef
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772767348, _nanoseconds: 209000000 },
      endTime: { _seconds: 1772767431, _nanoseconds: 985000000 },
      status: 'completed'
    },

    // Document ID: i54v1hRhXekOoRPcCaAj
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'rajagiriya',
      passengerId: 'eNkmi20myFcFJYGeITL8',
      startTime: { _seconds: 1772483506, _nanoseconds: 551000000 },
      endTime: { _seconds: 1772483543, _nanoseconds: 845000000 },
      status: 'completed'
    },

    // Document ID: i9AvJ0lefBVe70DL9tWn
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770150596, _nanoseconds: 482000000 },
      departure: 'Borella',
      destination: 'Senbreejat',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770150611, _nanoseconds: 982000000 },
      status: 'completed'
    },

    // Document ID: iAwNsAFKhUWCL7m6bbTi
    {
      busId: 'NB-6544',
      currentLocation: 'Athukotte',
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772687310, _nanoseconds: 358000000 },
      endTime: { _seconds: 1772687565, _nanoseconds: 882000000 },
      status: 'completed'
    },

    // Document ID: iFU8VYgeHUXYxLaFEfjQ
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772208270, _nanoseconds: 382000000 },
      departure: 'Malabe',
      destination: 'Kollupitiya',
      currentLocation: 'Malabe',
      status: 'active'
    },

    // Document ID: iPSKT3c8YcbJWHfKnLY0
    {
      status: 'active',
      destination: 'Kollupitiya',
      startTime: { _seconds: 1767588397, _nanoseconds: 360000000 },
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42'
    },

    // Document ID: idg4Huai9c5sjZlyX2Kd
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1771997052, _nanoseconds: 30000000 },
      departure: 'Kollupitiya',
      destination: 'Senbreejat',
      currentLocation: 'Kollupitiya',
      endTime: { _seconds: 1771997181, _nanoseconds: 747000000 },
      status: 'completed'
    },

    // Document ID: jNe8AMK4iYbhzu8AOclN
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772188125, _nanoseconds: 905000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772188132, _nanoseconds: 773000000 },
      status: 'completed'
    },

    // Document ID: jWCU7PDY3u37xOxnQEig
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772795329, _nanoseconds: 980000000 },
      endTime: { _seconds: 1772795720, _nanoseconds: 640000000 },
      status: 'completed'
    },

    // Document ID: jXFnMrA1zX8VYdGxfbAn
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824145, _nanoseconds: 721000000 },
      status: 'active'
    },

    // Document ID: jrGgMJfD1vHcBWGr52AT
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772209348, _nanoseconds: 542000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772209442, _nanoseconds: 219000000 },
      status: 'completed'
    },

    // Document ID: jtWrN0fB582JiMOyWjsG
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824147, _nanoseconds: 51000000 },
      status: 'active'
    },

    // Document ID: jwWrHreXJuNtl3dCeTij
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Athukotte',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772794055, _nanoseconds: 220000000 },
      status: 'active'
    },

    // Document ID: k8dtCUcaTVgF8KE36LAH
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772281394, _nanoseconds: 940000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: kD9vlGplXUIymXttKM8Y
    {
      currentLocation: 'Borella',
      startTime: { _seconds: 1767539691, _nanoseconds: 690000000 },
      busId: 'BUS00346w42',
      departure: 'Borella',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      destination: 'Kollupitiya',
      endTime: { _seconds: 1767539862, _nanoseconds: 592000000 },
      status: 'completed'
    },

    // Document ID: kfL5hsarLCHlFrFwIKvw
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824915, _nanoseconds: 210000000 },
      endTime: { _seconds: 1772825002, _nanoseconds: 102000000 },
      status: 'completed'
    },

    // Document ID: l8MaeoAgASKvx5sXco3q
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772727565, _nanoseconds: 572000000 },
      status: 'active'
    },

    // Document ID: lhnL22Is04v4iyafU7Cy
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771918671, _nanoseconds: 955000000 },
      departure: 'Borella',
      destination: 'Rajagiriya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1771918704, _nanoseconds: 499000000 },
      status: 'completed'
    },

    // Document ID: msMva31AmyKJNPjoe0dH
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772208553, _nanoseconds: 654000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: nZGXXRG2UHrBn1wJr9eb
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772559699, _nanoseconds: 409000000 },
      status: 'active'
    },

    // Document ID: nkuOK4yVWObFPjaBOsU6
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772211519, _nanoseconds: 148000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1772211560, _nanoseconds: 377000000 },
      status: 'completed'
    },

    // Document ID: nniEI1URK0os1izTCZq4
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772898294, _nanoseconds: 347000000 },
      endTime: { _seconds: 1772899065, _nanoseconds: 77000000 },
      status: 'completed'
    },

    // Document ID: ns7VpAqCOdYbwq2HWS5c
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Koswatta',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772790786, _nanoseconds: 973000000 },
      status: 'active'
    },

    // Document ID: nvz38YPim57dxmT5F7Nr
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772795794, _nanoseconds: 98000000 },
      endTime: { _seconds: 1772795889, _nanoseconds: 858000000 },
      status: 'completed'
    },

    // Document ID: oDipn1G5r9EI3P8WtrVe
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772769159, _nanoseconds: 352000000 },
      endTime: { _seconds: 1772769319, _nanoseconds: 902000000 },
      status: 'completed'
    },

    // Document ID: pCspeYPOCsuZPIk6Jp4S
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772198880, _nanoseconds: 930000000 },
      departure: 'Borella',
      destination: 'Senbreejat',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772199446, _nanoseconds: 896000000 },
      status: 'completed'
    },

    // Document ID: pOmKd7Ne1EirAac9qdXt
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1771599988, _nanoseconds: 717000000 },
      departure: 'Athukotte',
      destination: 'Kollupitiya',
      currentLocation: 'Athukotte',
      endTime: { _seconds: 1771600095, _nanoseconds: 524000000 },
      status: 'completed'
    },

    // Document ID: peIxtPDW8EMyghuJQDns
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772819249, _nanoseconds: 535000000 },
      endTime: { _seconds: 1772819405, _nanoseconds: 661000000 },
      status: 'completed'
    },

    // Document ID: penJeeq3oQEmd9DyR0tT
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824914, _nanoseconds: 138000000 },
      status: 'active'
    },

    // Document ID: pualq064peWDjfLpole5
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772795788, _nanoseconds: 675000000 },
      status: 'active'
    },

    // Document ID: qGZJbzIj7dO6HNbYQbLD
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772793216, _nanoseconds: 17000000 },
      status: 'active'
    },

    // Document ID: qLjdcXTM07cfHl17nyxz
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1770913636, _nanoseconds: 627000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1770913654, _nanoseconds: 586000000 },
      status: 'completed'
    },

    // Document ID: qNeLG1vg58BZJQIeVGyE
    {
      status: 'active',
      startTime: { _seconds: 1767517271, _nanoseconds: 104000000 },
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      destination: 'Kollupitiya'
    },

    // Document ID: qnymOcd37NquvZPC1kUy
    {
      busId: 'NB-6544',
      currentLocation: 'Borella',
      departure: 'Borella',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772792951, _nanoseconds: 558000000 },
      status: 'active'
    },

    // Document ID: qsw5Mq5IxndBICsamPwb
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772767945, _nanoseconds: 166000000 },
      endTime: { _seconds: 1772768258, _nanoseconds: 746000000 },
      status: 'completed'
    },

    // Document ID: rO16GZQ25Q7Z9U8LvZ01
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Senbreejat',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772817843, _nanoseconds: 948000000 },
      status: 'active'
    },

    // Document ID: rSU5xMvxhBXjQpWNG96j
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824147, _nanoseconds: 97000000 },
      status: 'active'
    },

    // Document ID: rWZQD4qNO3dlTItGEJD9
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772131407, _nanoseconds: 806000000 },
      departure: 'Koswatta',
      destination: 'Rajagiriya',
      currentLocation: 'Koswatta',
      endTime: { _seconds: 1772131505, _nanoseconds: 452000000 },
      status: 'completed'
    },

    // Document ID: roXVKmzcsQmBYbZaRMXz
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772727631, _nanoseconds: 919000000 },
      endTime: { _seconds: 1772727712, _nanoseconds: 265000000 },
      status: 'completed'
    },

    // Document ID: rqKx2571b4pZvin1Vf4t
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772767453, _nanoseconds: 814000000 },
      endTime: { _seconds: 1772767828, _nanoseconds: 972000000 },
      status: 'completed'
    },

    // Document ID: sPqGnKWgrMgQsL2f1req
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772182404, _nanoseconds: 2000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772182814, _nanoseconds: 485000000 },
      status: 'completed'
    },

    // Document ID: sYRSaW1VfyS0SG3CGZOo
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      currentLocation: 'Borella',
      destination: 'Kollupitiya',
      departure: 'Borella',
      startTime: { _seconds: 1767516021, _nanoseconds: 834000000 },
      status: 'active',
      busId: 'BUS00346w42'
    },

    // Document ID: sp8gc8hBSrksksJQqP9w
    {
      busId: 'NB-6544',
      currentLocation: 'Senbreejat',
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772819737, _nanoseconds: 333000000 },
      endTime: { _seconds: 1772819870, _nanoseconds: 218000000 },
      status: 'completed'
    },

    // Document ID: tB7tRxIxXUsb29HBxIK7
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772899511, _nanoseconds: 674000000 },
      status: 'active'
    },

    // Document ID: tChUHjBTovqoFsYYGuhs
    {
      busId: 'NB-6544',
      currentLocation: 'rajagiriya',
      departure: 'rajagiriya',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772521773, _nanoseconds: 94000000 },
      endTime: { _seconds: 1772522725, _nanoseconds: 858000000 },
      status: 'completed'
    },

    // Document ID: tUVmlAqkHrFazXyiwg7a
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772248926, _nanoseconds: 757000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772249063, _nanoseconds: 598000000 },
      status: 'completed'
    },

    // Document ID: tks0dukcznrEacyUFeKh
    {
      busId: 'NB-6544',
      currentLocation: 'Kothalawala',
      departure: 'Kothalawala',
      destination: 'Koswatta',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772790788, _nanoseconds: 249000000 },
      endTime: { _seconds: 1772790991, _nanoseconds: 469000000 },
      status: 'completed'
    },

    // Document ID: twuwprHj8tdlQgKHWLh1
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772037069, _nanoseconds: 49000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      status: 'active'
    },

    // Document ID: u5VRS0BGoc1hagOhO5rP
    {
      busId: '6872a8175e413196d6e2e829',
      startTime: { _seconds: 1759292815, _nanoseconds: 96000000 },
      departure: 'Colombo Fort',
      destination: 'Kandy',
      currentLocation: 'Colombo Fort',
      status: 'active'
    },

    // Document ID: ucUobrkm0DfgVGrxBmTs
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772004654, _nanoseconds: 539000000 },
      departure: 'Senbreejat',
      destination: 'Koswatta',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772004730, _nanoseconds: 262000000 },
      status: 'completed'
    },

    // Document ID: uvrKA6zBJoe3pCYTJ0yp
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'BUS00346w42',
      startTime: { _seconds: 1769540995, _nanoseconds: 626000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1769541127, _nanoseconds: 431000000 },
      status: 'completed'
    },

    // Document ID: vHdEl1gHSOo7D3QVvHDj
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'rajagiriya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772768998, _nanoseconds: 35000000 },
      status: 'active'
    },

    // Document ID: vXufwTfjmi0NTlLBRNEj
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772209498, _nanoseconds: 637000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      endTime: { _seconds: 1772209529, _nanoseconds: 565000000 },
      status: 'completed'
    },

    // Document ID: vlbznoEv3Ec6hI8o48zD
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-9344',
      startTime: { _seconds: 1772018221, _nanoseconds: 820000000 },
      departure: 'Rajagiriya',
      destination: 'Kollupitiya',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1772018252, _nanoseconds: 484000000 },
      status: 'completed'
    },

    // Document ID: wXlOJEKN6YNVSKL9QFyS
    {
      departure: 'Senbreejat',
      startTime: { _seconds: 1767539884, _nanoseconds: 638000000 },
      busId: 'BUS00346w42',
      currentLocation: 'Senbreejat',
      destination: 'Kollupitiya',
      status: 'active',
      passengerId: 'lwR9S9gJzEvhVucXe57g'
    },

    // Document ID: xI9ctm5238W6QA36vVqa
    {
      busId: 'NB-6544',
      currentLocation: 'Malabe',
      departure: 'Malabe',
      destination: 'Kollupitiya',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772959496, _nanoseconds: 215000000 },
      endTime: { _seconds: 1772959515, _nanoseconds: 636000000 },
      status: 'completed'
    },

    // Document ID: xSnjH8rUsg7LBJehtZjl
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772766774, _nanoseconds: 691000000 },
      endTime: { _seconds: 1772766990, _nanoseconds: 932000000 },
      status: 'completed'
    },

    // Document ID: xXESukzqyhmKMc8EtPuY
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772211807, _nanoseconds: 214000000 },
      departure: 'Borella',
      destination: 'Kollupitiya',
      currentLocation: 'Borella',
      status: 'active'
    },

    // Document ID: xrbcTr0KrHgKWU7iBVvy
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772122818, _nanoseconds: 196000000 },
      departure: 'Athukotte',
      destination: 'Borella',
      currentLocation: 'Athukotte',
      endTime: { _seconds: 1772123119, _nanoseconds: 919000000 },
      status: 'completed'
    },

    // Document ID: yBex5SMPSG1NDqLPlvXJ
    {
      currentLocation: 'Colombo Fort',
      departure: 'Colombo Fort',
      destination: 'Kandy',
      startTime: { _seconds: 1767523573, _nanoseconds: 497000000 },
      busId: '6872a8175e413196d6e2e829',
      passengerId: '8Mdv4FoEAjD4Zn6XzjZB',
      endTime: { _seconds: 1767524871, _nanoseconds: 175000000 },
      status: 'completed'
    },

    // Document ID: yKNyaIpf2mLt8lFBvOhX
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772212908, _nanoseconds: 376000000 },
      departure: 'Rajagiriya',
      destination: 'Senbreejat',
      currentLocation: 'Rajagiriya',
      endTime: { _seconds: 1772213167, _nanoseconds: 938000000 },
      status: 'completed'
    },

    // Document ID: yy8ayOy5epH164nVAaG2
    {
      busId: 'NB-6544',
      currentLocation: 'Pittugala',
      departure: 'Pittugala',
      destination: 'Malabe',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772824914, _nanoseconds: 146000000 },
      status: 'active'
    },

    // Document ID: z4PXLjImscZZy8k2APtv
    {
      busId: 'NB-6544',
      currentLocation: 'Koswatta',
      departure: 'Koswatta',
      destination: 'Battaramulla',
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      startTime: { _seconds: 1772767910, _nanoseconds: 540000000 },
      endTime: { _seconds: 1772768279, _nanoseconds: 837000000 },
      status: 'completed'
    },

    // Document ID: zGnxzGJLOwor7H6WAs9v
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772198192, _nanoseconds: 821000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772198264, _nanoseconds: 907000000 },
      status: 'completed'
    },

    // Document ID: zKyMOktjG75GPkiqj8Gc
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772212285, _nanoseconds: 895000000 },
      departure: 'Senbreejat',
      destination: 'Kollupitiya',
      currentLocation: 'Senbreejat',
      endTime: { _seconds: 1772212872, _nanoseconds: 223000000 },
      status: 'completed'
    },

    // Document ID: zvI65lVAfN1sIJJuoqeN
    {
      passengerId: 'lwR9S9gJzEvhVucXe57g',
      busId: 'NB-6544',
      startTime: { _seconds: 1772207756, _nanoseconds: 110000000 },
      departure: 'Koswatta',
      destination: 'Borella',
      currentLocation: 'Koswatta',
      status: 'active'
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedTrips
};
