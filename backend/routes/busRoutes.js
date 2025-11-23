// routes/busRoutes.js
const express = require("express");
const router = express.Router();
const busController = require("../controllers/busController");
const {updateBusLocation} = require("../controllers/busController");

module.exports = (io) => {
  const router = express.Router();
router.get("/", busController.getBuses);
router.get("/:busId", busController.getBusById);
router.post("/", busController.createBus);
router.put("/:busId/location", (req, res) => updateBusLocation(req, res, io));
router.put("/:busId/occupancy", busController.updateOccupancy);
router.put("/:busId", busController.updateBus);
router.delete("/:busId", busController.deleteBus);

  return router;
};