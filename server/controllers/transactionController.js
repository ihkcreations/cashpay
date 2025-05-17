const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Merchant = require('../models/Merchant');
const Agent = require('../models/Agent');
const mongoose = require('mongoose');

const formatMobileNumber = (num) => {
    if (!num) return null;
    num = num.replace(/^(?:\+?88)?/, '').replace(/\D/g, '');
    if (!/^01[3-9]\d{8}$/.test(num)) return null;
    return num;
};

// --- AddMoney Function ---
const addMoney = async (req, res) => {
    const { amount } = req.body;
    const authenticatedUser = req.user;

    console.log("[AddMoney ENTER]");

    if (amount === undefined || amount === null || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Valid amount is required.' });
    }
    const numericAmount = parseFloat(amount);

    const session = await mongoose.startSession();
    // Corrected Session ID logging
    console.log(`[AddMoney SESSION START] Session ID: ${session.id.id.buffer.toString('hex')}`);
    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const userToUpdate = await User.findById(authenticatedUser._id).session(session);
        if (!userToUpdate) throw { isCustomError: true, status: 404, message: 'Authenticated user not found.' };

        console.log(`[AddMoney PRE-UPDATE] User Balance: ${userToUpdate.balance}`);
        userToUpdate.balance += numericAmount;
        await userToUpdate.save({ session });
        console.log(`[AddMoney POST-UPDATE] User Balance: ${userToUpdate.balance}`);

        const createdTransactionArray = await Transaction.create([{
            receiver: userToUpdate._id,
            receiverMobile: userToUpdate.mobileNumber,
            amount: numericAmount,
            type: 'Add Money',
            status: 'completed',
            balanceAfterTransaction: userToUpdate.balance
        }], { session });
        
        console.log(`[AddMoney COMMITING]`); // Changed from withTransaction
        await session.commitTransaction();
        console.log(`[AddMoney COMMIT SUCCESS] Transaction committed.`);
        
        try { await session.endSession(); console.log(`[AddMoney SESSION END on SUCCESS]`); }
        catch (e) { console.error(`[AddMoney SESSION END ERROR on SUCCESS]`, e); }

        return res.json({
            message: 'Money added successfully!',
            newBalance: userToUpdate.balance,
            transaction: createdTransactionArray[0]
        });

    } catch (error) {
        console.error(`[AddMoney CATCH BLOCK] Error: ${error.message}`, error);
        if (res.headersSent) {
            console.warn(`[AddMoney CATCH WARNING] Headers already sent. Suppressing error for: ${error.message}`);
            if (session && session.id && !session.hasEnded) { try { await session.endSession(); } catch(e){} }
            return;
        }

        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log(`[AddMoney ABORT SUCCESS] Aborted due to: ${error.message}`); }
            catch (e) { console.error(`[AddMoney ABORT ERROR]`, e); }
        }
        
        let statusCode = 500;
        let errorMessage = "Failed to add money.";
        if (error.isCustomError) { statusCode = error.status; errorMessage = error.message; }
        else if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) { statusCode = 503; errorMessage = 'Service temporarily busy. Please try again.'; }
        else if (error.message) { errorMessage = error.message; }
        
        if (session && session.id && !session.hasEnded) { try { await session.endSession(); } catch(e){} }
        return res.status(statusCode).json({ message: errorMessage, errorDetails: error.message });
    } finally {
        if (session && session.id && !session.hasEnded) {
            try {
                if (session.inTransaction()) await session.abortTransaction();
                await session.endSession();
                console.log(`[AddMoney FINALLY] Session definitively ended.`);
            } catch (e) { console.error(`[AddMoney FINALLY ERROR]`, e); }
        }
    }
};

