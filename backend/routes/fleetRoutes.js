// routes/fleetRoutes.js
const express = require("express");
const router = express.Router();
const fleetService = require("../services/fleetService");

// GET /api/fleet/overview
router.get("/overview", async (req, res) => {
    try {
        const overview = await fleetService.getFleetOverview();
        res.json(overview);
    } catch (error) {
        console.error("Error getting fleet overview:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/buses
router.get("/buses", async (req, res) => {
    try {
        const result = await fleetService.getAllBuses();
        res.json(result);
    } catch (error) {
        console.error("Error getting buses:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/buses/:vehicleId
router.get("/buses/:vehicleId", async (req, res) => {
    try {
        const bus = await fleetService.getBusDetails(req.params.vehicleId);
        if (!bus) return res.status(404).json({ error: "Bus not found" });
        res.json(bus);
    } catch (error) {
        console.error("Error getting bus details:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/buses/:vehicleId/history
router.get("/buses/:vehicleId/history", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const limit = parseInt(req.query.limit) || 100;
        const result = await fleetService.getBusHistory(req.params.vehicleId, hours, limit);
        res.json(result);
    } catch (error) {
        console.error("Error getting bus history:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/map-data
router.get("/map-data", async (req, res) => {
    try {
        const mapData = await fleetService.getMapData();
        res.json(mapData);
    } catch (error) {
        console.error("Error getting map data:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/routes
router.get("/routes", async (req, res) => {
    try {
        const routes = await fleetService.getRoutes();
        res.json(routes);
    } catch (error) {
        console.error("Error getting routes:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fleet/statistics
router.get("/statistics", async (req, res) => {
    try {
        const stats = await fleetService.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error("Error getting statistics:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
