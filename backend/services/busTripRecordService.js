const { db } = require('../firebase');
const { BusTripRecord } = require('../modelsN');

const addBusTripRecord = async (record) => {
    try {
        const busTripRecord = new BusTripRecord({
            ...record,
            createdAt: new Date(),
        });
        const docRef = await db.collection('bus_trip_records').add(busTripRecord.toFirestore());
        return { id: docRef.id, ...busTripRecord.toFirestore() };
    } catch (error) {
        throw new Error('Error adding bus trip record: ' + error.message);
    }
};

const getBusTripRecords = async () => {
    try {
        const snapshot = await db.collection('bus_trip_records').get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting bus trip records: ' + error.message);
    }
};

const getLastThreeRecordsOfTrip = async (tripId) => {
    try {
        if (!tripId) return [];

        const getSortableTime = (record) => {
            const stamp = record?.Stamp;
            if (stamp && typeof stamp.toDate === 'function') return stamp.toDate().getTime();
            if (stamp && typeof stamp.seconds === 'number') return stamp.seconds * 1000;

            const createdAt = record?.createdAt;
            if (createdAt && typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
            if (createdAt && typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;

            const parsedStamp = Date.parse(stamp || '');
            if (!Number.isNaN(parsedStamp)) return parsedStamp;

            const parsedCreatedAt = Date.parse(createdAt || '');
            return Number.isNaN(parsedCreatedAt) ? 0 : parsedCreatedAt;
        };

        const normalizeAndLimit = (snapshot) => {
            const all = [];
            snapshot.forEach(doc => {
                const record = BusTripRecord.fromFirestore(doc);
                all.push({ id: doc.id, ...record.toFirestore() });
            });

            all.sort((a, b) => getSortableTime(b) - getSortableTime(a));
            return all.slice(0, 3);
        };

        // Most records store Trip_ID as a string (e.g. "0001" or Firestore doc IDs).
        const stringSnapshot = await db.collection('bus_trip_records')
            .where('Trip_ID', '==', String(tripId))
            .get();

        const records = normalizeAndLimit(stringSnapshot);

        if (records.length > 0) return records;

        // Backward-compatible fallback when Trip_ID was stored as a number.
        const numericTripId = Number(tripId);
        if (!Number.isFinite(numericTripId)) return [];

        const numericSnapshot = await db.collection('bus_trip_records')
            .where('Trip_ID', '==', numericTripId)
            .get();

        return normalizeAndLimit(numericSnapshot);
    } catch (error) {
        throw new Error('Error getting last three records of trip: ' + error.message);
    }
};

const getRecordsByBusId = async (busId) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('busId', '==', busId)
            .orderBy('createdAt', 'desc')
            .get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting records by bus ID: ' + error.message);
    }
};

const getLatestRecordByBusId = async (busId) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('busId', '==', busId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const record = BusTripRecord.fromFirestore(doc);
        return { id: doc.id, ...record.toFirestore() };
    } catch (error) {
        throw new Error('Error getting latest record by bus ID: ' + error.message);
    }
};

const getRecordsByDirection = async (direction) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('direction', '==', direction)
            .orderBy('createdAt', 'desc')
            .get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting records by direction: ' + error.message);
    }
};

const getRecordsByRoute = async (routeId) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('routeId', '==', routeId)
            .orderBy('createdAt', 'desc')
            .get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting records by route: ' + error.message);
    }
};

const getRecordsByBusAndDirection = async (busId, direction) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('busId', '==', busId)
            .where('direction', '==', direction)
            .orderBy('createdAt', 'desc')
            .get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting records by bus and direction: ' + error.message);
    }
};

const getDirectionStats = async () => {
    try {
        const snapshot = await db.collection('bus_trip_records').get();
        const stats = { forward: 0, backward: 0, inbound: 0, outbound: 0, other: 0 };
        
        snapshot.forEach(doc => {
            const direction = doc.data().direction || 'other';
            if (direction === 'forward') stats.forward++;
            else if (direction === 'backward') stats.backward++;
            else if (direction === 'inbound') stats.inbound++;
            else if (direction === 'outbound') stats.outbound++;
            else stats.other++;
        });
        
        return stats;
    } catch (error) {
        throw new Error('Error getting direction stats: ' + error.message);
    }
};

const getRecordsByDateRange = async (startDate, endDate) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('createdAt', '>=', new Date(startDate))
            .where('createdAt', '<=', new Date(endDate))
            .orderBy('createdAt', 'desc')
            .get();
        const records = [];
        snapshot.forEach(doc => {
            const record = BusTripRecord.fromFirestore(doc);
            records.push({ id: doc.id, ...record.toFirestore() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting records by date range: ' + error.message);
    }
};

module.exports = {
    addBusTripRecord,
    getBusTripRecords,
    getLastThreeRecordsOfTrip,
    getRecordsByBusId,
    getLatestRecordByBusId,
    getRecordsByDirection,
    getRecordsByRoute,
    getRecordsByBusAndDirection,
    getDirectionStats,
    getRecordsByDateRange,
};
