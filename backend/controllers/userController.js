// controllers/userController.js
// JWT Token-Based Authentication Only
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
  const { name, email, password, mobileNo, nic, dob, bloodGroup } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please add all required fields" });
  }

  try {
    const userData = { 
      name, 
      email, 
      password,
      mobileNo: mobileNo || '',
      nic: nic || '',
      dob: dob || '',
      bloodGroup: bloodGroup || ''
    };
    
    const user = await userService.createUser(userData);
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: "User registered successfully",
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
      user: userWithoutPassword
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
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return all user fields except password
    const { password, ...userProfile } = user;
    res.status(200).json({
      id: user.id || user._id,
      name: user.name || '',
      email: user.email || '',
      mobileNo: user.mobileNo || '',
      nic: user.nic || '',
      dob: user.dob || '',
      bloodGroup: user.bloodGroup || '',
      role: user.role || 'passenger',
      createdAt: user.createdAt,
      ...userProfile
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
};

// Update user profile
// PUT /api/users/profile
const handleUpdateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, mobileNo, nic, dob, bloodGroup, role } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (mobileNo !== undefined) updates.mobileNo = mobileNo;
    if (nic !== undefined) updates.nic = nic;
    if (dob !== undefined) updates.dob = dob;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (role !== undefined) updates.role = role;
    
    const updatedUser = await userService.updateUser(userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userProfile } = updatedUser;
    res.status(200).json({
      message: "Profile updated successfully",
      user: userProfile
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

// Verify token validity
// GET /api/users/verify-token
const handleVerifyToken = async (req, res) => {
  try {
    // If the protect middleware allowed us to reach here, the token is valid
    // req.user contains the decoded user info from the token
    if (req.user && req.user.id) {
      res.status(200).json({
        valid: true,
        message: "Token is valid",
        userId: req.user.id,
      });
    } else {
      res.status(401).json({
        valid: false,
        message: "Invalid token payload",
      });
    }
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: "Token verification failed",
    });
  }
};

module.exports = {
  handleRegisterUser,
  handleLoginUser,
  handleGetUserProfile,
  handleUpdateUserProfile,
  handleVerifyToken,
};
