const express = require('express');
const router = express.Router();
const busTripRecordController = require('../controllers/busTripRecordController');

// POST: Add new trip record
router.post('/', busTripRecordController.addBusTripRecord);

// GET: All records
router.get('/', busTripRecordController.getBusTripRecords);

// GET: Direction statistics
router.get('/stats/direction', busTripRecordController.getDirectionStats);

// GET: Records by date range
router.get('/range', busTripRecordController.getRecordsByDateRange);

// GET: Records by direction
router.get('/direction/:direction', busTripRecordController.getRecordsByDirection);

// GET: Records by route
router.get('/route/:routeId', busTripRecordController.getRecordsByRoute);

// GET: Latest record for a bus
router.get('/bus/:busId/latest', busTripRecordController.getLatestRecordByBusId);

// GET: Records by bus and direction
router.get('/bus/:busId/direction/:direction', busTripRecordController.getRecordsByBusAndDirection);

// GET: All records for a bus
router.get('/bus/:busId', busTripRecordController.getRecordsByBusId);

// GET: Last three records of a trip
router.get('/trip/:tripId/last-three', busTripRecordController.getLastThreeRecordsOfTrip);

module.exports = router;
