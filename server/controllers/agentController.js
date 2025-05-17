const Agent = require('../models/Agent');
const User = require('../models/User');
const OTP = require('../models/OTP'); // Assuming OTP model is used
const generateToken = require('../utils/generateToken'); // For login after PIN set
const mongoose = require('mongoose'); // For sessions
const Transaction = require('../models/Transaction'); // Need Transaction model

// Helper function (can be shared in a utils file)
const formatMobileNumber = (num) => {
    if (!num) return null;
    num = String(num).replace(/^(?:\+?88)?/, '').replace(/\D/g, '');
    if (num.startsWith('01') && num.length === 11) return num;
    if (num.startsWith('1') && num.length === 10) return `0${num}`;
    return null;
};

// @desc    Agent requests/resends an OTP for their application or other agent actions
// @route   POST /api/agent/send-otp
// @access  Public
const agentSendOtp = async (req, res) => {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
        return res.status(400).json({ message: 'Mobile number is required.' });
    }
    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) {
        return res.status(400).json({ message: 'Invalid mobile number format.' });
    }

    try {
        // Check if an agent record exists for this mobile number
        const agent = await Agent.findOne({ mobileNumber: formattedMobile });

        if (!agent) {
            // This scenario means an OTP is requested for a number not yet in the agent application process
            // OR the agent application process starts with /api/agent/apply which creates the record first.
            // If /apply creates the agent record first, then this 'agent not found' should ideally not happen
            // if send-otp is only called after /apply.
            return res.status(404).json({ message: 'No agent application found for this mobile number. Please apply first.' });
        }

        // Check current application status
        if (agent.applicationStatus === 'approved' && agent.pin) {
            return res.status(400).json({ message: 'Agent account is already active and verified. OTP not needed for application.' });
        }
        if (agent.applicationStatus === 'pending_admin_approval') {
            return res.status(400).json({ message: 'Your OTP is verified. Application is pending admin approval. No new OTP needed now.' });
        }
        if (agent.applicationStatus === 'rejected') {
            return res.status(400).json({ message: 'Your previous application was rejected. Please start a new application if desired.' });
        }
        // Allow OTP send only if status is 'pending_otp_verification' (or if it's a new application where /apply calls this)

        // --- OTP Generation Logic ---
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6); // 6-digit OTP
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        await OTP.findOneAndUpdate(
            { mobileNumber: formattedMobile }, // Link OTP to mobile number
            { otpCode, expiresAt },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`\n--- AGENT OTP for ${formattedMobile}: ${otpCode} ---\n`);

        res.json({
            message: 'OTP sent successfully to agent mobile.',
            prototypeOtp: otpCode // For prototype UI display
        });

    } catch (error) {
        console.error('Agent Send OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP to agent. Please try again.', errorDetails: error.message });
    }
};

