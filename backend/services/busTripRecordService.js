const { db } = require('../firebase');

const addBusTripRecord = async (record) => {
    try {
        const newRecord = {
            ...record,
            createdAt: new Date(),
        };
        const docRef = await db.collection('bus_trip_records').add(newRecord);
        return { id: docRef.id, ...newRecord };
    } catch (error) {
        throw new Error('Error adding bus trip record: ' + error.message);
    }
};

const getBusTripRecords = async () => {
    try {
        const snapshot = await db.collection('bus_trip_records').get();
        const records = [];
        snapshot.forEach(doc => {
            records.push({ id: doc.id, ...doc.data() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting bus trip records: ' + error.message);
    }
};

const getLastThreeRecordsOfTrip = async (tripId) => {
    try {
        const snapshot = await db.collection('bus_trip_records')
            .where('Trip_ID', '==', parseInt(tripId))
            .orderBy('Stamp', 'desc')
            .limit(3)
            .get();
        const records = [];
        snapshot.forEach(doc => {
            records.push({ id: doc.id, ...doc.data() });
        });
        return records;
    } catch (error) {
        throw new Error('Error getting last three records of trip: ' + error.message);
    }
};

module.exports = {
    addBusTripRecord,
    getBusTripRecords,
    getLastThreeRecordsOfTrip,
};
