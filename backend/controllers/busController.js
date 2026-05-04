// controllers/busController.js
const busService = require("../services/busService");
const { db } = require("../firebase");

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

exports.getBusTelemetry = async (req, res) => {
  try {
    const { busId } = req.params;
    
    // Get current live telemetry
    const liveDoc = await db.collection('bus_live_locations').doc(busId).get();
    
    if (!liveDoc.exists) {
      return res.status(404).json({ message: "No telemetry data found for this bus" });
    }
    
    const telemetry = liveDoc.data();
    res.json({
      status: "success",
      data: {
        bus_id: telemetry.bus_id,
        route_id: telemetry.route_id,
        route_name: telemetry.route_name,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        speed: telemetry.speed,
        passenger_count: telemetry.passenger_count,
        total_weight: telemetry.total_weight,
        gps_valid: telemetry.gps_valid,
        status: telemetry.status,
        last_updated: telemetry.last_updated?.toDate?.() || telemetry.last_updated,
        device_timestamp: telemetry.device_timestamp
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching telemetry", details: err.message });
  }
};

exports.getBusTelemetryHistory = async (req, res) => {
  try {
    const { busId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    
    // Get telemetry history
    const historyQuery = await db.collection('bus_telemetry_history')
      .where('bus_id', '==', busId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    if (historyQuery.empty) {
      return res.status(404).json({ message: "No telemetry history found for this bus" });
    }
    
    const history = historyQuery.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      };
    });
    
    res.json({
      status: "success",
      bus_id: busId,
      total_records: history.length,
      data: history
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching telemetry history", details: err.message });
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
