const express = require("express");
const router = express.Router();
const {
  handleRegisterUser,
  handleLoginUser,
  handleGetUserProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", handleRegisterUser);
router.post("/login", handleLoginUser);

// Protected route
router.get("/profile", protect, handleGetUserProfile);

module.exports = router;