// @desc    Agent applies for an account (Registration Phase 1)
// @route   POST /api/agent/apply
// @access  Public
const agentApply = async (req, res) => {
    const { shopName, district, area, name, nidNumber, mobileNumber } = req.body;

    if (!shopName || !district || !area || !name || !nidNumber || !mobileNumber) {
        return res.status(400).json({ message: 'All fields are required for agent application.' });
    }
    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile) return res.status(400).json({ message: 'Invalid mobile number format.' });

    try {
        // Check if an agent or user already exists with this mobile number
        const existingAgent = await Agent.findOne({ mobileNumber: formattedMobile });
        if (existingAgent) {
            if (existingAgent.isActive && existingAgent.pin) { // Active and PIN set
                return res.status(400).json({ message: 'An active agent account already exists with this mobile number.' });
            }
            if (existingAgent.applicationStatus === 'pending_admin_approval' || existingAgent.applicationStatus === 'approved') {
                return res.status(400).json({ message: 'An application for this mobile number is already pending or approved.' });
            }
            // If 'pending_otp_verification' or 'rejected', allow re-application by updating
        }
        // Also check User collection to prevent a regular user from applying with same number, or vice-versa
        const existingUser = await User.findOne({ mobileNumber: formattedMobile });
        if (existingUser) {
            return res.status(400).json({ message: 'This mobile number is already registered as a regular user.' });
        }


        // Create or update Agent document
        let agentApplicant = existingAgent; // Could be an agent with status 'pending_otp_verification' or 'rejected'
        if (!agentApplicant) {
            agentApplicant = new Agent(); // Create new if no existing agent record
        }
        
        agentApplicant.mobileNumber = formattedMobile;
        agentApplicant.name = name;
        agentApplicant.shopName = shopName;
        agentApplicant.district = district;
        agentApplicant.area = area;
        agentApplicant.nidNumber = nidNumber;
        agentApplicant.applicationStatus = 'pending_otp_verification';
        agentApplicant.isActive = false;
        agentApplicant.pin = undefined; // Ensure PIN is cleared for re-application
        agentApplicant.balance = 10000; // Reset balance for new/re-application

        await agentApplicant.save();

        // --- Send OTP ---
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await OTP.findOneAndUpdate(
            { mobileNumber: formattedMobile }, { otpCode, expiresAt },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`\n--- AGENT APP OTP for ${formattedMobile}: ${otpCode} ---\n`);

        res.status(201).json({
            message: 'Agent application submitted. Please verify your mobile number with OTP.',
            mobileNumber: formattedMobile,
            prototypeOtp: otpCode // Send OTP back
        });

    } catch (error) {
        console.error('Agent Application Error:', error);
        if (error.code === 11000) { // Duplicate key error (e.g. NID)
            return res.status(400).json({ message: `Agent application failed. ${error.keyValue.nidNumber ? 'NID Number' : 'Mobile Number'} already exists.` });
        }
        res.status(500).json({ message: 'Agent application failed. Please try again.', errorDetails: error.message });
    }
};


// @desc    Agent Verifies OTP for Application (Registration Phase 2)
// @route   POST /api/agent/verify-otp
// @access  Public
const agentVerifyOtp = async (req, res) => {
    const { mobileNumber, otpCode } = req.body;

    if (!mobileNumber || !otpCode) {
        return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }
    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile || !otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
         return res.status(400).json({ message: 'Valid mobile number and 6-digit OTP are required.'});
    }

    try {
        const otpRecord = await OTP.findOne({ mobileNumber: formattedMobile, otpCode });
        if (!otpRecord) return res.status(400).json({ message: 'Invalid OTP.' });
        if (otpRecord.expiresAt < new Date()) { /* ... OTP expired logic ... */ }

        const agentApplicant = await Agent.findOne({ mobileNumber: formattedMobile });
        if (!agentApplicant || agentApplicant.applicationStatus !== 'pending_otp_verification') {
            // ... (handle if not in correct state) ...
            return res.status(400).json({ message: 'No pending OTP verification for this agent or invalid state.' });
        }

        agentApplicant.applicationStatus = 'pending_admin_approval';
        await agentApplicant.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        res.json({ message: 'OTP verified. Application pending admin approval.' });

    } catch (error) {
        console.error('Agent OTP Verification Error:', error);
        res.status(500).json({ message: 'OTP verification failed.', errorDetails: error.message });
    }
};

