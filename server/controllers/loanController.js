// server/controllers/loanController.js
const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Admin = require('../models/Admin'); // For approvedBy field
const mongoose = require('mongoose');

// --- USER ENDPOINTS ---

// @desc    User requests a new loan
// @route   POST /api/loans/request
// @access  Private (User)
const requestLoan = async (req, res) => {
    const { requestedAmount, reason } = req.body;
    const userId = req.user._id; // From protect middleware

    if (!requestedAmount || isNaN(parseFloat(requestedAmount)) || parseFloat(requestedAmount) <= 0) {
        return res.status(400).json({ message: 'Valid requested amount is required.' });
    }
    const numericAmount = parseFloat(requestedAmount);
    // Add validation for minimum/maximum loan request amount if needed

    try {
        // Optional: Check if user has existing pending or large outstanding loans
        // const existingLoans = await LoanRequest.find({ user: userId, status: { $in: ['pending', 'approved', 'disbursed', 'repaying'] } });
        // if (existingLoans.length > 0) { // Simple check for existing loan
        //     return res.status(400).json({ message: "You already have an active or pending loan request." });
        // }

        const newLoanRequest = new LoanRequest({
            user: userId,
            requestedAmount: numericAmount,
            reason: reason || '',
            status: 'pending'
        });
        await newLoanRequest.save();
        res.status(201).json({ message: 'Loan request submitted successfully. Awaiting review.', loanRequest: newLoanRequest });
    } catch (error) {
        console.error("Error requesting loan:", error);
        res.status(500).json({ message: 'Failed to submit loan request.' });
    }
};

// @desc    User gets their loan requests
// @route   GET /api/loans/my-requests
// @access  Private (User)
const getMyLoanRequests = async (req, res) => {
    try {
        const loanRequests = await LoanRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(loanRequests);
    } catch (error) {
        console.error("Error fetching user's loan requests:", error);
        res.status(500).json({ message: 'Failed to fetch loan requests.' });
    }
};

// @desc    User makes a loan repayment (Simplified: repays full or partial amount)
// @route   POST /api/loans/:id/repay
// @access  Private (User)
const repayLoan = async (req, res) => {
    const { amountToRepay } = req.body;
    const loanId = req.params.id;
    const userId = req.user._id;

    if (!amountToRepay || isNaN(parseFloat(amountToRepay)) || parseFloat(amountToRepay) <= 0) {
        return res.status(400).json({ message: 'Valid repayment amount is required.' });
    }
    const numericRepayAmount = parseFloat(amountToRepay);

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const loanRequest = await LoanRequest.findOne({ _id: loanId, user: userId }).session(session);
        if (!loanRequest) throw new Error('Loan request not found or does not belong to you.');
        if (loanRequest.status !== 'disbursed' && loanRequest.status !== 'repaying') {
            throw new Error(`Cannot repay loan with status: ${loanRequest.status}.`);
        }

        const user = await User.findById(userId).session(session);
        if (!user) throw new Error('User not found.');
        if (user.balance < numericRepayAmount) throw new Error('Insufficient balance for repayment.');

        // Update user balance
        user.balance -= numericRepayAmount;
        user.outstandingLoanAmount = Math.max(0, (user.outstandingLoanAmount || 0) - numericRepayAmount);
        await user.save({ session });

        // Update loan request
        loanRequest.repaidAmount = (loanRequest.repaidAmount || 0) + numericRepayAmount;
        // A simple check for full repayment (total approved amount - could include interest later)
        const totalOwed = loanRequest.approvedAmount || loanRequest.requestedAmount; // Use approved if available
        if (loanRequest.repaidAmount >= totalOwed) {
            loanRequest.status = 'repaid';
        } else {
            loanRequest.status = 'repaying';
        }
        await loanRequest.save({ session });

        // Create transaction record
        const repaymentTransaction = new Transaction({
            sender: userId,
            // receiver: null, // System receives repayment
            senderModel: 'User',
            amount: numericRepayAmount,
            type: 'Loan Repayment',
            description: `Loan repayment for request ID: ${loanId}`,
            status: 'completed',
            balanceAfterTransaction: user.balance
        });
        await repaymentTransaction.save({ session });


        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: 'Loan repayment successful.',
            loanRequest,
            newBalance: user.balance
        });

    } catch (error) {
        console.error("Error repaying loan:", error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Loan Repayment: Transaction aborted."); }
            catch (abortError) { console.error("Loan Repayment: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            const statusCode = error.message.includes('Insufficient balance') ? 400 : 500;
            res.status(statusCode).json({ message: error.message || 'Failed to process loan repayment.' });
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Loan Repayment: Error ending session:", endSessionError); }
        }
    }
};


module.exports = {
    requestLoan,
    getMyLoanRequests,
    repayLoan,
    // Admin loan management functions will be in adminDataController.js
};