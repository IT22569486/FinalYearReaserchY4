const axios = require("axios");
const decodePolyline = require("@mapbox/polyline").decode;
const routeService = require("../services/routeService");

// Create new route
exports.createRoute = async (req, res) => {
  try {
    const route = await routeService.createRoute(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(500).json({ error: "Failed to create route", details: err.message });
  }
};

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await routeService.getAllRoutes();
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: "Failed to get routes", details: err.message });
  }
};

// Get single route by id
exports.getRouteById = async (req, res) => {
  try {
    const route = await routeService.getRouteById(req.params.id);
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: "Failed to get route", details: err.message });
  }
};

// Update a route
exports.updateRoute = async (req, res) => {
  try {
    const route = await routeService.updateRoute(req.params.id, req.body);
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: "Failed to update route", details: err.message });
  }
};

// Delete a route
exports.deleteRoute = async (req, res) => {
  try {
    const deleted = await routeService.deleteRoute(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Route not found" });
    res.json({ message: "Route deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete route", details: err.message });
  }
};

// Search routes by start & destination stop names
exports.getRoutesByStops = async (req, res) => {
  try {
    const { start, destination } = req.query;
    const results = await routeService.getRoutesByStops(start, destination);
    res.json(results);
  } catch (err) {
    res.status(err.message.includes("required") ? 400 : 500).json({ 
      error: "Failed to filter routes", 
      details: err.message 
    });
  }
};

// Get Google route by ID (calls Directions API)
exports.getGoogleRouteById = async (req, res) => {
  try {
    const routeId = req.params.id;
    
    console.log(`Fetching Google route for routeId: ${routeId}`);
    const routeData = await routeService.getRouteById(routeId);
    if (!routeData) {
      console.error(`Route not found for id: ${routeId}`);
      return res.status(404).json({ error: "Route not found" });
    }

    const route = routeData;

    // Helper: build response from local path data (no Google API needed)
    const buildLocalResponse = () => {
      const path = route.path || [];
      const coordinates = path
        .filter(p => p.lat != null && p.lng != null)
        .map(p => ({ latitude: parseFloat(p.lat), longitude: parseFloat(p.lng) }));
      const stops = route.stops || routeService.extractStopsFromPath(path);
      return res.json({ coordinates, stops, source: 'local' });
    };

    // Obtain API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not configured — using local path data.");
      return buildLocalResponse();
    }

    let directionsUrl;

    // Check if route has googleMapsUrl field
    if (route.googleMapsUrl) {
      console.log(`Using googleMapsUrl: ${route.googleMapsUrl}`);
      
      // Parse the URL to extract origin, destination, and waypoints
      const urlObj = new URL(`https://${route.googleMapsUrl.replace(/^https?:\/\//, '')}`);
      const params = urlObj.searchParams;
      
      const origin = params.get('origin');
      const destination = params.get('destination');
      const waypoints = params.get('waypoints');

      if (!origin || !destination) {
        return res.status(400).json({ error: "Invalid googleMapsUrl format" });
      }

      directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;
      if (waypoints) {
        directionsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
      }
    } else {
      // Fallback to traditional path-based route
      if (!route.path || route.path.length < 2) {
        console.error(`Invalid route path for id: ${routeId}`);
        return res.status(400).json({ error: "Invalid route or too few stops" });
      }

      const start = `${route.path[0].lat},${route.path[0].lng}`;
      const destination = `${route.path[route.path.length - 1].lat},${route.path[route.path.length - 1].lng}`;

      const waypoints = route.path.slice(1, -1)
        .map(s => `${s.lat},${s.lng}`)
        .join("|");

      directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;
      if (waypoints) {
        directionsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
      }
    }

    console.log(`Requesting Directions API`);
    const response = await axios.get(directionsUrl);
    const data = response.data;
    
    if (data.status !== "OK") {
      console.warn("Google Directions API failed, falling back to local path:", data.status);
      return buildLocalResponse();
    }

    const points = data.routes[0].overview_polyline.points;
    const coordinates = decodePolyline(points).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

    res.json({
      coordinates,
      stops: route.stops || routeService.extractStopsFromPath(route.path),
    });

  } catch (err) {
    console.error("Failed to get Google route:", err);
    res.status(500).json({ error: "Failed to get route", details: err.message });
  }
};