// --- SendMoney Function ---
const sendMoney = async (req, res) => {
    const { receiverMobile, amount, pin, reference } = req.body;
    const authenticatedUser = req.user;
    const requestId = req.requestId || 'N/A_sendMoney';
    

     console.log(`[SendMoney ENTER] Request ID: ${requestId}`);

    // --- Initial Validations ---
    if (!receiverMobile || amount === undefined || amount === null || !pin) {
        return res.status(400).json({ message: 'Recipient mobile number, amount, and PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount. Amount must be a positive number.' });
    }
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'Invalid PIN format. PIN must be 5 digits.' });
    }
    const formattedReceiverMobile = formatMobileNumber(receiverMobile);
    if (!formattedReceiverMobile) {
        return res.status(400).json({ message: 'Invalid recipient mobile number format.' });
    }
    if (authenticatedUser.mobileNumber === formattedReceiverMobile) {
        return res.status(400).json({ message: 'Cannot send money to yourself.' });
    }

    const session = await mongoose.startSession();
    console.log(`[SendMoney SESSION START] Request ID: ${requestId}, Session ID: ${session.id.id.buffer.toString('hex')}`);
    let successfullyCommitted = false; // Flag to track if commit was successful

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        console.log(`[SendMoney TRANSACTION BLOCK START] Request ID: ${requestId}`);

        const sender = await User.findById(authenticatedUser._id).session(session);
        if (!sender) throw { isCustomError: true, status: 404, message: 'Authenticated sender not found.' };

        const receiver = await User.findOne({ mobileNumber: formatMobileNumber(receiverMobile) }).session(session);
        if (!receiver) throw { isCustomError: true, status: 404, message: 'Recipient user not found.' };

        const isMatch = await sender.matchPin(pin);
        if (!isMatch) throw { isCustomError: true, status: 401, message: 'Incorrect PIN.' };
        
        const numericAmount = parseFloat(amount);
        if (sender.balance < numericAmount) throw { isCustomError: true, status: 400, message: 'Insufficient balance.' };

        console.log(`[SendMoney PRE-UPDATE] Request ID: ${requestId}, Sender Bal: ${sender.balance}, Recv Bal: ${receiver.balance}`);
        sender.balance -= numericAmount;
        await sender.save({ session });

        receiver.balance += numericAmount;
        await receiver.save({ session });
        console.log(`[SendMoney POST-UPDATE] Request ID: ${requestId}, Sender Bal: ${sender.balance}, Recv Bal: ${receiver.balance}`);


        const senderDescription = req.body.reference ? `Sent to ${receiver.mobileNumber} (Ref: ${req.body.reference})` : `Sent to ${receiver.mobileNumber}`;
        const receiverDescription = req.body.reference ? `Received from ${sender.mobileNumber} (Ref: ${req.body.reference})` : `Received from ${sender.mobileNumber}`;
        
        const transactionDocsToCreate = [
            { sender: sender._id, receiver: receiver._id, senderMobile: sender.mobileNumber, receiverMobile: receiver.mobileNumber, amount: numericAmount, type: 'Send Money', status: 'completed', balanceAfterTransaction: sender.balance, description: senderDescription },
            { sender: sender._id, receiver: receiver._id, senderMobile: sender.mobileNumber, receiverMobile: receiver.mobileNumber, amount: numericAmount, type: 'Receive Money', status: 'completed', balanceAfterTransaction: receiver.balance, description: receiverDescription }
        ];

         
        
        console.log('[SendMoney PRE-INSERT TRANSACTIONS] Docs to create:', JSON.stringify(transactionDocsToCreate, null, 2));
        
        // Insert transactions and log the result
        const createdTransactions = await Transaction.insertMany(transactionDocsToCreate, { session: session });
        console.log('[SendMoney POST-INSERT TRANSACTIONS] Result length:', createdTransactions.length);

        if (createdTransactions.length !== 2) {
            console.error('[SendMoney WARNING] insertMany did not return 2 documents as expected. Actual:', createdTransactions.length, createdTransactions);
            // Consider this a failure if not all expected docs were inserted
            throw { isCustomError: true, status: 500, message: 'Failed to record all transaction details.'};
        }

        // Log IDs of created transactions
        createdTransactions.forEach((tx, index) => {
            console.log(`[SendMoney CREATED TRANSACTION ${index + 1}] ID: ${tx._id}`);
        });

        console.log(`[SendMoney ATTEMPTING COMMIT] Request ID: ${requestId}`);
        await session.commitTransaction();
        successfullyCommitted = true; // Set flag AFTER successful commit
        console.log(`[SendMoney COMMIT SUCCESS] Request ID: ${requestId}, Transaction committed.`);

        try { await session.endSession(); console.log(`[SendMoney SESSION END on SUCCESS]`); }
        catch (e) { console.error(`[SendMoney SESSION END ERROR on SUCCESS]`, e); }

        // If commit was successful, send success response
        return res.json({ // RETURN here to ensure no further code in this function executes
            message: 'Send Money successful!',
            newBalance: sender.balance,
            transaction: createdTransactions.find(t => t.type === 'Send Money' && t.sender.equals(sender._id)) || createdTransactions[0]
        });

    } catch (error) {
        console.error(`[SendMoney CATCH BLOCK] Request ID: ${requestId}, Error: ${error.message}`, error);

        if (res.headersSent) {
            console.warn(`[SendMoney CATCH WARNING] Request ID: ${requestId}, Headers already sent. Suppressing error for: ${error.message}. Transaction likely succeeded.`);
            // Session should be ended by the finally block
            return; 
        }

        if (session.inTransaction()) {
            try {
                await session.abortTransaction();
                console.log(`[SendMoney ABORT SUCCESS] Request ID: ${requestId}, Aborted due to: ${error.message}`);
            } catch (abortError) {
                console.error(`[SendMoney ABORT ERROR] Request ID: ${requestId}:`, abortError);
            }
        }
        
        let statusCode = 500;
        let errorMessage = 'Send Money failed. Please try again.';
        if (error.isCustomError) { statusCode = error.status; errorMessage = error.message; }
        else if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) {
            statusCode = 503; errorMessage = 'A temporary issue occurred. Please try again.';
        } else if (error.code === 11000) { // Duplicate key error
            statusCode = 409; // Conflict
            errorMessage = 'Transaction failed due to a conflict. Please retry.';
        } else if (error.name === 'ValidationError') { // Mongoose validation error
            statusCode = 400;
            errorMessage = 'Transaction data validation failed: ' + error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        if (session && session.id && !session.hasEnded) {
            try { await session.endSession(); console.log(`[SendMoney CATCH SESSION END - before error response]`); }
            catch(e){ console.error(`[SendMoney CATCH SESSION END ERROR - before error response]`, e); }
        }
        
        return res.status(statusCode).json({ message: errorMessage, errorDetails: error.message });

    } finally {
        if (session && session.id && !session.hasEnded) {
            try {
                if (session.inTransaction() && !successfullyCommitted) {
                    console.warn(`[SendMoney FINALLY WARNING] Session still in transaction and not committed. Attempting abort.`);
                    await session.abortTransaction();
                }
                await session.endSession();
                console.log(`[SendMoney FINALLY] Session definitively ended.`);
            } catch (finalError) {
                console.error(`[SendMoney FINALLY ERROR] Error in finally block:`, finalError);
            }
        } else if (session && session.id && session.hasEnded) {
            console.log(`[SendMoney FINALLY] Session was already ended.`);
        }
    }
};