// @desc    Agent Sets PIN after Admin Approval (Login - Continuation)
// @route   POST /api/agent/set-pin
// @access  Public (but logically follows admin approval)
const agentSetPin = async (req, res) => {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
        return res.status(400).json({ message: 'Mobile number and PIN are required.' });
    }
    const formattedMobile = formatMobileNumber(mobileNumber);
    if (!formattedMobile || !pin || pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'Valid mobile number and 5-digit PIN are required.'});
    }

    try {
        const agentUser = await Agent.findOne({
            mobileNumber: formattedMobile,
            applicationStatus: 'approved' // Must be approved by admin
        });

        if (!agentUser) {
            return res.status(404).json({ message: 'Approved agent account not found for this number.' });
        }
        if (agentUser.pin) { // Check if PIN is already set
            return res.status(400).json({ message: 'PIN already set for this agent. Please login.' });
        }
        if (agentUser.isActive) { // Should not happen if PIN not set, but good check
            return res.status(400).json({ message: 'Agent account already active. Please login.' });
        }


        agentUser.pin = pin; // Hashed by pre-save hook
        agentUser.isActive = true; // Activate the agent
        await agentUser.save();

        // Fetch again to select fields for token generation and response
        const loggedInAgent = await Agent.findById(agentUser._id).select('mobileNumber name role shopName balance isActive');


        res.json({
            _id: loggedInAgent._id,
            mobileNumber: loggedInAgent.mobileNumber,
            name: loggedInAgent.name,
            role: 'agent', // Explicitly set role for token and client
            shopName: loggedInAgent.shopName,
            balance: loggedInAgent.balance,
            isActive: loggedInAgent.isActive,
            token: generateToken(loggedInAgent._id, 'agent'), // Use 'agent' for role in token
            message: 'PIN set successfully. You are now logged in as an agent.'
        });

    } catch (error) {
        console.error('Agent Set PIN Error:', error);
        res.status(500).json({ message: 'Failed to set PIN. Please try again.', errorDetails: error.message });
    }
};

// @desc    Get all active agents (for Cash Out selection)
// @route   GET /api/agents
// @access  Private (User must be logged in to see agents)
const getAllActiveAgents = async (req, res) => {
    try {
        const agents = await Agent.find({ isActive: true, applicationStatus: 'approved' })
                                .select('name shopName mobileNumber _id district area'); // Select fields needed for display
        res.json(agents);
    } catch (error) {
        console.error('Error fetching active agents:', error);
        res.status(500).json({ message: 'Failed to fetch agents.' });
    }
};

// @desc    Agent processes a Cash In for a user
// @route   POST /api/agent/cash-in
// @access  Private (Agent only)
const processCashIn = async (req, res) => {
    const { userMobileNumber, amount, agentPin } = req.body;
    const agentPerformingCashIn = req.user; // This is the logged-in agent from agentProtect middleware

    // --- Validations ---
    if (!userMobileNumber || !amount || !agentPin) {
        return res.status(400).json({ message: 'User mobile number, amount, and your PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }
    const formattedUserMobile = formatMobileNumber(userMobileNumber);
    if (!formattedUserMobile) {
        return res.status(400).json({ message: 'Invalid user mobile number format.' });
    }
    if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
        return res.status(400).json({ message: 'Invalid agent PIN format.' });
    }
    // Optional: Max cash-in limit

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // 1. Verify Agent
        const agent = await Agent.findById(agentPerformingCashIn._id).session(session);
        if (!agent) throw new Error('Agent not found or not authorized.');
        if (!agent.isActive) throw new Error('Agent account is not active.');

        const isPinMatch = await agent.matchPin(agentPin);
        if (!isPinMatch) throw new Error('Incorrect agent PIN.');

        // 2. Find User
        const userToReceiveCashIn = await User.findOne({ mobileNumber: formattedUserMobile }).session(session);
        if (!userToReceiveCashIn) throw new Error('User account not found with this mobile number.');
        if (!userToReceiveCashIn.isVerified) throw new Error('User account is not verified.');

        // 3. Agent's balance DECREASES (agent gives physical cash, their e-wallet decreases as user's e-wallet increases)
        // This model assumes the agent's e-wallet is part of the system.
        // If agent only processes and system funds user, agent balance might not change here.
        // Let's assume agent's e-wallet is reduced.
        if (agent.balance < numericAmount) {
            throw new Error('Agent has insufficient e-wallet balance to process this cash-in.');
        }
        agent.balance -= numericAmount;
        await agent.save({ session });

        // 4. User's balance INCREASES
        userToReceiveCashIn.balance += numericAmount;
        await userToReceiveCashIn.save({ session });

        // 5. Create Transaction Records
        const userTxData = {
            // sender: agent._id, // Agent is facilitating
            // senderModel: 'Agent',
            receiver: userToReceiveCashIn._id,
            receiverModel: 'User',
            amount: numericAmount,
            type: 'Cash In (User Received)',
            description: `Cash In by Agent ${agent.shopName || agent.mobileNumber}`,
            status: 'completed',
            balanceAfterTransaction: userToReceiveCashIn.balance
        };
        const agentTxData = {
            sender: agent._id, // Agent is the one whose balance is 'spent' from their e-wallet
            senderModel: 'Agent',
            receiver: userToReceiveCashIn._id, // User is the ultimate beneficiary in this e-money movement
            receiverModel: 'User',
            amount: numericAmount, // Amount agent's balance decreased
            type: 'Cash In Processed (Agent)',
            description: `Processed Cash In for User ${userToReceiveCashIn.mobileNumber}`,
            status: 'completed',
            balanceAfterTransaction: agent.balance
        };

        const createdTransactions = await Transaction.insertMany([userTxData, agentTxData], { session });

        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: `Cash In of ৳${numericAmount.toFixed(2)} for user ${userToReceiveCashIn.mobileNumber} successful.`,
            agentNewBalance: agent.balance,
            userNewBalance: userToReceiveCashIn.balance,
            transactionForAgent: createdTransactions.find(t => t.type === 'Cash In Processed (Agent)')
        });

    } catch (error) {
        console.error('Error during Cash In processing:', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("Cash In: Transaction aborted."); }
            catch (abortError) { console.error("Cash In: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500;
            let errMessage = 'Cash In processing failed. Please try again.';
            if (error.message.includes('Agent not found') || error.message.includes('User account not found')) statusCode = 404;
            else if (error.message.includes('Incorrect agent PIN')) statusCode = 401;
            else if (error.message.includes('Insufficient') || error.message.includes('balance')) statusCode = 400;
            else if (error.errorLabels?.includes('TransientTransactionError')) statusCode = 503;

            if (statusCode === 500 && error.message) errMessage = error.message;
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("Cash In: Error ending session:", endSessionError); }
        }
    }
};

