const tripService = require("../services/tripService");

// Start a new trip
exports.handleStartTrip = async (req, res) => {
  try {
    const { busId, departure, destination } = req.body;
    if (!busId || !departure || !destination) {
      return res.status(400).json({ message: "busId, departure, and destination are required" });
    }

    const savedTrip = await tripService.startTrip(req.user.uid, req.body);
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error starting trip", error: error.message });
  }
};

// Get all trips for the passenger
exports.handleGetTrips = async (req, res) => {
  try {
    const trips = await tripService.getTripsByPassengerId(req.user.uid);
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trips", error: error.message });
  }
};

// Get active trip
exports.handleGetActiveTrip = async (req, res) => {
  try {
    const trip = await tripService.getActiveTripByPassengerId(req.user.uid);
    if (!trip) {
      return res.status(404).json({ message: "No active trip found" });
    }
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: "Error fetching active trip", error: error.message });
  }
};

// Update trip location
exports.handleUpdateLocation = async (req, res) => {
  try {
    const { tripId, currentLocation } = req.body;
    if (!tripId || !currentLocation) {
      return res.status(400).json({ message: "tripId and currentLocation are required" });
    }

    const updatedTrip = await tripService.updateTripLocation(tripId, req.user.uid, currentLocation);
    if (!updatedTrip) {
      return res.status(404).json({ message: "Active trip not found or access denied" });
    }
    res.status(200).json(updatedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error updating trip location", error: error.message });
  }
};

// End trip
exports.handleEndTrip = async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!tripId) {
      return res.status(400).json({ message: "tripId is required" });
    }

    const endedTrip = await tripService.endTrip(tripId, req.user.uid);
    if (!endedTrip) {
      return res.status(404).json({ message: "Active trip not found or access denied" });
    }
    res.status(200).json(endedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error ending trip", error: error.message });
  }
};

// Cancel trip
exports.handleCancelTrip = async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!tripId) {
      return res.status(400).json({ message: "tripId is required" });
    }

    const cancelledTrip = await tripService.cancelTrip(tripId, req.user.uid);
    if (!cancelledTrip) {
      return res.status(404).json({ message: "Active trip not found or access denied" });
    }
    res.status(200).json(cancelledTrip);
  } catch (error) {
    res.status(500).json({ message: "Error cancelling trip", error: error.message });
  }
};
