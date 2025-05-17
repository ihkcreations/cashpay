// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    updateUserProfile, 
    getAllUsers,
    getRecipientListForAgent, 
} = require('../controllers/userController');
const { protect, agentProtect } = require('../middleware/authMiddleware'); // Need protect middleware

// Protected route to update user profile
router.route('/profile').put(protect, updateUserProfile);
router.route('/all').get(protect, getAllUsers);

router.route('/recipients-for-agent').get(protect, agentProtect, getRecipientListForAgent);

// Other user-specific routes can go here...
// router.route('/balance').get(protect, getUserBalance); // If you wanted a dedicated endpoint

module.exports = router;