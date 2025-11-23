const admin = require("firebase-admin");
const db = admin.firestore();
const axios = require("axios");
const decodePolyline = require("@mapbox/polyline").decode;

// Helper: extract stops array from path
function extractStopsFromPath(path = []) {
  return path.map(p => p.stopName).filter(Boolean);
}

// Create new route
exports.createRoute = async (req, res) => {
  try {
    const { name, path } = req.body;
    if (!name || !Array.isArray(path) || path.length === 0) {
      return res.status(400).json({ error: "name and non-empty path are required" });
    }

    const stops = extractStopsFromPath(path);

    const docRef = await db.collection("routes").add({
      name,
      path,
      stops,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to create route", details: err.message });
  }
};

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const snap = await db.collection("routes").orderBy("createdAt", "desc").get();
    const routes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: "Failed to get routes", details: err.message });
  }
};

// Get single route by id
exports.getRouteById = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await db.collection("routes").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Route not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to get route", details: err.message });
  }
};

// Update a route
exports.updateRoute = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;

    // if path is being updated, also update stops
    if (payload.path) {
      payload.stops = extractStopsFromPath(payload.path);
    }

    payload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const docRef = db.collection("routes").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Route not found" });

    await docRef.update(payload);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update route", details: err.message });
  }
};

// Delete a route
exports.deleteRoute = async (req, res) => {
  try {
    const id = req.params.id;
    const docRef = db.collection("routes").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Route not found" });

    await docRef.delete();
    res.json({ message: "Route deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete route", details: err.message });
  }
};

// Search routes by start & destination stop names
exports.getRoutesByStops = async (req, res) => {
  try {
    const { start, destination } = req.query;
    if (!start || !destination) {
      return res.status(400).json({ error: "start and destination query parameters are required" });
    }

    // Firestore supports array-contains for a single value. Query for start and filter for destination.
    const snap = await db.collection("routes")
      .where("stops", "array-contains", start)
      .get();

    const results = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => Array.isArray(r.stops) && r.stops.includes(destination));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to filter routes", details: err.message });
  }
};

// Get Google route by ID (calls Directions API)
exports.getGoogleRouteById = async (req, res) => {
  try {
    const routeId = req.params.id;
    const doc = await db.collection("routes").doc(routeId).get();
    if (!doc.exists) return res.status(404).json({ error: "Route not found" });

    const route = doc.data();
    if (!route.path || route.path.length < 2) {
      return res.status(400).json({ error: "Invalid route or too few stops" });
    }

    // Obtain API key: prefer environment variable, fallback to functions config
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || (functions && functions.config && functions.config().google && functions.config().google.key);
    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API key not configured" });
    }

    const start = route.path[0].stopName || `${route.path[0].lat},${route.path[0].lng}`;
    const destinationObj = route.path[route.path.length - 1];
    const destination = destinationObj.stopName || `${destinationObj.lat},${destinationObj.lng}`;

    const waypoints = route.path.slice(1, route.path.length - 1)
      .map(s => s.stopName || `${s.lat},${s.lng}`)
      .join("|");

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;

    // If there are waypoints, append them
    const urlWithWaypoints = waypoints ? url + `&waypoints=${encodeURIComponent(waypoints)}` : url;

    const response = await axios.get(urlWithWaypoints);
    const data = response.data;
    if (data.status !== "OK") {
      return res.status(400).json({ error: "Google Directions API failed", details: data });
    }

    const points = data.routes[0].overview_polyline.points;
    const coordinates = decodePolyline(points).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

    const duration = data.routes[0].legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
    const distance = data.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);

    res.json({
      coordinates,
      stops: route.stops || extractStopsFromPath(route.path),
      duration,
      distance
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to get route", details: err.message });
  }
};
