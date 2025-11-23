const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const { protect } = require("../middleware/authMiddleware");

// All trip routes should be protected
router.use(protect);

// GET routes
router.get("/", tripController.handleGetTrips); // Get all trips for a user
router.get("/active", tripController.handleGetActiveTrip); // Get the current active trip

// POST routes
router.post("/start", tripController.handleStartTrip);
router.post("/end", tripController.handleEndTrip);
router.post("/cancel", tripController.handleCancelTrip);

// PATCH or PUT for updates
router.patch("/location", tripController.handleUpdateLocation);

module.exports = router;
