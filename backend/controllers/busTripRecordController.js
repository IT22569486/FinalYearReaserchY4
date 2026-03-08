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

const getRecordsByBusId = async (req, res) => {
    try {
        const { busId } = req.params;
        const records = await busTripRecordService.getRecordsByBusId(busId);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLatestRecordByBusId = async (req, res) => {
    try {
        const { busId } = req.params;
        const record = await busTripRecordService.getLatestRecordByBusId(busId);
        if (!record) {
            return res.status(404).json({ message: 'No record found for this bus' });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecordsByDirection = async (req, res) => {
    try {
        const { direction } = req.params;
        const records = await busTripRecordService.getRecordsByDirection(direction);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecordsByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const records = await busTripRecordService.getRecordsByRoute(routeId);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecordsByBusAndDirection = async (req, res) => {
    try {
        const { busId, direction } = req.params;
        const records = await busTripRecordService.getRecordsByBusAndDirection(busId, direction);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDirectionStats = async (req, res) => {
    try {
        const stats = await busTripRecordService.getDirectionStats();
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecordsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate query parameters are required' });
        }
        const records = await busTripRecordService.getRecordsByDateRange(startDate, endDate);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
