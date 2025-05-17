// server/routes/merchantRoutes.js
const express = require('express');
const router = express.Router();
const { getAllMerchants, addMerchant } = require('../controllers/merchantController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming admin middleware for adding

// Get all active merchants (for users to select from)
router.route('/').get(protect, getAllMerchants);

// Add a new merchant (for admin panel later)
// router.route('/').post(protect, admin, addMerchant); // Example for admin

module.exports = router;