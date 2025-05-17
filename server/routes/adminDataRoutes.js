// server/routes/adminDataRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllRegularUsers,
    getUserByIdForAdmin,
    createRegularUserByAdmin,
    deleteRegularUserByAdmin,
    
    // Agent management
    getAllAgentsForAdmin, getAgentByIdForAdmin, createAgentByAdmin,
    approveAgentApplication, rejectAgentApplication, toggleAgentActiveStatus, deleteAgentByAdmin,

    // Merchant controller functions
    getAllMerchantsForAdmin, getMerchantByIdForAdmin, createMerchantByAdmin,
    updateMerchantByAdmin, deleteMerchantByAdmin,

    // Admin account management functions
    getAllAdminAccounts, getAdminAccountById, createAdminAccountBySuperAdmin,
    approveAdminApplicationBySuperAdmin, rejectAdminApplicationBySuperAdmin,
    toggleAdminActiveStatus, resetAdminPasswordBySuperAdmin, deleteAdminAccount,

    getAllTransactionsForAdmin, clearAllTransactionHistory, // Import new functions
    getDashboardStats,

    getAllLoanRequestsForAdmin, approveLoanRequest, rejectLoanRequest, disburseLoan,
    getAllInvestmentsForAdmin, processInvestmentPayout

} = require('../controllers/adminDataController');

const { protect, adminOnly, superAdminOnly } = require('../middleware/authMiddleware');
// `adminOnly` allows both 'admin' and 'super_admin'
// `superAdminOnly` allows only 'super_admin'

// User Management Routes by Admin
router.route('/users')
    .get(protect, adminOnly, getAllRegularUsers)
    .post(protect, superAdminOnly, createRegularUserByAdmin); // Only super_admin can create users directly? Or adminOnly?

router.route('/users/:id')
    .get(protect, adminOnly, getUserByIdForAdmin)
    .delete(protect, superAdminOnly, deleteRegularUserByAdmin); // Only super_admin can delete?

// --- Agent Management Routes by Admin ---
router.route('/agents')
    .get(protect, adminOnly, getAllAgentsForAdmin) // List all agents (can filter by query param status)
    .post(protect, superAdminOnly, createAgentByAdmin); // SuperAdmin creates an agent directly

router.route('/agents/:id')
    .get(protect, adminOnly, getAgentByIdForAdmin) // Get specific agent details
    .delete(protect, superAdminOnly, deleteAgentByAdmin); // SuperAdmin deletes an agent

router.route('/agents/:id/approve').put(protect, adminOnly, approveAgentApplication); // Admin/SuperAdmin approves
router.route('/agents/:id/reject').put(protect, adminOnly, rejectAgentApplication);   // Admin/SuperAdmin rejects
router.route('/agents/:id/toggle-active').put(protect, superAdminOnly, toggleAgentActiveStatus); // SuperAdmin activates/deactivates

// --- Merchant Management Routes by Admin ---
router.route('/merchants')
    .get(protect, adminOnly, getAllMerchantsForAdmin)
    .post(protect, superAdminOnly, createMerchantByAdmin); // Or adminOnly

router.route('/merchants/:id')
    .get(protect, adminOnly, getMerchantByIdForAdmin)
    .put(protect, superAdminOnly, updateMerchantByAdmin)    // Or adminOnly
    .delete(protect, superAdminOnly, deleteMerchantByAdmin); // Or adminOnly-

// --- Admin Account Management by SuperAdmin ---
router.route('/admins')
    .get(protect, superAdminOnly, getAllAdminAccounts)
    .post(protect, superAdminOnly, createAdminAccountBySuperAdmin);

router.route('/admins/:id')
    .get(protect, superAdminOnly, getAdminAccountById)
    .delete(protect, superAdminOnly, deleteAdminAccount);

router.route('/admins/:id/approve-application').put(protect, superAdminOnly, approveAdminApplicationBySuperAdmin);
router.route('/admins/:id/reject-application').put(protect, superAdminOnly, rejectAdminApplicationBySuperAdmin);
router.route('/admins/:id/toggle-active').put(protect, superAdminOnly, toggleAdminActiveStatus);
router.route('/admins/:id/reset-password').put(protect, superAdminOnly, resetAdminPasswordBySuperAdmin);

// --- Transaction History Routes by Admin ---
router.route('/transactions')
    .get(protect, adminOnly, getAllTransactionsForAdmin);

router.route('/transactions/all') // Specific route for deleting all
    .delete(protect, superAdminOnly, clearAllTransactionHistory); // SUPER ADMIN ONLY

// --- Dashboard Stats Route ---
router.route('/stats').get(protect, adminOnly, getDashboardStats);

// --- Loan Request Management by Admin ---
router.route('/loan-requests')
    .get(protect, adminOnly, getAllLoanRequestsForAdmin);
router.route('/loan-requests/:id/approve')
    .put(protect, adminOnly, approveLoanRequest);
router.route('/loan-requests/:id/reject')
    .put(protect, adminOnly, rejectLoanRequest);
router.route('/loan-requests/:id/disburse')
    .post(protect, adminOnly, disburseLoan); // POST to disburse as it creates transactions

// --- Investment Management by Admin ---
router.route('/investments')
    .get(protect, adminOnly, getAllInvestmentsForAdmin);
router.route('/investments/:id/process-payout')
    .put(protect, adminOnly, processInvestmentPayout);


module.exports = router;