// server/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();
const {
    adminLogin,
    adminApplyForAccount,
    requestAdminPasswordReset,
    resetAdminPassword,
    getAdminProfile
} = require('../controllers/adminAuthController');
const { protect, adminOnly } = require('../middleware/authMiddleware'); // For protected admin actions later

router.post('/login', adminLogin);
router.post('/apply', adminApplyForAccount); // New admin application
router.post('/request-password-reset', requestAdminPasswordReset);
router.post('/reset-password', resetAdminPassword);

router.get('/profile', protect, adminOnly, getAdminProfile);

module.exports = router;