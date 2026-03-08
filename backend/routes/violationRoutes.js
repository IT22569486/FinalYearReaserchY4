// routes/violationRoutes.js
const express = require("express");
const router = express.Router();
const violationController = require("../controllers/violationController");

// Get violation statistics (must be before :id route)
router.get("/stats", violationController.getStats);

// Get violation summary grouped by bus (for offline history display)
router.get("/summary-by-bus", violationController.getSummaryByBus);

// Get all violations
router.get("/", violationController.getViolations);

// Get violations by device
router.get("/device/:deviceKey", violationController.getByDevice);

// Get violation by ID
router.get("/:id", violationController.getViolationById);

// Create new violation
router.post("/", violationController.createViolation);

// Update violation status
router.put("/:id/status", violationController.updateStatus);

// Delete violation
router.delete("/:id", violationController.deleteViolation);

module.exports = router;
