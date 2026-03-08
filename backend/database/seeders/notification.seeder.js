const { Notification } = require('../../modelsN');
const { seedCollection } = require('./helpers');

const COLLECTION = 'notifications';

async function seedNotifications(db) {
  const data = [
    // Document ID: 5qBHcosS0V0e87bqG7Ur
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770057400, _nanoseconds: 337000000 },
      read: true
    },

    // Document ID: 5uQTzY4z26wdlFsAXPuY
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153488, _nanoseconds: 805000000 },
      read: true
    },

    // Document ID: 6Noj7TJuJ8KT5Dd2SUYf
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769710538, _nanoseconds: 772000000 },
      read: true
    },

    // Document ID: 7Z0OeYulRo4nJhwJxHs1
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690432, _nanoseconds: 41000000 },
      read: true
    },

    // Document ID: APXBeRIDk3P1D6o3ao5L
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770835227, _nanoseconds: 531000000 },
      read: true
    },

    // Document ID: BaeA6peQzFp3zJfdjFqR
    {
      userId: '8Mdv4FoEAjD4Zn6XzjZB',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      read: false,
      createdAt: { _seconds: 1769621667, _nanoseconds: 421000000 }
    },

    // Document ID: DGDfcBONw9h2v8R5BIHF
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153905, _nanoseconds: 73000000 },
      read: true
    },

    // Document ID: DqKxjKRyLAjeQvUhstB2
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769688935, _nanoseconds: 805000000 },
      read: true
    },

    // Document ID: F6KSAxLnjZ8KvQfn7rad
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770871742, _nanoseconds: 460000000 },
      read: true
    },

    // Document ID: FSiC10YuUVksUTiqMwiG
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769689065, _nanoseconds: 916000000 },
      read: true
    },

    // Document ID: FdZj5YdhFZ2jvhZrXGTg
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153727, _nanoseconds: 383000000 },
      read: true
    },

    // Document ID: GKk5qKmtHJJTueLLsBbm
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769710830, _nanoseconds: 60000000 },
      read: true
    },

    // Document ID: GztxuDj8LMis5QPWMGq3
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153376, _nanoseconds: 780000000 },
      read: true
    },

    // Document ID: JyHFyc9ZjzA79ZYa8FnB
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770871625, _nanoseconds: 834000000 },
      read: true
    },

    // Document ID: KNEQxsLlLv554WzU0OZb
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1771566849, _nanoseconds: 220000000 },
      read: true
    },

    // Document ID: MBul4Xj6fkETtEKWGl8C
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770871722, _nanoseconds: 299000000 },
      read: true
    },

    // Document ID: MiBuN5A1F39ugYvjBFqV
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769710551, _nanoseconds: 136000000 },
      read: true
    },

    // Document ID: MtknTIsNbDcwZCqRswLY
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153354, _nanoseconds: 57000000 },
      read: true
    },

    // Document ID: Nwro6VNHEznK2Mq0S3bl
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153660, _nanoseconds: 422000000 },
      read: true
    },

    // Document ID: QEeT4ACpJdFXWWPl3TRP
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1771566833, _nanoseconds: 599000000 },
      read: true
    },

    // Document ID: R4e0u7ZSh5ei8EKi4kyU
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769688896, _nanoseconds: 147000000 },
      read: true
    },

    // Document ID: TsJxHQTirCUo42RWbOxu
    {
      userId: '8Mdv4FoEAjD4Zn6XzjZB',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      read: false,
      createdAt: { _seconds: 1769621701, _nanoseconds: 309000000 }
    },

    // Document ID: UMqcyELqsz2KokbYj40F
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770871407, _nanoseconds: 776000000 },
      read: true
    },

    // Document ID: YuXdhgcl8UtxziwgZ0Gq
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690305, _nanoseconds: 510000000 },
      read: true
    },

    // Document ID: ZGPnpcMCfcgyatqihgtn
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769689056, _nanoseconds: 600000000 },
      read: true
    },

    // Document ID: bHcqn23pou2FdS5PtEgx
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770154168, _nanoseconds: 503000000 },
      read: true
    },

    // Document ID: cSlIXxbEcvtCN0LkHT50
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690226, _nanoseconds: 790000000 },
      read: true
    },

    // Document ID: cbOtxji8yaLcwKUSqbGs
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769626005, _nanoseconds: 521000000 },
      read: true
    },

    // Document ID: dkSlrBPO3K5K8TSFIX5S
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153980, _nanoseconds: 979000000 },
      read: true
    },

    // Document ID: f0gxB6PN9lqhaHVFLAx9
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770871733, _nanoseconds: 429000000 },
      read: true
    },

    // Document ID: g68h7Nhm2B4yK4hqNQ3L
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770151929, _nanoseconds: 443000000 },
      read: true
    },

    // Document ID: h19VFE32r1hSjMCmLgUH
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770913553, _nanoseconds: 625000000 },
      read: true
    },

    // Document ID: hspHqGiXCvq8xYxujNrd
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153719, _nanoseconds: 18000000 },
      read: true
    },

    // Document ID: jVsKvmgWVrbdxW73IlSB
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770154052, _nanoseconds: 68000000 },
      read: true
    },

    // Document ID: kozo8AfXUjmv30s9c4BM
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153067, _nanoseconds: 463000000 },
      read: true
    },

    // Document ID: lXwPH9giyAjn3qBxWQ5l
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153172, _nanoseconds: 761000000 },
      read: true
    },

    // Document ID: m7BMxSMGYYLZTZLDYXqa
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'dcws',
      title: 'gchejsk',
      message: 'ehdwj',
      priority: 'normal',
      createdAt: { _seconds: 1772484028, _nanoseconds: 515000000 },
      busId: '',
      busNumber: '',
      estimatedArrivalTime: '',
      latitude: 0,
      longitude: 0,
      read: true
    },

    // Document ID: ma0qYqAbVe4exi57S5tT
    {
      userId: 'eNkmi20myFcFJYGeITL8',
      type: 'dcws',
      title: 'gchejsk',
      message: 'ehdwj',
      priority: 'normal',
      createdAt: { _seconds: 1772484673, _nanoseconds: 684000000 },
      busId: '',
      busNumber: '',
      estimatedArrivalTime: '',
      latitude: 0,
      longitude: 0,
      read: true
    },

    // Document ID: n4SXVu42vau8E0hGCQUk
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769686929, _nanoseconds: 884000000 },
      read: true
    },

    // Document ID: o4Uwehpo8J9SUKItWngY
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690281, _nanoseconds: 585000000 },
      read: true
    },

    // Document ID: pR0A4IhGqFbVelVLPVJn
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770154017, _nanoseconds: 119000000 },
      read: true
    },

    // Document ID: pSZhNjGgYJBCNYbV8Srf
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769688971, _nanoseconds: 345000000 },
      read: true
    },

    // Document ID: pTlZAEsLpSog8AFEAWhO
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1770153217, _nanoseconds: 500000000 },
      read: true
    },

    // Document ID: pmNXdIhK3OhNvV17EAFu
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769689061, _nanoseconds: 308000000 },
      read: true
    },

    // Document ID: wtL9oZYRyBxIWzpHZ2HS
    {
      userId: 'eNkmi20myFcFJYGeITL8',
      type: 'dcws',
      title: 'gchejsk',
      message: 'ehdwj',
      priority: 'normal',
      createdAt: { _seconds: 1772484600, _nanoseconds: 706000000 },
      busId: '6872a8175e413196d6e2e829',
      busNumber: '',
      estimatedArrivalTime: '',
      latitude: 0,
      longitude: 0,
      read: true
    },

    // Document ID: yi8rYJCdQ3YvGiRRRkxz
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690242, _nanoseconds: 401000000 },
      read: true
    },

    // Document ID: yvWFOo4skdckH8Ulp9n9
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769690441, _nanoseconds: 879000000 },
      read: true
    },

    // Document ID: zQCOEFPiijKOsVYOg1Co
    {
      userId: 'lwR9S9gJzEvhVucXe57g',
      type: 'trip_arrival',
      title: 'Bus Arrived',
      message: 'Bus number 101 has arrived at your location',
      data: {
        busId: 'bus_101',
        busNumber: '101',
        latitude: 6.9271,
        longitude: 80.7789,
        estimatedArrivalTime: '2026-01-28T14:30:00Z'
      },
      priority: 'normal',
      createdAt: { _seconds: 1769689045, _nanoseconds: 732000000 },
      read: true
    }
  ];

  return seedCollection(db, COLLECTION, data);
}

module.exports = {
  seedNotifications
};
