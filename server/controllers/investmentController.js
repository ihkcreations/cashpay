// server/controllers/investmentController.js
const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// --- USER ENDPOINTS ---

// @desc    User makes a new investment
// @route   POST /api/investments/new
// @access  Private (User)
const makeInvestment = async (req, res) => {
    const { investedAmount, investmentType, termMonths } = req.body; // termMonths optional
    const userId = req.user._id;

    if (!investedAmount || isNaN(parseFloat(investedAmount)) || parseFloat(investedAmount) <= 0) {
        return res.status(400).json({ message: 'Valid investment amount is required.' });
    }
    const numericAmount = parseFloat(investedAmount);
    // Add validation for minimum/maximum investment amount if needed

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const user = await User.findById(userId).session(session);
        if (!user) throw new Error('User not found.');
        if (user.balance < numericAmount) throw new Error('Insufficient balance to make investment.');

        // Deduct amount from user's balance
        user.balance -= numericAmount;
        user.totalInvestedAmount = (user.totalInvestedAmount || 0) + numericAmount;
        await user.save({ session });

        // Create transaction record for investment
        const investmentTx = new Transaction({
            sender: userId,
            senderModel: 'User',
            // receiver: null, // Investment goes to the "system" or a designated investment pool
            amount: numericAmount,
            type: 'Investment Made',
            description: `Investment of type: ${investmentType || 'standard'}`,
            status: 'completed',
            balanceAfterTransaction: user.balance
        });
        const savedInvestmentTx = await investmentTx.save({ session });

        // Create new investment record
        const newInvestment = new Investment({
            user: userId,
            investedAmount: numericAmount,
            investmentType: investmentType || 'standard_yield',
            termMonths: termMonths || null, // Optional
            // expectedReturnRate can be set based on investmentType or a default
            status: 'active',
            investmentTransactionId: savedInvestmentTx._id
        });
        // The pre-save hook in Investment model will calculate maturityDate if termMonths is present
        await newInvestment.save({ session });


        await session.commitTransaction();
        transactionCommitted = true;

        res.status(201).json({
            message: 'Investment successful!',
            investment: newInvestment,
            newBalance: user.balance
        });

    } catch (error) {
        console.error("Error making investment:", error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Investment: Transaction aborted."); }
            catch (abortError) { console.error("Investment: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
             const statusCode = error.message.includes('Insufficient balance') ? 400 : 500;
            res.status(statusCode).json({ message: error.message || 'Failed to make investment.' });
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Investment: Error ending session:", endSessionError); }
        }
    }
};

// @desc    User gets their investments
// @route   GET /api/investments/my-investments
// @access  Private (User)
const getMyInvestments = async (req, res) => {
    try {
        const investments = await Investment.find({ user: req.user._id }).sort({ investmentDate: -1 });
        res.json(investments);
    } catch (error) {
        console.error("Error fetching user's investments:", error);
        res.status(500).json({ message: 'Failed to fetch investments.' });
    }
};

// @desc    User withdraws a matured investment (Simplified)
// @route   POST /api/investments/:id/withdraw
// @access  Private (User)
const withdrawInvestment = async (req, res) => {
    const investmentId = req.params.id;
    const userId = req.user._id;

    // In a real app, this would involve admin approval for payout if status is 'matured'
    // For prototype, let's assume if it's 'matured', user can trigger withdrawal which updates balance.
    // Admin would first mark it 'matured' and calculate profit.

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({ /* ... options ... */ });

        const investment = await Investment.findOne({ _id: investmentId, user: userId }).session(session);
        if (!investment) throw new Error('Investment not found or does not belong to you.');
        // For prototype, let's say only 'matured' or 'payout_pending' can be withdrawn by user directly
        if (investment.status !== 'matured' && investment.status !== 'payout_pending') {
            throw new Error(`Cannot withdraw investment with status: ${investment.status}. Awaiting maturity or admin payout processing.`);
        }

        const user = await User.findById(userId).session(session);
        if (!user) throw new Error('User not found.');

        // Calculate total payout (principal + profit, profit should have been set by admin when marking 'matured')
        const payoutAmount = investment.investedAmount + (investment.profitEarned || 0);
        investment.totalPayoutAmount = payoutAmount; // Ensure this is set

        // Update user balance
        user.balance += payoutAmount;
        user.totalInvestedAmount = Math.max(0, (user.totalInvestedAmount || 0) - investment.investedAmount);
        await user.save({ session });

        // Create transaction record for withdrawal
        const withdrawalTx = new Transaction({
            // sender: null, // System pays out
            receiver: userId,
            receiverModel: 'User',
            amount: payoutAmount,
            type: 'Investment Withdrawal',
            description: `Withdrawal for investment ID: ${investmentId}`,
            status: 'completed',
            balanceAfterTransaction: user.balance
        });
        const savedWithdrawalTx = await withdrawalTx.save({ session });

        // Update investment status
        investment.status = 'withdrawn';
        investment.payoutDate = new Date();
        investment.payoutTransactionId = savedWithdrawalTx._id;
        await investment.save({ session });


        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: 'Investment withdrawal successful!',
            investment,
            newBalance: user.balance
        });

    } catch (error) { 
        console.error("Error investing:", error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Loan Repayment: Transaction aborted."); }
            catch (abortError) { console.error("Loan Repayment: Error aborting transaction:", abortError); }
        }
    }
    finally { 
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Loan Repayment: Error ending session:", endSessionError); }
        }
    }
};


module.exports = {
    makeInvestment,
    getMyInvestments,
    withdrawInvestment,
    // Admin investment management functions will be in adminDataController.js
};