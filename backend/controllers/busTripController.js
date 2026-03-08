const busTripService = require("../services/busTripService");

// Create trip
exports.createTrip = async (req, res) => {
    try {
        const trip = await busTripService.createTrip(req.body);
        res.status(201).json(trip);
    } catch (err) {
        res.status(500).json({
            error: "Error creating trip",
            details: err.message
        });
    }
};

// Get all trips
exports.getAllTrips = async (req, res) => {
    try {
        const trips = await busTripService.getAllTrips();
        res.json(trips);
    } catch (err) {
        res.status(500).json({
            error: "Error fetching trips",
            details: err.message
        });
    }
};

// Get trip by ID
exports.getTripById = async (req, res) => {
    try {
        const trip = await busTripService.getTripById(req.params.tripId);

        if (!trip)
            return res.status(404).json({ message: "Trip not found" });

        res.json(trip);
    } catch (err) {
        res.status(500).json({
            error: "Error fetching trip",
            details: err.message
        });
    }
};

// Get trips by busId
exports.getTripsByBusId = async (req, res) => {
    try {
        const trips = await busTripService.getTripsByBusId(req.params.busId);
        res.json(trips);
    } catch (err) {
        res.status(500).json({
            error: "Error fetching trips",
            details: err.message
        });
    }
};

// Get trips by routeId
exports.getTripsByRouteId = async (req, res) => {
    try {
        const trips = await busTripService.getTripsByRouteId(req.params.routeId);
        res.json(trips);
    } catch (err) {
        res.status(500).json({
            error: "Error fetching trips",
            details: err.message
        });
    }
};

// Start trip
exports.startTrip = async (req, res) => {
    try {
        const trip = await busTripService.startTrip(req.params.tripId);

        if (!trip)
            return res.status(404).json({ message: "Trip not found" });

        res.json(trip);
    } catch (err) {
        res.status(500).json({
            error: "Error starting trip",
            details: err.message
        });
    }
};

// End trip
exports.endTrip = async (req, res) => {
    try {
        const trip = await busTripService.endTrip(req.params.tripId);

        if (!trip)
            return res.status(404).json({ message: "Trip not found" });

        res.json(trip);
    } catch (err) {
        res.status(500).json({
            error: "Error ending trip",
            details: err.message
        });
    }
};

// Update trip
exports.updateTrip = async (req, res) => {
    try {
        const trip = await busTripService.updateTrip(
            req.params.tripId,
            req.body
        );

        if (!trip)
            return res.status(404).json({ message: "Trip not found" });

        res.json(trip);
    } catch (err) {
        res.status(500).json({
            error: "Error updating trip",
            details: err.message
        });
    }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
    try {
        const deleted = await busTripService.deleteTrip(req.params.tripId);

        if (!deleted)
            return res.status(404).json({ message: "Trip not found" });

        res.json({ message: "Trip deleted successfully" });
    } catch (err) {
        res.status(500).json({
            error: "Error deleting trip",
            details: err.message
        });
    }
};