// @desc    Perform Mobile Recharge for a given number
// @route   POST /api/transactions/mobile-recharge
// @access  Private
const mobileRecharge = async (req, res) => {
    const { targetMobileNumber, amount, pin, operator, reference } = req.body; // targetMobileNumber is the one to recharge
    const authenticatedUser = req.user; // User performing the recharge
    const requestId = req.requestId || 'N/A_mobileRecharge';

    console.log(`[MobileRecharge ENTER] Request ID: ${requestId}`);

    // --- Initial Validations ---
    if (!targetMobileNumber || amount === undefined || amount === null || !pin) {
        return res.status(400).json({ message: 'Target mobile number, amount, and PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount. Amount must be a positive number.' });
    }
    if (numericAmount > 1000 && numericAmount !== 1098 && numericAmount !== 1048 && numericAmount !== 1009 ) { // Max recharge for prototype, common Bkash limit is 1000 for self, higher for others can be specific packs.
        // allowing some common higher pack values explicitly for demo
        if (numericAmount > 5000) return res.status(400).json({ message: 'Maximum recharge amount is 1000 BDT (or specific packs).' });
    }

    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'Invalid PIN format. PIN must be 5 digits.' });
    }
    const formattedTargetMobile = formatMobileNumber(targetMobileNumber);
    if (!formattedTargetMobile) {
        return res.status(400).json({ message: 'Invalid target mobile number format for recharge.' });
    }

    const session = await mongoose.startSession();
    console.log(`[MobileRecharge SESSION START] Request ID: ${requestId}, Session ID: ${session.id.id.buffer.toString('hex')}`);

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const user = await User.findById(authenticatedUser._id).session(session);
        if (!user) throw { isCustomError: true, status: 404, message: 'Authenticated user not found.' };

        const isMatch = await user.matchPin(pin);
        if (!isMatch) throw { isCustomError: true, status: 401, message: 'Incorrect PIN.' };
        
        if (user.balance < numericAmount) throw { isCustomError: true, status: 400, message: 'Insufficient balance.' };

        console.log(`[MobileRecharge PRE-UPDATE] User Balance: ${user.balance}`);
        user.balance -= numericAmount;
        await user.save({ session });
        console.log(`[MobileRecharge POST-UPDATE] User Balance: ${user.balance}`);

        // For Mobile Recharge, the 'receiver' in the Transaction model might be null
        // as the funds aren't going to another user in *our* system.
        // The recharged number and operator go into specific fields or description.
        let transactionDescription = `Recharged ${formattedTargetMobile}`;
        if (operator) transactionDescription += ` (${operator})`;
        if (reference) transactionDescription += ` - Ref: ${reference}`;


        const createdTransactionArray = await Transaction.create([{
            sender: user._id, // The user who is paying for the recharge
            // receiver: null, // No internal user is receiving these funds
            senderMobile: user.mobileNumber,
            amount: numericAmount,
            type: 'Mobile Recharge',
            status: 'completed',
            balanceAfterTransaction: user.balance,
            rechargeMobileNumber: formattedTargetMobile, // Store the recharged number
            operator: operator || null, // Store operator if provided
            description: transactionDescription // Or use a more structured description
        }], { session });
        
        console.log(`[MobileRecharge COMMITING] Request ID: ${requestId}`);
        await session.commitTransaction();
        console.log(`[MobileRecharge COMMIT SUCCESS] Request ID: ${requestId}, Transaction committed.`);
        
        try { await session.endSession(); console.log(`[MobileRecharge SESSION END on SUCCESS] Request ID: ${requestId}`); }
        catch (e) { console.error(`[MobileRecharge SESSION END ERROR on SUCCESS] Request ID: ${requestId}`, e); }

        return res.json({
            message: 'Mobile Recharge successful!',
            newBalance: user.balance,
            transaction: createdTransactionArray[0]
        });

    } catch (error) {
        console.error(`[MobileRecharge CATCH BLOCK] Request ID: ${requestId}, Error: ${error.message}`, error);
        if (res.headersSent) { return; }
        if (session.inTransaction()) { 
            try {
                await session.abortTransaction();
                console.log(`[Mobile Recharge ABORT SUCCESS] Request ID: ${requestId}, Aborted due to: ${error.message}`);
            } catch (abortError) {
                console.error(`[Mobile Recharge ABORT ERROR] Request ID: ${requestId}:`, abortError);
            }
        }
        
        let statusCode = 500; let errorMessage = 'Mobile recharge failed.';
        if (error.isCustomError) { statusCode = error.status; errorMessage = error.message; }
        else if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) { /* ... */ }
        else if (error.message) { errorMessage = error.message; }
        
        if (session && session.id && !session.hasEnded) { 
            try { await session.endSession(); console.log(`[Mobile Recharge CATCH SESSION END - before error response]`); }
            catch(e){ console.error(`[Mobile Recharge CATCH SESSION END ERROR - before error response]`, e); }
        }
        return res.status(statusCode).json({ message: errorMessage, errorDetails: error.message });
    } finally {
        if (session && session.id && !session.hasEnded) {
            try {
                if (session.inTransaction() && !successfullyCommitted) {
                    console.warn(`[Mobile Recharge FINALLY WARNING] Session still in transaction and not committed. Attempting abort.`);
                    await session.abortTransaction();
                }
                await session.endSession();
                console.log(`[Mobile Recharge FINALLY] Session definitively ended.`);
            } catch (finalError) {
                console.error(`[Mobile Recharge FINALLY ERROR] Error in finally block:`, finalError);
            }
        } else if (session && session.id && session.hasEnded) {
            console.log(`[Mobile Recharge FINALLY] Session was already ended.`);
        }
    }
};


