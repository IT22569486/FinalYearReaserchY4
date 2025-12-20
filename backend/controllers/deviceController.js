// controllers/deviceController.js
// Device monitoring controller
const deviceService = require("../services/deviceService");

/**
 * Get all devices
 * GET /api/devices
 */
exports.getDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: "Error fetching devices", details: err.message });
  }
};

/**
 * Get device by key
 * GET /api/devices/:deviceKey
 */
exports.getDeviceByKey = async (req, res) => {
  try {
    const device = await deviceService.getDeviceByKey(req.params.deviceKey);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: "Error fetching device", details: err.message });
  }
};

/**
 * Register or update device
 * POST /api/devices
 */
exports.registerDevice = async (req, res) => {
  console.log("Registering device:", req.body);
  try {
    const device = await deviceService.upsertDevice(req.body);
    
    // Emit socket event for real-time dashboard update
    if (req.io) {
      req.io.emit("deviceUpdate", device);
    }
    
    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ error: "Error registering device", details: err.message });
  }
};

/**
 * Update device health
 * PUT /api/devices/:deviceKey/health
 */
exports.updateHealth = async (req, res) => {
  try {
    const device = await deviceService.updateDeviceHealth(req.params.deviceKey, req.body);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Emit socket event for real-time dashboard update
    if (req.io) {
      req.io.emit("deviceHealthUpdate", {
        deviceKey: req.params.deviceKey,
        health: req.body
      });
    }
    
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: "Error updating health", details: err.message });
  }
};

/**
 * Get device health logs
 * GET /api/devices/:deviceKey/health
 */
exports.getHealthLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await deviceService.getDeviceHealthLogs(req.params.deviceKey, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Error fetching health logs", details: err.message });
  }
};

/**
 * Update device status
 * PUT /api/devices/:deviceKey/status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const device = await deviceService.updateDeviceStatus(req.params.deviceKey, status);
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Emit socket event
    if (req.io) {
      req.io.emit("deviceStatusUpdate", {
        deviceKey: req.params.deviceKey,
        status
      });
    }
    
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: "Error updating status", details: err.message });
  }
};

/**
 * Delete device
 * DELETE /api/devices/:deviceKey
 */
exports.deleteDevice = async (req, res) => {
  try {
    const deleted = await deviceService.deleteDevice(req.params.deviceKey);
    if (!deleted) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Emit socket event
    if (req.io) {
      req.io.emit("deviceDeleted", { deviceKey: req.params.deviceKey });
    }
    
    res.json({ message: "Device deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting device", details: err.message });
  }
};

/**
 * Get device statistics
 * GET /api/devices/stats
 */
exports.getStats = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    const onlineCount = await deviceService.getOnlineDevicesCount();
    
    res.json({
      total: devices.length,
      online: onlineCount,
      offline: devices.length - onlineCount
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching stats", details: err.message });
  }
};

/**
 * Refresh device status (force re-check)
 * POST /api/devices/:deviceKey/refresh
 */
exports.refreshDevice = async (req, res) => {
  try {
    const device = await deviceService.getDeviceByKey(req.params.deviceKey);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Calculate if device is online (seen in last 5 minutes)
    const lastSeen = device.lastSeen?.toDate?.() || new Date(device.lastSeen);
    const isOnline = (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000;
    const status = isOnline ? 'online' : 'offline';
    
    if (device.status !== status) {
      await deviceService.updateDeviceStatus(req.params.deviceKey, status);
    }
    
    const updated = await deviceService.getDeviceByKey(req.params.deviceKey);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error refreshing device", details: err.message });
  }
};
