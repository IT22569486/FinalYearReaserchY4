// services/routeService.js
const { db, admin } = require("../firebase");
const { Route } = require("../models");
const routesCollection = db.collection("routes");

// Helper: extract stops array from path
function extractStopsFromPath(path = []) {
  return path.map(p => p.stopName).filter(Boolean);
}

// Create new route
async function createRoute(routeData) {
  const { name, path, googleMapsUrl } = routeData;
  
  if (!name || !Array.isArray(path) || path.length === 0) {
    throw new Error("name and non-empty path are required");
  }

  const stops = extractStopsFromPath(path);

  const route = new Route({
    name,
    path,
    stops,
    googleMapsUrl: googleMapsUrl || '',
    createdAt: { 
      _seconds: Math.floor(Date.now() / 1000),
      _nanoseconds: (Date.now() % 1000) * 1000000
    }
  });

  const docRef = await routesCollection.add(route.toFirestore());
  const doc = await docRef.get();
  const savedRoute = Route.fromFirestore(doc);
  return { id: doc.id, ...savedRoute.toFirestore() };
}

// Get all routes
async function getAllRoutes() {
  // db.collection('bus_trip_records').get()
  const snapshot = await routesCollection.get();
  return snapshot.docs.map(doc => {
    const route = Route.fromFirestore(doc);
    return { id: doc.id, ...route.toFirestore() };
  });
}

// Get route by ID
async function getRouteById(routeId) {
  const doc = await routesCollection.doc(routeId).get();
  if (!doc.exists) return null;
  const route = Route.fromFirestore(doc);
  return { id: doc.id, ...route.toFirestore() };
}

// Update route
async function updateRoute(routeId, updates) {
  const docRef = routesCollection.doc(routeId);
  const doc = await docRef.get();
  
  if (!doc.exists) return null;

  // If path is being updated, also update stops
  if (updates.path) {
    updates.stops = extractStopsFromPath(updates.path);
  }

  await docRef.update(updates);
  const updatedDoc = await docRef.get();
  const route = Route.fromFirestore(updatedDoc);
  return { id: updatedDoc.id, ...route.toFirestore() };
}

// Delete route
async function deleteRoute(routeId) {
  const docRef = routesCollection.doc(routeId);
  const doc = await docRef.get();
  
  if (!doc.exists) return null;

  await docRef.delete();
  return true;
}

// Search routes by start & destination stop names
async function getRoutesByStops(start, destination) {
  if (!start || !destination) {
    throw new Error("start and destination are required");
  }

  // Firestore supports array-contains for a single value
  const snapshot = await routesCollection
    .where("stops", "array-contains", start)
    .get();

  const results = snapshot.docs
    .map(doc => {
      const route = Route.fromFirestore(doc);
      return { id: doc.id, ...route.toFirestore() };
    })
    .filter(r => Array.isArray(r.stops) && r.stops.includes(destination));

  return results;
}

module.exports = {
  createRoute,
  getAllRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
  getRoutesByStops,
  extractStopsFromPath
};
