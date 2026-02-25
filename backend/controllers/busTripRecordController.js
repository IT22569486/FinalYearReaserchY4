const busTripRecordService = require('../services/busTripRecordService');

const addBusTripRecord = async (req, res) => {
    try {
        const record = await busTripRecordService.addBusTripRecord(req.body);
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBusTripRecords = async (req, res) => {
    try {
        const records = await busTripRecordService.getBusTripRecords();
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLastThreeRecordsOfTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const records = await busTripRecordService.getLastThreeRecordsOfTrip(tripId);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addBusTripRecord,
    getBusTripRecords,
    getLastThreeRecordsOfTrip,
};
