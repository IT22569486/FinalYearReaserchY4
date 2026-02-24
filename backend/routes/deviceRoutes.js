// routes/deviceRoutes.js
const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");

// Get device statistics (must be before :deviceKey route)
router.get("/stats", deviceController.getStats);

// Get all devices
router.get("/", deviceController.getDevices);

// Get device by key
router.get("/:deviceKey", deviceController.getDeviceByKey);

// Register or update device
router.post("/", deviceController.registerDevice);

// Update device health
router.put("/:deviceKey/health", deviceController.updateHealth);

// Get device health logs
router.get("/:deviceKey/health", deviceController.getHealthLogs);

// Update device status
router.put("/:deviceKey/status", deviceController.updateStatus);

// Refresh device (force status check)
router.post("/:deviceKey/refresh", deviceController.refreshDevice);

// Delete device
router.delete("/:deviceKey", deviceController.deleteDevice);

module.exports = router;
