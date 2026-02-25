const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");

// Create a new route
router.post("/", routeController.createRoute);

// Get all routes
router.get("/", routeController.getAllRoutes);

// Get a single route by ID
router.get("/:id", routeController.getRouteById);

// Update a route by ID
router.put("/:id", routeController.updateRoute);

// Delete a route by ID
router.delete("/:id", routeController.deleteRoute);

// /routes/search?start=...&destination=...
router.get("/route/search", routeController.getRoutesByStops);

// /routes/google-route/:id
router.get("/google-route/:id", routeController.getGoogleRouteById);

module.exports = router;
