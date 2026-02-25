const ratingService = require("../services/ratingService");

// Submit a new rating
exports.handleSubmitRating = async (req, res) => {
  try {
    const { tripId, busId, driverId, driverRating, onTimeToStopRating, onTimeToDestinationRating, overallRating, comment } = req.body;

    if (!tripId || !busId || !driverId || !overallRating) {
      return res.status(400).json({ 
        message: "tripId, busId, driverId, and overallRating are required" 
      });
    }

    const passengerId = req.user?.uid || req.user?.id || req.user?._id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const ratingData = {
      driverRating,
      onTimeToStopRating,
      onTimeToDestinationRating,
      overallRating,
      comment,
    };

    const savedRating = await ratingService.submitRating(passengerId, tripId, busId, driverId, ratingData);
    res.status(201).json(savedRating);
  } catch (error) {
    res.status(500).json({ message: "Error submitting rating", error: error.message });
  }
};

// Get ratings for a specific bus
exports.handleGetBusRatings = async (req, res) => {
  try {
    const { busId } = req.params;
    if (!busId) {
      return res.status(400).json({ message: "busId is required" });
    }

    const ratings = await ratingService.getRatingsByBusId(busId);
    res.status(200).json(ratings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bus ratings", error: error.message });
  }
};

// Get average ratings for a specific bus
exports.handleGetBusAverageRatings = async (req, res) => {
  try {
    const { busId } = req.params;
    if (!busId) {
      return res.status(400).json({ message: "busId is required" });
    }

    const averages = await ratingService.getAverageRatingsForBus(busId);
    if (!averages) {
      return res.status(404).json({ message: "No ratings found for this bus" });
    }

    res.status(200).json(averages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching average ratings", error: error.message });
  }
};

// Get ratings for a specific driver
exports.handleGetDriverRatings = async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    const ratings = await ratingService.getRatingsByDriverId(driverId);
    res.status(200).json(ratings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching driver ratings", error: error.message });
  }
};

// Get average ratings for a specific driver
exports.handleGetDriverAverageRatings = async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    const averages = await ratingService.getAverageRatingsForDriver(driverId);
    if (!averages) {
      return res.status(404).json({ message: "No ratings found for this driver" });
    }

    res.status(200).json(averages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching average ratings", error: error.message });
  }
};

// Get all ratings by a passenger
exports.handleGetPassengerRatings = async (req, res) => {
  try {
    const passengerId = req.user?.uid || req.user?.id || req.user?._id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const ratings = await ratingService.getRatingsByPassengerId(passengerId);
    res.status(200).json(ratings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching passenger ratings", error: error.message });
  }
};

// Get rating for a specific trip
exports.handleGetTripRating = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!tripId) {
      return res.status(400).json({ message: "tripId is required" });
    }

    const rating = await ratingService.getRatingByTripId(tripId);
    if (!rating) {
      return res.status(404).json({ message: "No rating found for this trip" });
    }

    res.status(200).json(rating);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trip rating", error: error.message });
  }
};

// Update a rating
exports.handleUpdateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { driverRating, onTimeToStopRating, onTimeToDestinationRating, overallRating, comment } = req.body;

    if (!ratingId) {
      return res.status(400).json({ message: "ratingId is required" });
    }

    const passengerId = req.user?.uid || req.user?.id || req.user?._id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const updatedData = {
      driverRating,
      onTimeToStopRating,
      onTimeToDestinationRating,
      overallRating,
      comment,
    };

    const updatedRating = await ratingService.updateRating(ratingId, passengerId, updatedData);
    res.status(200).json(updatedRating);
  } catch (error) {
    res.status(500).json({ message: "Error updating rating", error: error.message });
  }
};

// Delete a rating
exports.handleDeleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    if (!ratingId) {
      return res.status(400).json({ message: "ratingId is required" });
    }

    const passengerId = req.user?.uid || req.user?.id || req.user?._id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const result = await ratingService.deleteRating(ratingId, passengerId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error deleting rating", error: error.message });
  }
};
