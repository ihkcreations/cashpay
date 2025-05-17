// server/models/LoanRequest.js
const mongoose = require('mongoose');

const loanRequestSchema = mongoose.Schema({
    user: { // The user who requested the loan
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    requestedAmount: {
        type: Number,
        required: true,
        min: [100, 'Requested loan amount must be at least 100.'] // Example minimum
    },
    reason: { // Optional reason for the loan
        type: String,
        trim: true,
        maxlength: [500, 'Reason cannot be more than 500 characters.']
    },
    status: {
        type: String,
        required: true,
        enum: [
            'pending',      // User has applied
            'approved',     // Admin has approved, awaiting disbursement
            'rejected',     // Admin has rejected
            'disbursed',    // Loan amount transferred to user's balance
            'repaying',     // User has started repaying (if partial repayments allowed)
            'repaid',       // Loan fully repaid
            'defaulted'     // Loan past due and marked as defaulted
        ],
        default: 'pending'
    },
    // Timestamps for various stages
    requestedAt: { type: Date, default: Date.now },
    adminActionAt: { type: Date }, // When admin approved/rejected
    approvedBy: { // Admin who took action
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAmount: { // Admin might approve a different amount than requested
        type: Number
    },
    disbursedAt: { type: Date },
    // For a simple loan system, we might not need complex repayment terms initially
    // Repayment terms (can be an object for more detail later)
    // repaymentTerms: {
    //     interestRate: { type: Number, default: 0 }, // Example: 0.05 for 5%
    //     durationMonths: { type: Number },
    //     monthlyPayment: { type: Number }
    // },
    dueDate: { type: Date }, // When the loan is due for full repayment
    repaidAmount: { // Amount repaid so far by the user
        type: Number,
        default: 0
    },
    // Notes by admin (optional)
    adminNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

loanRequestSchema.index({ user: 1 });
loanRequestSchema.index({ status: 1 });

const LoanRequest = mongoose.model('LoanRequest', loanRequestSchema);

module.exports = LoanRequest;