// @desc    Agent processes a Cash Out FOR a user
// @route   POST /api/agent/process-user-cashout
// @access  Private (Agent only)
const processUserCashOut = async (req, res) => {
    const { userMobileNumber, amount, userOtp, agentPin, reference } = req.body; // Added reference
    const agentProcessing = req.user; // This is the logged-in agent from agentProtect middleware

    // --- Validations ---
    if (!userMobileNumber || !amount || !agentPin /*|| !userOtp (make userOtp optional or validate properly)*/) {
        return res.status(400).json({ message: 'User mobile number, amount, and your PIN are required.' });
    }
    const numericAmount = parseFloat(amount); // Amount user wants to receive in hand
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
    }
    const formattedUserMobile = formatMobileNumber(userMobileNumber);
    if (!formattedUserMobile) {
        return res.status(400).json({ message: 'Invalid user mobile number format.' });
    }
    if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
        return res.status(400).json({ message: 'Invalid agent PIN format. Must be 5 digits.' });
    }

    // For prototype: User OTP validation (simplified)
    const DUMMY_USER_OTP_FOR_PROTOTYPE = "1234"; // Example, make this configurable or remove if not using
    if (userOtp && userOtp.length === 4) { // Only check if provided and has 4 digits
        if (userOtp !== DUMMY_USER_OTP_FOR_PROTOTYPE && process.env.NODE_ENV !== 'development') {
            // In strict production, fail if OTP is wrong. In dev, allow bypass or log.
            // return res.status(400).json({ message: 'Invalid user OTP.' });
            console.warn("User OTP provided but validation is simplified for prototype/development. OTP:", userOtp);
        } else if (userOtp === DUMMY_USER_OTP_FOR_PROTOTYPE) {
            console.log("User OTP matched prototype OTP.");
        }
    } else if (userOtp) { // Provided but not 4 digits
        return res.status(400).json({ message: 'User OTP must be 4 digits if provided.' });
    }
    // If userOtp is not provided, we skip this validation for prototype.

    // --- Define USER Cash-Out Fee (Example: 1.85% of the amount user receives) ---
    const USER_CASHOUT_FEE_PERCENTAGE = 0.0; // 1.85%
    const feeChargedToUser = Math.ceil(numericAmount * USER_CASHOUT_FEE_PERCENTAGE); // Round up
    const totalAmountDebitedFromUser = numericAmount + feeChargedToUser;

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // 1. Verify Agent
        const agent = await Agent.findById(agentProcessing._id).session(session);
        if (!agent) throw new Error('Agent_Not_Found: Agent not found or not authorized.');
        if (!agent.isActive) throw new Error('Agent_Inactive: Agent account is not active.');

        const isPinMatch = await agent.matchPin(agentPin);
        if (!isPinMatch) throw new Error('Agent_PIN_Incorrect: Incorrect agent PIN.');

        // 2. Find and Verify User
        const userToCashOut = await User.findOne({ mobileNumber: formattedUserMobile }).session(session);
        if (!userToCashOut) throw new Error('User_Not_Found: User account not found for cash out.');
        if (!userToCashOut.isVerified) throw new Error('User_Not_Verified: User account is not verified.');

        // Check if user has enough balance for THE AMOUNT THEY WANT + THE FEE
        if (userToCashOut.balance < totalAmountDebitedFromUser) {
            throw new Error(`User_Insufficient_Balance: Needs ৳${totalAmountDebitedFromUser.toFixed(2)} (Amount: ৳${numericAmount.toFixed(2)} + Fee: ৳${feeChargedToUser.toFixed(2)}), Available: ৳${userToCashOut.balance.toFixed(2)}`);
        }

        // 3. Debit User's balance
        userToCashOut.balance -= totalAmountDebitedFromUser;
        await userToCashOut.save({ session });

        // 4. Credit Agent's balance (agent's e-wallet is replenished by the numericAmount)
        agent.balance += numericAmount;
        await agent.save({ session });

        // 5. Create Transaction Records
        const userTxDescription = `Cashed out ৳${numericAmount.toFixed(2)} via Agent ${agent.shopName || agent.mobileNumber}` + (reference ? ` (Ref: ${reference})` : '');
        const userTxData = {
            sender: userToCashOut._id,
            senderModel: 'User',
            receiver: agent._id,
            receiverModel: 'Agent',
            amount: numericAmount,
            fee: feeChargedToUser,
            type: 'User Cashout via Agent',
            description: userTxDescription,
            status: 'completed',
            balanceAfterTransaction: userToCashOut.balance
        };

        const agentTxDescription = `Processed cash out of ৳${numericAmount.toFixed(2)} for User ${userToCashOut.mobileNumber}` + (reference ? ` (Ref: ${reference})` : '');
        const agentTxData = {
            sender: userToCashOut._id,
            senderModel: 'User',
            receiver: agent._id,
            receiverModel: 'Agent',
            amount: numericAmount,
            type: 'Agent Processed User Cashout',
            description: agentTxDescription,
            status: 'completed',
            balanceAfterTransaction: agent.balance
        };

        const createdTransactions = await Transaction.insertMany([userTxData, agentTxData], { session });

        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: `Cash Out of ৳${numericAmount.toFixed(2)} (Fee: ৳${feeChargedToUser.toFixed(2)}) for user ${userToCashOut.mobileNumber} processed successfully.`,
            agentNewBalance: agent.balance,
            userNewBalance: userToCashOut.balance,
            transactionForAgent: createdTransactions.find(t => t.type === 'Agent Processed User Cashout') || createdTransactions[1], // Fallback to second if find fails
            transactionForUser: createdTransactions.find(t => t.type === 'User Cashout via Agent') || createdTransactions[0] // Fallback to first
        });

    } catch (error) {
        console.error('Error processing User Cash Out by Agent (full error object):', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("UserCashOut By Agent: Transaction aborted."); }
            catch (abortError) { console.error("UserCashOut By Agent: Error aborting transaction:", abortError); }
        }

        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500;
            let errMessage = error.message || 'User Cash Out processing failed. Please try again.';

            // More specific error messages based on prefixes or content
            if (error.message?.startsWith('Agent_Not_Found') || error.message?.startsWith('User_Not_Found')) statusCode = 404;
            else if (error.message?.startsWith('Agent_Inactive') || error.message?.startsWith('User_Not_Verified')) statusCode = 403;
            else if (error.message?.startsWith('Agent_PIN_Incorrect')) statusCode = 401;
            else if (error.message?.startsWith('User_Insufficient_Balance')) statusCode = 400;
            else if (error.errorLabels?.includes('TransientTransactionError')) {
                statusCode = 503;
                errMessage = 'A temporary issue occurred. Please try the cash out again shortly.';
            }
            
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        } else if (!transactionCommitted && res.headersSent) {
            console.error("Error occurred after headers were sent during user cash out processing by agent.");
        }
    } finally {
        if (session) {
            try { await session.endSession(); }
            catch (endSessionError) { console.error("UserCashOut By Agent: Error ending session:", endSessionError); }
        }
    }
};