// --- GetStatement Function ---
const getStatement = async (req, res) => {
  const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15; // Match frontend ITEMS_PER_PAGE
    const skip = (page - 1) * limit;

    try {
        const query = {
          $or: [ // User is either the sender or the receiver
            { sender: userId },
            { receiver: userId }
            // More specific checks might be needed if sender/receiver can be null for user-relevant transactions
            // e.g., for Add Money, sender is null, receiver is user.
            // For Mobile Recharge, sender is user, receiver is null (number in receiverMobile/description)
          ]
        };

        const transactions = await Transaction.find(query)
            .populate('sender', 'name mobileNumber role shopName merchantName') // Populate relevant fields
            .populate('receiver', 'name mobileNumber role shopName merchantName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalTransactions = await Transaction.countDocuments(query);
        const totalPages = Math.ceil(totalTransactions / limit);

        // The complex fromDisplay/toDisplay logic might be better on frontend for user's own statement
        // as "Self" is very context-dependent. Backend can just provide populated sender/receiver.

        res.json({
            transactions, // Send raw populated transactions
            page,
            totalPages,
            totalTransactions
        });

    } catch (error) {
        console.error('Error fetching user transaction statement:', error);
        res.status(500).json({ message: 'Failed to fetch statement.', error: error.message });
    }
};

// @desc    Cash out from an agent
// @route   POST /api/transactions/cashout
// @access  Private
const cashOut = async (req, res) => {
    const { agentNumber, amount, pin, reference } = req.body; // agentNumber, amount, pin, optional reference
    const userCashingOut = req.user; // The user performing the cash out

    // --- Validations ---
    if (!agentNumber || amount === undefined || amount === null || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !pin) {
        return res.status(400).json({ message: 'Agent number, amount, and PIN are required.' });
    }
    const numericAmount = parseFloat(amount); // This is the amount the user wants to cash out
    const formattedAgentNumber = formatMobileNumber(agentNumber);
    if (!formattedAgentNumber) return res.status(400).json({ message: 'Invalid agent mobile number format.' });
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) return res.status(400).json({ message: 'Invalid PIN format.' });

    const CASH_OUT_FEE_PERCENTAGE = 0.0185;
    const fee = Math.ceil(numericAmount * CASH_OUT_FEE_PERCENTAGE);
    const totalDeductionFromUser = numericAmount + fee;
    // const amountToCreditAgent = numericAmount; // This was defined correctly, but I might have missed using it below

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const payer = await User.findById(userCashingOut._id).session(session);
        if (!payer) throw new Error('Authenticated user not found during transaction.');

        const isMatch = await payer.matchPin(pin);
        if (!isMatch) throw new Error('Incorrect PIN.');

        if (payer.balance < totalDeductionFromUser) {
            throw new Error(`Insufficient balance. Required: ${totalDeductionFromUser.toFixed(2)} (Amount: ${numericAmount.toFixed(2)} + Fee: ${fee.toFixed(2)})`);
        }

        const agentToCredit = await Agent.findOne({
            mobileNumber: formattedAgentNumber,
            isActive: true,
            applicationStatus: 'approved'
        }).session(session);

        if (!agentToCredit) throw new Error('Active agent not found with this number.');

        // --- Perform Operations ---
        payer.balance -= totalDeductionFromUser;
        await payer.save({ session });

        // Agent receives the 'numericAmount' (the amount user requested to cash out)
        agentToCredit.balance += numericAmount; // Use numericAmount here
        await agentToCredit.save({ session });

        const description = reference ? `Cash Out via Agent ${agentToCredit.shopName || agentToCredit.mobileNumber} (Ref: ${reference})` : `Cash Out via Agent ${agentToCredit.shopName || agentToCredit.mobileNumber}`;
        const cashOutTransactionData = {
            sender: payer._id,
            senderMobile: payer.mobileNumber,
            receiverMobile: agentToCredit.mobileNumber,
            amount: numericAmount,
            fee: fee,
            type: 'Cashout',
            status: 'completed',
            balanceAfterTransaction: payer.balance,
            description: description
        };
        
        const agentProcessedData = {
            sender: payer._id,
            receiver: agentToCredit._id,
            senderMobile: payer.mobileNumber,
            receiverMobile: agentToCredit.mobileNumber,
            amount: numericAmount, // <<<< THIS IS THE CORRECTION: Use numericAmount
            type: 'Cashout Processed',
            status: 'completed',
            balanceAfterTransaction: agentToCredit.balance,
            description: `Cash out for user ${payer.name || payer.mobileNumber}` + (reference ? ` (Ref: ${reference})` : '')
        };

        const createdTransactions = await Transaction.insertMany(
            [cashOutTransactionData, agentProcessedData],
            { session: session }
        );

        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: 'Cash Out successful!',
            newBalance: payer.balance,
            amountCashedOut: numericAmount, // This is correct
            feeCharged: fee,
            transaction: createdTransactions.find(t => t.type === 'Cashout') || createdTransactions[0]
        });

    } catch (error) {
        console.error('Error during Cash Out transaction (full error object):', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Cash Out: Transaction aborted."); }
            catch (abortError) { console.error("Cash Out: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500; let errMessage = 'Cash Out failed. Please try again.';
            if (error.message.includes('Authenticated user not found')) statusCode = 404;
            else if (error.message.includes('Active agent not found')) statusCode = 404;
            else if (error.message.includes('Incorrect PIN')) statusCode = 401;
            else if (error.message.includes('Insufficient balance')) statusCode = 400;
            else if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) {
                statusCode = 503; errMessage = 'Temporary issue. Please retry Cash Out.';
            }
            if (statusCode === 500 && error.message) errMessage = error.message;
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Cash Out: Error ending session:", endSessionError); }
        }
    }
};

