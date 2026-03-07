const express = require("express");
const router = express.Router();
const {
  handleRegisterUser,
  handleLoginUser,
  handleGetUserProfile,
  handleUpdateUserProfile,
  handleVerifyToken,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// JWT Authentication - Public Routes
router.post("/register", handleRegisterUser);
router.post("/login", handleLoginUser);

// Protected Routes - Require valid JWT token
router.get("/profile", protect, handleGetUserProfile);
router.put("/profile", protect, handleUpdateUserProfile);
router.get("/verify-token", protect, handleVerifyToken);

module.exports = router;
