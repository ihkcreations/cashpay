// server/models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = mongoose.Schema({
    user: { // The user making the investment
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    investedAmount: {
        type: Number,
        required: true,
        min: [500, 'Investment amount must be at least 500.'] // Example minimum
    },
    investmentDate: {
        type: Date,
        default: Date.now
    },
    investmentType: { // For different investment plans/schemes later
        type: String,
        trim: true,
        default: 'standard_yield' // Example default type
    },
    // For fixed-term investments
    termMonths: { // Duration in months
        type: Number,
        // required: function() { return this.investmentType === 'fixed_term'; } // Example conditional
    },
    maturityDate: {
        type: Date
    },
    // For profit/return calculation
    expectedReturnRate: { // Annualized rate, e.g., 0.08 for 8%
        type: Number,
        default: 0 // Or based on investmentType
    },
    profitEarned: { // Actual profit amount calculated at maturity/payout
        type: Number,
        default: 0
    },
    totalPayoutAmount: { // investedAmount + profitEarned
        type: Number,
        default: 0
    },
    status: {
        type: String,
        required: true,
        enum: [
            'active',       // Investment is ongoing
            'matured',      // Term completed, ready for payout or reinvestment
            'payout_pending',// Admin initiated payout, processing
            'withdrawn',    // Principal + profit paid out to user
            'cancelled'     // If an investment was cancelled before starting (rare)
        ],
        default: 'active'
    },
    payoutDate: { // When the actual payout was made
        type: Date
    },
    // Reference to transaction for initial investment
    investmentTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    // Reference to transaction for payout
    payoutTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }
}, {
    timestamps: true
});

investmentSchema.index({ user: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ investmentType: 1 });

// Calculate maturityDate if termMonths is set
investmentSchema.pre('save', function(next) {
    if (this.isModified('termMonths') && this.termMonths > 0 && this.investmentDate) {
        const maturity = new Date(this.investmentDate);
        maturity.setMonth(maturity.getMonth() + this.termMonths);
        this.maturityDate = maturity;
    }
    next();
});


const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;