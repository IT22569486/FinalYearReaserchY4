// routes/dmsRoutes.js
/**
 * Driver Monitoring System (DMS) REST endpoints
 */

const express = require('express');
const router = express.Router();
const dmsService = require('../services/dmsService');

// GET /api/dms/status  — latest state for all devices
router.get('/status', async (req, res) => {
    try {
        const states = await dmsService.getAllDMSStates();
        res.json({ success: true, data: states });
    } catch (err) {
        console.error('DMS status error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dms/status/:deviceKey  — latest state for one device
router.get('/status/:deviceKey', async (req, res) => {
    try {
        const state = await dmsService.getDMSState(req.params.deviceKey);
        if (!state) return res.status(404).json({ success: false, error: 'Device not found' });
        res.json({ success: true, data: state });
    } catch (err) {
        console.error('DMS device status error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dms/events  — recent events (optional ?device_key=X&limit=N)
router.get('/events', async (req, res) => {
    try {
        const { device_key, limit } = req.query;
        const events = await dmsService.getDMSEvents(device_key || null, parseInt(limit) || 50);
        res.json({ success: true, data: events });
    } catch (err) {
        console.error('DMS events error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dms/statistics  — event counts by type/severity
router.get('/statistics', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const stats = await dmsService.getDMSStatistics(hours);
        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('DMS statistics error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
