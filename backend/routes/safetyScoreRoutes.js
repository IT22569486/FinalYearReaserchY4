const express = require('express');
const router = express.Router();
const safetyScoreController = require('../controllers/safetyScoreController');
const authMiddleware = require('../middleware/authMiddleware');

// Get safety data for a specific bus
router.get('/bus/:busId/safety', safetyScoreController.getBusSafetyData);

// Get live DMS state + recent events for a specific bus
router.get('/bus/:busId/dms', safetyScoreController.getBusDMSData);

// Get recent warnings for a bus
router.get('/bus/:busId/safety/warnings', safetyScoreController.getRecentWarnings);

// Update safety score when new violation is detected
router.post('/bus/:busId/safety/update', safetyScoreController.updateSafetyScore);

// Get safety scores for multiple buses
router.post('/buses/safety/batch', safetyScoreController.getBatchSafetyData);

// Calculate safety score from warnings
router.post('/safety/calculate', safetyScoreController.calculateScore);

module.exports = router;
