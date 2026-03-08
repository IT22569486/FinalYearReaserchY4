// backend/routes/authRoutes.js
// DEPRECATED: All authentication has been consolidated to /api/user routes
// This file is kept for backwards compatibility only

const express = require('express');
const router = express.Router();

// All auth endpoints have been moved to /api/user:
// - POST /api/user/register - Register new user with email/password
// - POST /api/user/login - Login with email/password (returns JWT token)
// - GET /api/user/verify-token - Verify JWT token is valid
// - GET /api/user/profile - Get user profile (requires valid JWT token)
//
// Authentication method: JWT Only

router.get('/info', (req, res) => {
  res.json({
    message: 'Auth routes have been consolidated to /api/user',
    endpoints: {
      register: 'POST /api/user/register',
      login: 'POST /api/user/login',
      verifyToken: 'GET /api/user/verify-token',
      profile: 'GET /api/user/profile'
    }
  });
});

module.exports = router;

