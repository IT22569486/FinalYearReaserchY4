// controllers/violationController.js
// Violation tracking controller
const violationService = require("../services/violationService");

/**
 * Get all violations
 * GET /api/violations
 */
exports.getViolations = async (req, res) => {
  try {
    const filters = {
      deviceKey: req.query.deviceKey,
      type: req.query.type,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100
    };

    const violations = await violationService.getAllViolations(filters);
    res.json(violations);
  } catch (err) {
    console.warn('Violations fetch failed:', err.message);
    res.json([]);
  }
};

/**
 * Get violation by ID
 * GET /api/violations/:id
 */
exports.getViolationById = async (req, res) => {
  try {
    const violation = await violationService.getViolationById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Error fetching violation", details: err.message });
  }
};

/**
 * Create a new violation
 * POST /api/violations
 */
exports.createViolation = async (req, res) => {
  try {
    let violation;
    try {
      violation = await violationService.createViolation(req.body);
    } catch (dbErr) {
      console.warn(`DB write failed (quota?): ${dbErr.message}`);
      // Build a local violation object so Socket.IO still works
      violation = {
        id: `local_${Date.now()}`,
        deviceKey: req.body.deviceKey,
        busNumber: req.body.busNumber || 'UNKNOWN',
        routeNumber: req.body.routeNumber || '',
        type: req.body.type,
        severity: req.body.details?.severity || 'MEDIUM',
        description: req.body.details?.description || `${req.body.type} violation detected`,
        details: req.body.details || {},
        status: 'pending',
        createdAt: new Date().toISOString(),
        _localOnly: true,
      };
    }

    // Emit socket event for real-time dashboard update (always)
    if (req.io) {
      req.io.emit("newViolation", { violation, deviceKey: violation.deviceKey, timestamp: new Date().toISOString() });
    }

    res.status(201).json(violation);
  } catch (err) {
    res.status(500).json({ error: "Error creating violation", details: err.message });
  }
};

/**
 * Update violation status
 * PUT /api/violations/:id/status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const violation = await violationService.updateViolationStatus(req.params.id, status, notes);

    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }

    // Emit socket event
    if (req.io) {
      req.io.emit("violationUpdated", violation);
    }

    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Error updating violation", details: err.message });
  }
};

/**
 * Get violations by device
 * GET /api/violations/device/:deviceKey
 */
exports.getByDevice = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const result = await violationService.getViolationsByDevice(req.params.deviceKey, limit, page);
    res.json(result);
  } catch (err) {
    console.warn('Device violations fetch failed:', err.message);
    res.json({ violations: [], total: 0, page: 1, limit: 10, totalPages: 0 });
  }
};

/**
 * Get violation statistics
 * GET /api/violations/stats
 */
exports.getStats = async (req, res) => {
  try {
    const deviceKey = req.query.deviceKey || null;
    const stats = await violationService.getViolationStats(deviceKey);
    res.json(stats);
  } catch (err) {
    console.warn('Stats fetch failed:', err.message);
    // Return empty stats instead of error — lets frontend work with real-time data
    res.json({ total: 0, today: 0, byType: {}, byStatus: {}, _error: err.message });
  }
};

/**
 * Get violation summary grouped by bus
 * GET /api/violations/summary-by-bus
 */
exports.getSummaryByBus = async (req, res) => {
  try {
    const summary = await violationService.getViolationSummaryByBus();
    res.json(summary);
  } catch (err) {
    console.warn('Summary fetch failed:', err.message);
    // Return empty array instead of error — lets frontend work with real-time data
    res.json([]);
  }
};

/**
 * Delete violation
 * DELETE /api/violations/:id
 */
exports.deleteViolation = async (req, res) => {
  try {
    const deleted = await violationService.deleteViolation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Violation not found" });
    }

    // Emit socket event
    if (req.io) {
      req.io.emit("violationDeleted", { id: req.params.id });
    }

    res.json({ message: "Violation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting violation", details: err.message });
  }
};