// @desc    Make a payment to a merchant
// @route   POST /api/transactions/payment
// @access  Private
const payment = async (req, res) => {
    const { merchantId, amount, pin, reference } = req.body; // merchantId (can be _id or custom merchantId field)
    const userMakingPayment = req.user;

    // --- Validations ---
    if (!merchantId || amount === undefined || amount === null || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !pin) {
        return res.status(400).json({ message: 'Merchant ID/Number, amount, and PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) return res.status(400).json({ message: 'Invalid PIN format.' });

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        const payer = await User.findById(userMakingPayment._id).session(session);
        if (!payer) throw new Error('Authenticated user not found during transaction.');

        const isMatch = await payer.matchPin(pin);
        if (!isMatch) throw new Error('Incorrect PIN.');

        if (payer.balance < numericAmount) throw new Error('Insufficient balance for payment.');

        // Find the merchant
        let merchant = await Merchant.findOne({
            merchantId: merchantId, // First, try finding by the custom string merchantId
            isActive: true
        }).session(session);

        // If not found by custom merchantId, and if the input merchantId string is a valid ObjectId format,
        // then try finding by _id.
        if (!merchant && mongoose.Types.ObjectId.isValid(merchantId)) {
            merchant = await Merchant.findOne({
                _id: merchantId,
                isActive: true
            }).session(session);
        }

        if (!merchant) throw new Error('Active merchant not found or invalid merchant ID.');

        // --- Perform Operations ---
        // 1. Deduct from payer
        payer.balance -= numericAmount;
        await payer.save({ session });

        // 2. Credit merchant's balance
        merchant.balance += numericAmount;
        await merchant.save({ session });

        // 3. Record transaction for the payer
        const description = reference ? `Payment to ${merchant.merchantName} (Ref: ${reference})` : `Payment to ${merchant.merchantName}`;
        const paymentTransactionData = {
            sender: payer._id,
            // For 'Payment', the receiver is the merchant entity.
            // We can store merchant's MongoDB _id if we want to link,
            // or just their custom merchantId in description/receiverMobile.
            receiver: merchant._id, // Storing merchant's ObjectId as receiver
            senderMobile: payer.mobileNumber,
            receiverMobile: merchant.merchantId, // Or merchant.mobileNumber if that's what users search by
            amount: numericAmount,
            type: 'Payment',
            status: 'completed',
            balanceAfterTransaction: payer.balance,
            description: description
        };

        // Optional: Record a transaction for the merchant's statement (e.g., "Payment Received")
        // Similar to how we did for Send Money with a 'Receive Money' type.
        const merchantReceivedData = {
            sender: payer._id, // User who paid
            receiver: merchant._id, // Merchant who received
            senderMobile: payer.mobileNumber,
            receiverMobile: merchant.merchantId,
            amount: numericAmount,
            type: 'Payment Received', // Custom type for merchant's view
            status: 'completed',
            balanceAfterTransaction: merchant.balance,
            description: `Payment from ${payer.name || payer.mobileNumber}` + (reference ? ` (Ref: ${reference})` : '')
        };


        const createdTransactions = await Transaction.insertMany(
            [paymentTransactionData, merchantReceivedData], // Insert both
            { session: session }
        );

        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: 'Payment successful!',
            newBalance: payer.balance,
            transaction: createdTransactions.find(t => t.type === 'Payment') || createdTransactions[0]
        });

    } catch (error) {
        console.error('Error during Payment transaction (full error object):', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Payment: Transaction aborted."); }
            catch (abortError) { console.error("Payment: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500; let errMessage = 'Payment failed. Please try again.';
            if (error.message.includes('Authenticated user not found')) statusCode = 404;
            else if (error.message.includes('Active merchant not found')) statusCode = 404;
            else if (error.message.includes('Incorrect PIN')) statusCode = 401;
            else if (error.message.includes('Insufficient balance')) statusCode = 400;
            else if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) {
                statusCode = 503; errMessage = 'Temporary issue. Please retry Payment.';
            }
            if (statusCode === 500 && error.message) errMessage = error.message;
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Payment: Error ending session:", endSessionError); }
        }
    }
};

// @desc    User pays a utility bill
// @route   POST /api/transactions/pay-bill
// @access  Private (User only)
const payBill = async (req, res) => {
    const { billerName, billerCategory, accountNumber, amount, pin, reference } = req.body;
    const userPaying = req.user;

    // --- Validations ---
    if (!billerName || !accountNumber || !amount || !pin) {
        return res.status(400).json({ message: 'Biller name, account number, amount, and PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'Invalid PIN format.' });
    }
    // Optional: Validate accountNumber format based on biller if you have such rules

    // For Pay Bill, there might be a small service fee charged to the user
    // Let's assume no fee for this prototype, or a very small fixed one if desired.
    // const SERVICE_FEE = 5; // Example fixed fee
    // const totalDeduction = numericAmount + SERVICE_FEE;
    const totalDeduction = numericAmount; // Assuming no extra fee for prototype

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({ /* ... options ... */ });

        const payer = await User.findById(userPaying._id).session(session);
        if (!payer) throw new Error('User_Not_Found: Authenticated user not found.');
        if (!payer.isVerified) throw new Error('User_Not_Verified: Your account is not verified.');

        const isPinMatch = await payer.matchPin(pin);
        if (!isPinMatch) throw new Error('User_PIN_Incorrect: Incorrect PIN.');

        if (payer.balance < totalDeduction) {
            throw new Error(`User_Insufficient_Balance: Insufficient balance. Required: ৳${totalDeduction.toFixed(2)}`);
        }

        // Deduct amount from user's balance
        payer.balance -= totalDeduction;
        await payer.save({ session });

        // Create transaction record
        let description = `Bill payment for ${billerName} (${billerCategory || 'Utility'}), Acc: ${accountNumber}`;
        if (reference) description += ` (Ref: ${reference})`;

        const payBillTransactionData = {
            sender: payer._id,
            senderModel: 'User',
            // receiver: null, // No specific internal receiver for a generic biller
            // receiverModel: null,
            receiverMobile: accountNumber, // Store account number here or in a dedicated field if added to Transaction model
            amount: numericAmount,
            // fee: SERVICE_FEE, // If fee was applied
            type: 'Pay Bill',
            status: 'completed',
            balanceAfterTransaction: payer.balance,
            description: description
        };

        const createdTransactions = await Transaction.insertMany([payBillTransactionData], { session });

        await session.commitTransaction();
        transactionCommitted = true;

        // In a real app, this would trigger an API call to the biller's system.
        // For prototype, we just record it.

        res.json({
            message: `Bill payment of ৳${numericAmount.toFixed(2)} for ${billerName} (Acc: ${accountNumber}) successful.`,
            newBalance: payer.balance,
            transaction: createdTransactions[0]
        });

    } catch (error) { /* ... (Robust error handling similar to sendMoney/cashOut) ... */
        console.error('Error during Pay Bill transaction:', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("PayBill: Transaction aborted."); }
            catch (abortError) { console.error("PayBill: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500; let errMessage = error.message || 'Bill payment failed. Please try again.';
            if (error.message?.startsWith('User_Not_Found')) statusCode = 404;
            else if (error.message?.startsWith('User_Not_Verified')) statusCode = 403;
            else if (error.message?.startsWith('User_PIN_Incorrect')) statusCode = 401;
            else if (error.message?.startsWith('User_Insufficient_Balance')) statusCode = 400;
            else if (error.errorLabels?.includes('TransientTransactionError')) statusCode = 503;
            
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally { 
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("PayBill: Error ending session:", endSessionError); }
        }
    }
};



module.exports = {
    addMoney,
    sendMoney,
    mobileRecharge,
    cashOut,
    payment,
    getStatement,
    payBill,
};