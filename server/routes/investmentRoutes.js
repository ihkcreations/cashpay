// server/routes/investmentRoutes.js
const express = require('express');
const router = express.Router();
const { makeInvestment, getMyInvestments, withdrawInvestment } = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware'); // User protection

router.route('/new').post(protect, makeInvestment);
router.route('/my-investments').get(protect, getMyInvestments);
router.route('/:id/withdraw').post(protect, withdrawInvestment);

module.exports = router;