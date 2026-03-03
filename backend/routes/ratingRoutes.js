const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");
const { protect } = require("../middleware/authMiddleware");

// Submit a new rating (requires authentication)
router.post("/submit", protect, ratingController.handleSubmitRating);

// Get all ratings for a specific bus
router.get("/bus/:busId", ratingController.handleGetBusRatings);

// Get average ratings for a specific bus
router.get("/bus/:busId/average", ratingController.handleGetBusAverageRatings);

// Get all ratings for a specific driver
router.get("/driver/:driverId", ratingController.handleGetDriverRatings);

// Get average ratings for a specific driver
router.get("/driver/:driverId/average", ratingController.handleGetDriverAverageRatings);

// Get all ratings by the authenticated passenger
router.get("/my-ratings", protect, ratingController.handleGetPassengerRatings);

// Get rating for a specific trip
router.get("/trip/:tripId", ratingController.handleGetTripRating);

// Update a rating (requires authentication)
router.put("/:ratingId", protect, ratingController.handleUpdateRating);

// Delete a rating (requires authentication)
router.delete("/:ratingId", protect, ratingController.handleDeleteRating);

module.exports = router;
