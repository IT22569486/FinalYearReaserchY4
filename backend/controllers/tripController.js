const tripService = require("../services/tripService");

// Start a new trip
exports.handleStartTrip = async (req, res) => {
  try {
    const { busId, departure, destination } = req.body;
    if (!busId || !departure || !destination) {
      return res.status(400).json({ message: "busId, departure, and destination are required" });
    }

    const passengerId = req.user?.id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const savedTrip = await tripService.startTrip(passengerId, req.body);
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error starting trip", error: error.message });
  }
};

// Get all trips for the passenger
exports.handleGetTrips = async (req, res) => {
  try {
    const passengerId = req.user?.id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });
    const trips = await tripService.getTripsByPassengerId(passengerId);
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trips", error: error.message });
  }
};

// Get active trip
exports.handleGetActiveTrip = async (req, res) => {
  try {
    const passengerId = req.user?.id;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });
    const trip = await tripService.getActiveTripByPassengerId(passengerId);
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

    const passengerId = req.user?.id ;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const updatedTrip = await tripService.updateTripLocation(tripId, passengerId, currentLocation);
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

    const passengerId = req.user?.id ;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const endedTrip = await tripService.endTrip(tripId, passengerId);
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

    const passengerId = req.user?.id ;
    if (!passengerId) return res.status(401).json({ message: 'Not authorized' });

    const cancelledTrip = await tripService.cancelTrip(tripId, passengerId);
    if (!cancelledTrip) {
      return res.status(404).json({ message: "Active trip not found or access denied" });
    }
    res.status(200).json(cancelledTrip);
  } catch (error) {
    res.status(500).json({ message: "Error cancelling trip", error: error.message });
  }
};
