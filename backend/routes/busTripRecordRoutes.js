const express = require('express');
const router = express.Router();
const busTripRecordController = require('../controllers/busTripRecordController');

router.post('/', busTripRecordController.addBusTripRecord);
router.get('/', busTripRecordController.getBusTripRecords);
router.get('/trip/:tripId/last-three', busTripRecordController.getLastThreeRecordsOfTrip);

module.exports = router;
