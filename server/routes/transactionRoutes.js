// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const {
  addMoney,
  sendMoney,
  getStatement,
  cashOut,
  mobileRecharge,
  payment,
  payBill
} = require('../controllers/transactionController');
const { protect, agentProtect } = require('../middleware/authMiddleware'); // Need protect middleware

// All transaction routes should be protected (user must be logged in)
router.route('/add-money').post(protect, addMoney);
router.route('/send-money').post(protect, sendMoney);
router.route('/mobile-recharge').post(protect, mobileRecharge);
router.route('/statement').get(protect, getStatement);
router.route('/cashout').post(protect, cashOut);
router.route('/payment').post(protect, payment);
router.route('/pay-bill').post(protect, payBill);


// router.route('/pay-bill').post(protect, payBill);


module.exports = router;