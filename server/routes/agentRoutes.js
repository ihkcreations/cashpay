// server/routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const {
    agentApply,
    agentVerifyOtp,
    agentSetPin,
    getAllActiveAgents,
    processCashIn,
    processUserCashOut,
    getAgentStatement,
    agentSendMoney,
    agentPayBillForUser
} = require('../controllers/agentController');
const { protect, agentProtect } = require('../middleware/authMiddleware'); 
// const { protect, admin } = require('../middleware/authMiddleware'); // For admin actions later

// Agent Application and Onboarding
router.post('/apply', agentApply);            // Registration Phase 1
router.post('/verify-otp', agentVerifyOtp);  // Registration Phase 2 (OTP for application)
router.post('/set-pin', agentSetPin);        // Login - Continuation (Set PIN after admin approval)

// Get Active Agents (e.g., for user to select for cash out)
router.get('/', protect, getAllActiveAgents);

// Agent Operational Routes (Protected by agentProtect)
router.post('/cash-in', protect, agentProtect, processCashIn); // Agent performs cash-in
router.post('/process-user-cashout', protect, agentProtect, processUserCashOut);
router.get('/statement', protect, agentProtect, getAgentStatement);
router.post('/send-money', protect, agentProtect, agentSendMoney); // Agent sends money to user
router.post('/pay-bill', protect, agentProtect, agentPayBillForUser);

// --- Routes for Admin to manage agent applications (to be built with Admin Panel) ---
// router.get('/applications/pending', protect, admin, getPendingAgentApplications);
// router.put('/applications/:id/approve', protect, admin, approveAgentApplication);
// router.put('/applications/:id/reject', protect, admin, rejectAgentApplication);

module.exports = router;