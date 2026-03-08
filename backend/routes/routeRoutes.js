const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");

// Create a new route
router.post("/", routeController.createRoute);

// Get all routes
router.get("/", routeController.getAllRoutes);

// /routes/search?start=...&destination=...
router.get("/route/search", routeController.getRoutesByStops);

// /routes/google-route/:id
router.get("/google-route/:id", routeController.getGoogleRouteById);

// Get a single route by ID (must be AFTER specific routes like /route/search and /google-route/:id)
router.get("/:id", routeController.getRouteById);

// Update a route by ID
router.put("/:id", routeController.updateRoute);

// Delete a route by ID
router.delete("/:id", routeController.deleteRoute);

module.exports = router;
