// controllers/busController.js
const busService = require("../services/busService");

exports.getBuses = async (req, res) => {
  try {
    const buses = await busService.getAllBuses();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: "Error fetching buses", details: err.message });
  }
};

exports.getBusById = async (req, res) => {
  try {
    const bus = await busService.getBusByBusId(req.params.busId);
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: "Error fetching bus", details: err.message });
  }
};

exports.createBus = async (req, res) => {
  try {
    const newBus = await busService.createBus(req.body);
    req.io.emit("busCreated", newBus);
    res.status(201).json(newBus);
  } catch (err) {
    res.status(500).json({ error: "Error creating bus", details: err.message });
  }
};


exports.updateBusLocation = async (req, res,io) => {
  try {
    const updated = await busService.updateBusLocation(req.params.busId, req.body);
    if (!updated) return res.status(404).json({ message: "Bus not found" });

    io.emit("busLocationUpdate", {
      busId: updated.busId,
      location: updated.location,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating location", details: err.message });
  }
};

exports.updateOccupancy = async (req, res) => {
  try {
    const updated = await busService.updateBusOccupancy(req.params.busId, req.body.occupancy);
    if (!updated) return res.status(404).json({ message: "Bus not found" });

    req.io.emit("busUpdate", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating occupancy", details: err.message });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const updated = await busService.updateBus(req.params.busId, req.body);
    if (!updated) return res.status(404).json({ message: "Bus not found" });

    req.io.emit("busUpdated", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating bus", details: err.message });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const deleted = await busService.deleteBus(req.params.busId);
    if (!deleted) return res.status(404).json({ message: "Bus not found" });

    req.io.emit("busDeleted", { busId: req.params.busId });
    res.json({ message: "Bus deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting bus", details: err.message });
  }
};