// @desc    Get transaction statement for the logged-in agent
// @route   GET /api/agent/statement
// @access  Private (Agent only)
const getAgentStatement = async (req, res) => {
    const agentId = req.user._id; // Logged-in agent's ID from agentProtect middleware

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Transactions per page
    const skip = (page - 1) * limit;

    try {
        // Find transactions where the agent is either the sender or receiver,
        // AND the senderModel or receiverModel is 'Agent'.
        // Also include transactions specific to agent operations.
        const query = {
            $or: [
                { sender: agentId, senderModel: 'Agent' },
                { receiver: agentId, receiverModel: 'Agent' }
                // Add other specific conditions if needed, e.g., where agent is involved even if not primary sender/receiver
                // For example, in 'User Cashout via Agent', the agent is the receiver in the e-money flow.
            ]
        };

        const transactions = await Transaction.find(query)
            .populate('sender', 'name mobileNumber role shopName username') // Populate details
            .populate('receiver', 'name mobileNumber role shopName merchantName merchantId username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalTransactions = await Transaction.countDocuments(query);
        const totalPages = Math.ceil(totalTransactions / limit);

        // The formatting of From/To can be complex, similar to admin transaction history.
        // For agent's own statement, "Self" is more prominent.
        // Frontend can also handle detailed formatting.

        res.json({
            transactions,
            page,
            totalPages,
            totalTransactions
        });

    } catch (error) {
        console.error("Error fetching agent statement:", error);
        res.status(500).json({ message: 'Failed to fetch agent statement.' });
    }
};

// @desc    Agent sends money to a User or another Agent
// @route   POST /api/agent/send-money
// @access  Private (Agent only)
const agentSendMoney = async (req, res) => {
    const { receiverMobile, amount, agentPin, reference } = req.body;
    const senderAgent = req.user; // Logged-in agent from agentProtect middleware

    // --- Validations ---
    if (!receiverMobile || !amount || !agentPin) {
        return res.status(400).json({ message: 'Recipient mobile, amount, and your PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }
    const formattedReceiverMobile = formatMobileNumber(receiverMobile);
    if (!formattedReceiverMobile) {
        return res.status(400).json({ message: 'Invalid recipient mobile number format.' });
    }
    if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
        return res.status(400).json({ message: 'Invalid agent PIN format.' });
    }
    if (senderAgent.mobileNumber === formattedReceiverMobile) {
        return res.status(400).json({ message: 'Cannot send money to your own agent account.' });
    }

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({ /* ... options ... */ });

        // 1. Verify Sender Agent
        const agent = await Agent.findById(senderAgent._id).session(session);
        if (!agent) throw new Error('Agent_Not_Found: Sending agent account not found.');
        if (!agent.isActive) throw new Error('Agent_Inactive: Your agent account is not active.');
        const isPinMatch = await agent.matchPin(agentPin);
        if (!isPinMatch) throw new Error('Agent_PIN_Incorrect: Incorrect agent PIN.');
        if (agent.balance < numericAmount) throw new Error('Agent_Insufficient_Balance: Insufficient balance in your agent wallet.');

        // 2. Find Recipient (Can be a User or another Agent)
        let recipient = null;
        let recipientModelType = null;

        recipient = await User.findOne({ mobileNumber: formattedReceiverMobile, isVerified: true }).session(session);
        if (recipient) {
            recipientModelType = 'User';
        } else {
            recipient = await Agent.findOne({ mobileNumber: formattedReceiverMobile, isActive: true, applicationStatus: 'approved' }).session(session);
            if (recipient) {
                recipientModelType = 'Agent';
            }
        }

        if (!recipient) {
            throw new Error('Recipient_Not_Found: Active User or Agent account not found with this mobile number.');
        }

        // 3. Debit Sender Agent's balance
        agent.balance -= numericAmount;
        await agent.save({ session });

        // 4. Credit Recipient's balance
        recipient.balance += numericAmount;
        await recipient.save({ session });

        // 5. Create Transaction Records
        const senderDescription = reference ? `Sent to ${recipient.name || recipient.shopName || recipient.mobileNumber} (Ref: ${reference})` : `Sent to ${recipient.name || recipient.shopName || recipient.mobileNumber}`;
        const receiverDescription = reference ? `Received from Agent ${agent.shopName || agent.name} (Ref: ${reference})` : `Received from Agent ${agent.shopName || agent.name}`;

        const agentTxData = {
            sender: agent._id,
            senderModel: 'Agent',
            receiver: recipient._id,
            receiverModel: recipientModelType,
            amount: numericAmount,
            type: 'Send Money', // Agent's perspective
            description: senderDescription,
            status: 'completed',
            balanceAfterTransaction: agent.balance
        };

        const recipientTxData = {
            sender: agent._id,
            senderModel: 'Agent',
            receiver: recipient._id,
            receiverModel: recipientModelType,
            amount: numericAmount,
            type: 'Receive Money', // Recipient's perspective
            description: receiverDescription,
            status: 'completed',
            balanceAfterTransaction: recipient.balance
        };

        const createdTransactions = await Transaction.insertMany([agentTxData, recipientTxData], { session });

        await session.commitTransaction();
        transactionCommitted = true;

        res.json({
            message: 'Money sent successfully!',
            agentNewBalance: agent.balance,
            transactionForAgent: createdTransactions.find(t => t.type === 'Send Money' && t.sender.equals(agent._id))
        });

    } catch (error) { /* ... (Robust error handling similar to processUserCashOut, adjusting error messages for context) ... */
        console.error('Error during Agent Send Money:', error);
        if (session.inTransaction()) {
            try { await session.abortTransaction(); console.log("AgentSendMoney: Transaction aborted."); }
            catch (abortError) { console.error("AgentSendMoney: Error aborting transaction:", abortError); }
        }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500; let errMessage = error.message || 'Send money failed. Please try again.';
            // Specific error messages based on prefixes or content
            if (error.message?.startsWith('Agent_Not_Found') || error.message?.startsWith('Recipient_Not_Found')) statusCode = 404;
            else if (error.message?.startsWith('Agent_Inactive')) statusCode = 403;
            else if (error.message?.startsWith('Agent_PIN_Incorrect')) statusCode = 401;
            else if (error.message?.startsWith('Agent_Insufficient_Balance')) statusCode = 400;
            else if (error.errorLabels?.includes('TransientTransactionError')) statusCode = 503;
            
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally { /* ... (session.endSession()) ... */ }
};

// @desc    Agent pays a utility bill on behalf of a user
// @route   POST /api/agent/pay-bill
// @access  Private (Agent only)
const agentPayBillForUser = async (req, res) => {
    const {
        userMobileNumber, // Optional: to record whose bill is being paid
        billerName,
        billerCategory,
        accountNumber, // Bill account number
        amount,
        agentPin,
        reference // Optional reference for the bill payment
    } = req.body;
    const agentPerformingPayment = req.user; // Logged-in agent

    // --- Validations ---
    if (!billerName || !accountNumber || !amount || !agentPin) {
        return res.status(400).json({ message: 'Biller name, bill account number, amount, and your PIN are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }
    if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
        return res.status(400).json({ message: 'Invalid agent PIN format.' });
    }
    // Optional: Validate userMobileNumber format if provided
    const formattedUserMobile = userMobileNumber ? formatMobileNumber(userMobileNumber) : null;


    // For Pay Bill, agent might charge a service fee to the user (collected in cash).
    // The amount deducted from agent's e-wallet is the actual bill amount.
    // No direct fee deduction from agent's e-wallet for this transaction in this model.
    const totalDeductionFromAgent = numericAmount;

    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
        session.startTransaction({ /* ... options ... */ });

        // 1. Verify Agent
        const agent = await Agent.findById(agentPerformingPayment._id).session(session);
        if (!agent) throw new Error('Agent_Not_Found: Agent account not found.');
        if (!agent.isActive) throw new Error('Agent_Inactive: Your agent account is not active.');
        const isPinMatch = await agent.matchPin(agentPin);
        if (!isPinMatch) throw new Error('Agent_PIN_Incorrect: Incorrect agent PIN.');

        if (agent.balance < totalDeductionFromAgent) {
            throw new Error(`Agent_Insufficient_Balance: Insufficient balance in your agent wallet. Required: ৳${totalDeductionFromAgent.toFixed(2)}`);
        }

        // 2. Deduct amount from Agent's balance
        agent.balance -= totalDeductionFromAgent;
        await agent.save({ session });

        // 3. Find the user if mobile number is provided (for record keeping)
        let targetUser = null;
        if (formattedUserMobile) {
            targetUser = await User.findOne({ mobileNumber: formattedUserMobile }).session(session);
            // No need to fail if user not found, agent can pay for non-registered numbers too
        }

        // 4. Create Transaction Record for the Agent
        let description = `Bill payment for ${billerName} (${billerCategory || 'Utility'}), Acc: ${accountNumber}`;
        if (formattedUserMobile) description += ` for User: ${formattedUserMobile}`;
        if (reference) description += ` (Ref: ${reference})`;

        const agentTxData = {
            sender: agent._id,
            senderModel: 'Agent',
            // receiver: null, // Biller is external
            receiverMobile: accountNumber, // Store bill account number as a reference
            amount: numericAmount,
            type: 'Agent Pay Bill for User',
            description: description,
            status: 'completed',
            balanceAfterTransaction: agent.balance
        };
        const createdTransactions = await Transaction.insertMany([agentTxData], { session });

        await session.commitTransaction();
        transactionCommitted = true;

        // In a real app, this would trigger an API call to the biller's payment gateway.

        res.json({
            message: `Bill payment of ৳${numericAmount.toFixed(2)} for ${billerName} (Acc: ${accountNumber}) processed successfully.`,
            agentNewBalance: agent.balance,
            transaction: createdTransactions[0]
        });

    } catch (error) { /* ... (Robust error handling similar to other agent transactions) ... */
        console.error('Error during Agent Pay Bill transaction:', error);
        if (session.inTransaction()) { /* ... abort ... */ }
        if (!transactionCommitted && !res.headersSent) {
            let statusCode = 500; let errMessage = error.message || 'Bill payment failed. Please try again.';
            // ... (specific error code mapping) ...
            res.status(statusCode).json({ message: errMessage, errorDetails: error.message });
        }
    } finally { /* ... (session.endSession()) ... */ }
};

module.exports = {
    agentApply,
    agentSendOtp,
    agentVerifyOtp,
    agentSetPin,
    getAllActiveAgents,
    processCashIn,
    processUserCashOut,
    getAgentStatement,
    agentSendMoney,
    agentPayBillForUser,
};