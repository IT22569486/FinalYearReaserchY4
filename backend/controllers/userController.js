// controllers/userController.js
const userService = require("../services/userservice");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Helper function to generate a JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Register a new user
// POST /api/users/register
const handleRegisterUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please add all fields" });
  }

  try {
    const user = await userService.createUser({ name, email, password });
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Authenticate a user
// POST /api/users/login
const handleLoginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userService.findUserByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

// Get user profile
// GET /api/users/profile
const handleGetUserProfile = async (req, res) => {
  // Ensure we don't send back the password
  const { password, ...userProfile } = req.user._doc ? req.user._doc : req.user;
  res.status(200).json(userProfile);
};

module.exports = {
  handleRegisterUser,
  handleLoginUser,
  handleGetUserProfile,
};
