const express = require("express");
const router = express.Router();

const busTripController = require("../controllers/busTripController");

router.post("/", busTripController.createTrip);

router.get("/", busTripController.getAllTrips);

router.get("/:tripId", busTripController.getTripById);

router.get("/bus/:busId", busTripController.getTripsByBusId);

router.get("/route/:routeId", busTripController.getTripsByRouteId);

router.put("/:tripId", busTripController.updateTrip);

router.delete("/:tripId", busTripController.deleteTrip);

router.put("/:tripId/start", busTripController.startTrip);

router.put("/:tripId/end", busTripController.endTrip);

module.exports = router;