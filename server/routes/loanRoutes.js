// server/routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const { requestLoan, getMyLoanRequests, repayLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware'); // User protection

router.route('/request').post(protect, requestLoan);
router.route('/my-requests').get(protect, getMyLoanRequests);
router.route('/:id/repay').post(protect, repayLoan);

module.exports = router;