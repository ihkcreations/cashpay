
const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
  sender: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User' // This was too simple if sender can be Agent too
      refPath: 'senderModel', // Dynamic reference
      default: null
  },
  senderModel: { // Specifies which model 'sender' refers to
      type: String,
      enum: [null, 'User', 'Agent', 'Admin'], // Add Admin if they can transact
      default: null
  },
  receiver: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User' // This was too simple
      refPath: 'receiverModel', // Dynamic reference
      default: null
  },
  receiverModel: { // Specifies which model 'receiver' refers to
      type: String,
      enum: [null, 'User', 'Agent', 'Merchant', 'Admin'], // Add Merchant & Admin
      default: null
  },
  senderMobile: { // Store mobile numbers directly for clarity, esp. for external parties
      type: String,
      // required: function() { return !this.sender && this.type !== 'Add Money'; } // Required if sender ObjectId is null and not Add Money
      default: null
  },
  receiverMobile: { // Store mobile numbers directly for clarity
      type: String,
      // required: function() { return !this.receiver && this.type !== 'Cashout' && this.type !== 'Mobile Recharge' && this.type !== 'Pay Bill'; } // Required if receiver ObjectId is null and not these types
      default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
      type: String,
      required: true,
      enum: [
        'Send Money', 'Receive Money', 'Add Money',
        'Mobile Recharge', 'Payment', 'Payment Received',
        'Cashout', 'Cashout Processed',
        'Pay Bill',
        // New Types for Loan and Invest
        'Loan Application Fee', // Optional if there's a fee to apply
        'Loan Disbursed',       // Admin gives loan to user
        'Loan Repayment',       // User repays loan
        'Investment Made',      // User invests money
        'Investment Profit',    // Profit part of the return
        'Investment Withdrawal', // User withdraws principal + profit
        'Cash In (User Received)', // Transaction for the user receiving the cash-in
        'Cash In Processed (Agent)', // Transaction for the agent performing the cash-in
        'User Cashout via Agent',      // New: User's account debited by agent action
        'Agent Processed User Cashout',// New: Agent's e-wallet credited for processing user cashout
        'Pay Bill', // This is when user pays their own bill
        'Agent Pay Bill for User', // New: Agent pays a bill on behalf of a user
      ]
    },
  fee: { // Transaction fee (e.g., for Cashout)
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed' // For prototype, assume transactions complete successfully
  },
  description: { // e.g., reference number for bill, operator for recharge
    type: String
  },
   balanceAfterTransaction: { // Store the user's balance *after* this transaction
       type: Number,
       default: null // Will be set when transaction is processed
   },
    rechargeMobileNumber: { // The specific mobile number that was recharged
      type: String,
      // Required only if type is 'Mobile Recharge'
      required: function() { return this.type === 'Mobile Recharge'; },
      default: null
    },
    operator: { // Mobile operator (e.g., Grameenphone, Robi)
        type: String,
        default: null // Optional
    }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;