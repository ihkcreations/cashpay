// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,     // Modified controller
  sendOtp,
  verifyOtp,        // Modified controller
  setPin,           // New controller
  loginUser,
  agentLoginUser,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes for the multi-step registration/auth flow
router.post('/register', registerUser);       // Step 1: Initiate registration (mobile only)
router.post('/send-otp', sendOtp);           // Step 2 part 1: Send OTP
router.post('/verify-otp', verifyOtp);       // Step 2 part 2: Verify OTP
router.post('/set-pin', setPin);             // Step 3: Set PIN and finalize verification/login
router.post('/login', loginUser);            // Standard Login

// Agent Auth
router.post('/agent/login', agentLoginUser);

// Protected route for getting user profile (requires token)
router.get('/profile', protect, getUserProfile);

module.exports = router;