// server/controllers/adminDataController.js
const User = require('../models/User'); // To manage regular users
const Agent = require('../models/Agent'); // To manage agents later
const Merchant = require('../models/Merchant'); // To manage merchants later
const Admin = require('../models/Admin'); // To manage other admins later
const Transaction = require('../models/Transaction'); // For transaction history & stats
const LoanRequest = require('../models/LoanRequest'); // Add import
const Investment = require('../models/Investment');

// --- User Management ---

// @desc    Get all regular users by Admin
// @route   GET /api/admin/data/users
// @access  Private (Admin/SuperAdmin)
const getAllRegularUsers = async (req, res) => {
    try {
        // For now, fetch all users with role 'user'. Add pagination later.
        // Exclude sensitive data like PIN.
        const users = await User.find({ role: 'user' }).select('-pin').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("Error fetching regular users for admin:", error);
        res.status(500).json({ message: "Failed to fetch users." });
    }
};

// @desc    Get a single regular user by ID by Admin
// @route   GET /api/admin/data/users/:id
// @access  Private (Admin/SuperAdmin)
const getUserByIdForAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-pin');
        if (user && user.role === 'user') {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Regular user not found.' });
        }
    } catch (error) {
        console.error(`Error fetching user ${req.params.id} for admin:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        res.status(500).json({ message: 'Failed to fetch user details.' });
    }
};

// @desc    Admin creates a new regular user
// @route   POST /api/admin/data/users
// @access  Private (Admin/SuperAdmin - or SuperAdmin only for user creation)
const createRegularUserByAdmin = async (req, res) => {
    const { name, dateOfBirth, mobileNumber, initialBalance, pin } = req.body;

    // --- Validations ---
    if (!name || !dateOfBirth || !mobileNumber || !pin) {
        return res.status(400).json({ message: 'Name, Date of Birth, Mobile Number, and PIN are required.' });
    }
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) {
        return res.status(400).json({ message: 'Invalid mobile number format.' });
    }
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        return res.status(400).json({ message: 'PIN must be 5 digits.' });
    }
    const balance = parseFloat(initialBalance) || 0;
    if (isNaN(balance) || balance < 0) {
        return res.status(400).json({ message: 'Invalid initial balance.' });
    }
    // Validate dateOfBirth format if necessary

    try {
        const userExists = await User.findOne({ mobileNumber: mobileNumber });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this mobile number.' });
        }

        // Check if an agent exists with this mobile, prevent conflict
        const agentExists = await Agent.findOne({ mobileNumber: mobileNumber });
        if (agentExists) {
            return res.status(400).json({ message: 'This mobile number is registered as an agent.' });
        }

        const newUser = new User({
            name,
            dateOfBirth,
            mobileNumber,
            pin, // Will be hashed by pre-save hook
            balance: balance,
            role: 'user',
            isVerified: true, // Admin-created users can be auto-verified
            // No profile completion needed if admin provides all details
        });

        const createdUser = await newUser.save();
        // Exclude pin from response
        const userToReturn = { ...createdUser.toObject() };
        delete userToReturn.pin;

        res.status(201).json(userToReturn);

    } catch (error) {
        console.error("Error creating user by admin:", error);
        if (error.code === 11000) {
             return res.status(400).json({ message: 'Mobile number already in use (internal check).' });
        }
        res.status(500).json({ message: "Failed to create user." });
    }
};

// @desc    Admin deletes a regular user
// @route   DELETE /api/admin/data/users/:id
// @access  Private (SuperAdmin typically, or specific Admin permission)
const deleteRegularUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            if (user.role !== 'user') {
                return res.status(400).json({ message: 'Cannot delete non-user accounts via this route.' });
            }
            // Add any checks here, e.g., cannot delete user with positive balance without clearance
            // For prototype, direct delete:
            await user.deleteOne(); // Mongoose v6+
            // For older Mongoose: await user.remove();
            res.json({ message: 'User removed successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error(`Error deleting user ${req.params.id} by admin:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        res.status(500).json({ message: 'Failed to delete user.' });
    }
};

// --- Agent Management by Admin ---

// @desc    Get all agents (can filter by applicationStatus)
// @route   GET /api/admin/data/agents?status=pending_admin_approval
// @access  Private (Admin/SuperAdmin)
const getAllAgentsForAdmin = async (req, res) => {
    const { status } = req.query; // e.g., pending_admin_approval, approved, rejected
    const query = {};
    if (status) {
        query.applicationStatus = status;
    }
    // If no status, fetch all agents for now.
    // In a real app, you might default to 'approved' or 'pending_admin_approval'.

    try {
        const agents = await Agent.find(query).select('-pin').sort({ createdAt: -1 });
        res.json(agents);
    } catch (error) {
        console.error("Error fetching agents for admin:", error);
        res.status(500).json({ message: "Failed to fetch agents." });
    }
};

// @desc    Get a single agent by ID by Admin
// @route   GET /api/admin/data/agents/:id
// @access  Private (Admin/SuperAdmin)
const getAgentByIdForAdmin = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id).select('-pin');
        if (agent) {
            res.json(agent);
        } else {
            res.status(404).json({ message: 'Agent not found.' });
        }
    } catch (error) {
        console.error(`Error fetching agent ${req.params.id} for admin:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid agent ID format.' });
        }
        res.status(500).json({ message: 'Failed to fetch agent details.' });
    }
};

// @desc    Admin creates a new agent account (bypassing normal application, auto-approves)
// @route   POST /api/admin/data/agents
// @access  Private (SuperAdmin typically)
const createAgentByAdmin = async (req, res) => {
    const { name, shopName, district, area, nidNumber, mobileNumber, initialBalance, pin } = req.body;

    // --- Validations ---
    if (!name || !shopName || !district || !area || !nidNumber || !mobileNumber || !pin) {
        return res.status(400).json({ message: 'All fields are required to create an agent.' });
    }
    // Add other specific validations (mobile format, NID uniqueness, PIN format)
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) return res.status(400).json({ message: 'Invalid mobile number.' });
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) return res.status(400).json({ message: 'PIN must be 5 digits.' });

    const balance = parseFloat(initialBalance) || 0;

    try {
        let agent = await Agent.findOne({ mobileNumber });
        if (agent) return res.status(400).json({ message: 'Agent already exists with this mobile number.' });
        agent = await Agent.findOne({ nidNumber });
        if (agent) return res.status(400).json({ message: 'Agent already exists with this NID number.' });

        // Check if a regular user exists with this mobile, prevent conflict
        const userExists = await User.findOne({ mobileNumber: mobileNumber });
        if (userExists) {
            return res.status(400).json({ message: 'This mobile number is registered as a regular user.' });
        }


        const newAgent = new Agent({
            name, shopName, district, area, nidNumber, mobileNumber,
            pin, // Will be hashed
            balance,
            applicationStatus: 'approved', // Admin-created agents are auto-approved
            isActive: true,                // Admin-created agents are auto-active
            role: 'agent'                  // Ensure role is set
        });

        const createdAgent = await newAgent.save();
        const agentToReturn = { ...createdAgent.toObject() };
        delete agentToReturn.pin;

        res.status(201).json(agentToReturn);

    } catch (error) {
        console.error("Error creating agent by admin:", error);
         if (error.code === 11000) { // Duplicate key
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ message: `An agent with this ${field} already exists.` });
        }
        res.status(500).json({ message: "Failed to create agent." });
    }
};

// @desc    Admin approves a PENDING agent application
// @route   PUT /api/admin/data/agents/:id/approve
// @access  Private (Admin/SuperAdmin)
const approveAgentApplication = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) return res.status(404).json({ message: 'Agent application not found.' });

        if (agent.applicationStatus !== 'pending_admin_approval') {
            return res.status(400).json({ message: `Cannot approve. Agent status is already '${agent.applicationStatus}'.` });
        }

        agent.applicationStatus = 'approved';
        // isActive will become true when agent sets their PIN. Admin can also toggle it.
        // agent.isActive = false; // Remains false until PIN setup
        // agent.role = 'agent'; // Should already be 'agent' from schema default
        await agent.save();
        res.json({ message: 'Agent application approved. Agent needs to set PIN to activate.', agent });
    } catch (error) {
        console.error("Error approving agent:", error);
        res.status(500).json({ message: "Failed to approve agent application." });
    }
};

// @desc    Admin rejects a PENDING agent application
// @route   PUT /api/admin/data/agents/:id/reject
// @access  Private (Admin/SuperAdmin)
const rejectAgentApplication = async (req, res) => {
    // const { rejectionReason } = req.body; // Optional
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) return res.status(404).json({ message: 'Agent application not found.' });

        if (agent.applicationStatus !== 'pending_admin_approval' && agent.applicationStatus !== 'pending_otp_verification') {
             return res.status(400).json({ message: `Cannot reject. Agent status is '${agent.applicationStatus}'.` });
        }

        agent.applicationStatus = 'rejected';
        agent.isActive = false; // Ensure inactive
        // agent.rejectionReason = rejectionReason; // If you add this field to schema
        await agent.save();
        res.json({ message: 'Agent application rejected.', agent });
    } catch (error) {
        console.error("Error rejecting agent:", error);
        res.status(500).json({ message: "Failed to reject agent application." });
    }
};


// @desc    Admin toggles an agent's isActive status
// @route   PUT /api/admin/data/agents/:id/toggle-active
// @access  Private (SuperAdmin usually)
const toggleAgentActiveStatus = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) return res.status(404).json({ message: 'Agent not found.' });

        if (agent.applicationStatus !== 'approved') {
            return res.status(400).json({ message: 'Agent must be approved to toggle active status.'});
        }
        if (!agent.pin) {
            return res.status(400).json({ message: 'Agent must set a PIN before being activated.'});
        }

        agent.isActive = !agent.isActive; // Toggle status
        await agent.save();
        res.json({ message: `Agent status updated to ${agent.isActive ? 'Active' : 'Inactive'}.`, agent });
    } catch (error) {
        console.error("Error toggling agent active status:", error);
        res.status(500).json({ message: "Failed to update agent active status." });
    }
};


// @desc    Admin deletes an agent account
// @route   DELETE /api/admin/data/agents/:id
// @access  Private (SuperAdmin typically)
const deleteAgentByAdmin = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (agent) {
            // Add checks if agent has balance or pending transactions
            await agent.deleteOne();
            res.json({ message: 'Agent removed successfully.' });
        } else {
            res.status(404).json({ message: 'Agent not found.' });
        }
    } catch (error) { /* ... error handling ... */ }
};

// --- Merchant Management by Admin ---

// @desc    Get all merchants by Admin (can reuse user-facing GET /api/merchants or have a dedicated one)
// @route   GET /api/admin/data/merchants
// @access  Private (Admin/SuperAdmin)
const getAllMerchantsForAdmin = async (req, res) => {
    try {
        // For now, fetch all. Add search/filter/pagination later.
        const merchants = await Merchant.find({}).sort({ createdAt: -1 });
        res.json(merchants);
    } catch (error) {
        console.error("Error fetching merchants for admin:", error);
        res.status(500).json({ message: "Failed to fetch merchants." });
    }
};

// @desc    Get a single merchant by ID by Admin
// @route   GET /api/admin/data/merchants/:id
// @access  Private (Admin/SuperAdmin)
const getMerchantByIdForAdmin = async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id);
        if (merchant) {
            res.json(merchant);
        } else {
            res.status(404).json({ message: 'Merchant not found.' });
        }
    } catch (error) {
        console.error(`Error fetching merchant ${req.params.id} for admin:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid merchant ID format.' });
        }
        res.status(500).json({ message: 'Failed to fetch merchant details.' });
    }
};

// @desc    Admin creates a new merchant
// @route   POST /api/admin/data/merchants
// @access  Private (SuperAdmin typically, or specific Admin permission)
const createMerchantByAdmin = async (req, res) => {
    const { merchantName, merchantId, mobileNumber, category, initialBalance } = req.body;

    // --- Validations ---
    if (!merchantName || !merchantId || !mobileNumber) {
        return res.status(400).json({ message: 'Merchant Name, Merchant ID, and Mobile Number are required.' });
    }
    // Add more specific validations (mobile format, merchantId uniqueness)
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) return res.status(400).json({ message: 'Invalid mobile number format.' });


    const balance = parseFloat(initialBalance) || 0;

    try {
        let merchant = await Merchant.findOne({ merchantId: merchantId });
        if (merchant) return res.status(400).json({ message: 'Merchant ID already exists.' });
        merchant = await Merchant.findOne({ mobileNumber: mobileNumber });
        if (merchant) return res.status(400).json({ message: 'Merchant already exists with this mobile number.' });


        const newMerchant = new Merchant({
            merchantName,
            merchantId,
            mobileNumber,
            category: category || 'General', // Default category
            balance,
            isActive: true // Admin-created merchants are auto-active
        });

        const createdMerchant = await newMerchant.save();
        res.status(201).json(createdMerchant);

    } catch (error) {
        console.error("Error creating merchant by admin:", error);
         if (error.code === 11000) { // Duplicate key
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ message: `A merchant with this ${field} already exists.` });
        }
        res.status(500).json({ message: "Failed to create merchant." });
    }
};

// @desc    Admin updates a merchant (e.g., toggle isActive)
// @route   PUT /api/admin/data/merchants/:id
// @access  Private (SuperAdmin typically)
const updateMerchantByAdmin = async (req, res) => {
    const { merchantName, merchantId, mobileNumber, category, isActive, balance } = req.body;
    try {
        const merchant = await Merchant.findById(req.params.id);
        if (!merchant) return res.status(404).json({ message: "Merchant not found." });

        merchant.merchantName = merchantName ?? merchant.merchantName;
        merchant.merchantId = merchantId ?? merchant.merchantId; // Be careful if changing unique IDs
        merchant.mobileNumber = mobileNumber ?? merchant.mobileNumber;
        merchant.category = category ?? merchant.category;
        merchant.isActive = isActive ?? merchant.isActive;
        if (balance !== undefined && !isNaN(parseFloat(balance))) {
            merchant.balance = parseFloat(balance);
        }

        const updatedMerchant = await merchant.save();
        res.json(updatedMerchant);
    } catch (error) {
        console.error("Error updating merchant by admin:", error);
         if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ message: `Update failed. A merchant with this ${field} already exists.` });
        }
        res.status(500).json({ message: "Failed to update merchant." });
    }
};


// @desc    Admin deletes a merchant
// @route   DELETE /api/admin/data/merchants/:id
// @access  Private (SuperAdmin typically)
const deleteMerchantByAdmin = async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id);
        if (merchant) {
            // Add checks if merchant has outstanding transactions or positive balance
            await merchant.deleteOne();
            res.json({ message: 'Merchant removed successfully.' });
        } else {
            res.status(404).json({ message: 'Merchant not found.' });
        }
    } catch (error) { /* ... error handling as in deleteAgentByAdmin ... */ }
};


// --- Admin Account Management by SuperAdmin ---

// @desc    Get all admin accounts (admins and super_admins)
// @route   GET /api/admin/data/admins
// @access  Private (SuperAdmin only)
const getAllAdminAccounts = async (req, res) => {
    try {
        // Exclude current super_admin from list if desired, or show all
        const admins = await Admin.find({ /* username: { $ne: req.user.username } */ })
                                .select('-password')
                                .sort({ createdAt: -1 });
        res.json(admins);
    } catch (error) {
        console.error("Error fetching admin accounts:", error);
        res.status(500).json({ message: "Failed to fetch admin accounts." });
    }
};

// @desc    Get a single admin account by ID
// @route   GET /api/admin/data/admins/:id
// @access  Private (SuperAdmin only)
const getAdminAccountById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id).select('-password');
        if (admin) {
            res.json(admin);
        } else {
            res.status(404).json({ message: 'Admin account not found.' });
        }
    } catch (error) { /* ... error handling ... */ }
};

// @desc    SuperAdmin creates a new regular admin account
// @route   POST /api/admin/data/admins
// @access  Private (SuperAdmin only)
const createAdminAccountBySuperAdmin = async (req, res) => {
    const { username, password, name } = req.body; // Name is admin's full name

    if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password, and name are required.' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    try {
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) return res.status(400).json({ message: 'Username already exists.' });

        const newAdmin = new Admin({
            username,
            password, // Will be hashed
            name,
            role: 'admin', // Created by SuperAdmin are regular admins
            applicationStatus: 'approved', // Auto-approved
            isActive: true                // Auto-active
        });
        const createdAdmin = await newAdmin.save();
        const adminToReturn = { ...createdAdmin.toObject() };
        delete adminToReturn.password;
        res.status(201).json(adminToReturn);
    } catch (error) { /* ... error handling, check for duplicate username ... */ }
};

// @desc    SuperAdmin approves a PENDING regular admin application
// @route   PUT /api/admin/data/admins/:id/approve-application
// @access  Private (SuperAdmin only)
const approveAdminApplicationBySuperAdmin = async (req, res) => {
    try {
        // Note: Admin applications are stored in the 'Admin' collection itself with applicationStatus
        const adminApplicant = await Admin.findById(req.params.id);
        if (!adminApplicant) return res.status(404).json({ message: 'Admin application not found.' });

        if (adminApplicant.applicationStatus !== 'pending_super_admin_approval') {
            return res.status(400).json({ message: `Cannot approve. Status is '${adminApplicant.applicationStatus}'.` });
        }

        adminApplicant.applicationStatus = 'approved';
        adminApplicant.isActive = true; // Activate upon approval
        await adminApplicant.save();
        const adminToReturn = { ...adminApplicant.toObject() };
        delete adminToReturn.password;
        res.json({ message: 'Admin application approved and account activated.', admin: adminToReturn });
    } catch (error) { /* ... error handling ... */ }
};

// @desc    SuperAdmin rejects a PENDING regular admin application
// @route   PUT /api/admin/data/admins/:id/reject-application
// @access  Private (SuperAdmin only)
const rejectAdminApplicationBySuperAdmin = async (req, res) => {
    try {
        const adminApplicant = await Admin.findById(req.params.id);
        if (!adminApplicant) return res.status(404).json({ message: 'Admin application not found.' });
         if (adminApplicant.applicationStatus !== 'pending_super_admin_approval') { // Can only reject pending
            return res.status(400).json({ message: `Cannot reject. Status is '${adminApplicant.applicationStatus}'.` });
        }
        adminApplicant.applicationStatus = 'rejected';
        adminApplicant.isActive = false;
        await adminApplicant.save();
        res.json({ message: 'Admin application rejected.' });
    } catch (error) { /* ... error handling ... */ }
};


// @desc    SuperAdmin toggles an admin's isActive status
// @route   PUT /api/admin/data/admins/:id/toggle-active
// @access  Private (SuperAdmin only)
const toggleAdminActiveStatus = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin account not found.' });
        if (admin.role === 'super_admin') return res.status(400).json({ message: 'Cannot change status of Super Admin.' });

        admin.isActive = !admin.isActive;
        await admin.save();
        const adminToReturn = { ...admin.toObject() };
        delete adminToReturn.password;
        res.json({ message: `Admin account ${admin.isActive ? 'activated' : 'deactivated'}.`, admin: adminToReturn });
    } catch (error) { /* ... error handling ... */ }
};

// @desc    SuperAdmin resets an admin's password
// @route   PUT /api/admin/data/admins/:id/reset-password
// @access  Private (SuperAdmin only)
const resetAdminPasswordBySuperAdmin = async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }
    try {
        const adminToUpdate = await Admin.findById(req.params.id);
        if (!adminToUpdate) return res.status(404).json({ message: 'Admin account not found.' });
        if (adminToUpdate.role === 'super_admin' && req.user._id.toString() !== adminToUpdate._id.toString()) {
            return res.status(403).json({ message: 'Only the Super Admin can change their own password directly.' });
        }

        adminToUpdate.password = newPassword; // Will be hashed by pre-save
        await adminToUpdate.save();
        res.json({ message: `Password for admin ${adminToUpdate.username} has been reset.` });
    } catch (error) { /* ... error handling ... */ }
};


// @desc    SuperAdmin deletes an admin account
// @route   DELETE /api/admin/data/admins/:id
// @access  Private (SuperAdmin only)
const deleteAdminAccount = async (req, res) => {
    try {
        const adminToDelete = await Admin.findById(req.params.id);
        if (!adminToDelete) return res.status(404).json({ message: 'Admin account not found.' });
        if (adminToDelete.role === 'super_admin') {
            return res.status(400).json({ message: 'Super Admin account cannot be deleted.' });
        }
        await adminToDelete.deleteOne();
        res.json({ message: `Admin account ${adminToDelete.username} deleted.` });
    } catch (error) { /* ... error handling ... */ }
};


// --- Transaction History Management by Admin ---

// @desc    Get all transactions for Admin view
// @route   GET /api/admin/data/transactions
// @access  Private (Admin/SuperAdmin)
const getAllTransactionsForAdmin = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25; // Default to 25 transactions per page
    const skip = (page - 1) * limit;

    try {
        const transactions = await Transaction.find({})
            .populate('sender', 'name mobileNumber role') // Populate sender from User or Agent or Admin
            .populate('receiver', 'name mobileNumber role shopName merchantName merchantId') // Populate receiver from User, Agent, Merchant
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalTransactions = await Transaction.countDocuments({});
        const totalPages = Math.ceil(totalTransactions / limit);

        // We need to determine the "From" and "To" display names based on populated data
        // This can also be done on the frontend, but doing some prep here is good.
        const formattedTransactions = transactions.map(tx => {
            let fromDisplay = 'System/Unknown';
            let toDisplay = 'System/Unknown';

            // Determine "From"
            if (tx.sender) { // tx.sender is populated User/Agent/Admin object
                if (tx.sender.role === 'user') fromDisplay = `User: ${tx.sender.name || tx.sender.mobileNumber}`;
                else if (tx.sender.role === 'agent') fromDisplay = `Agent: ${tx.sender.shopName || tx.sender.name}`;
                // else if (tx.sender.role === 'admin' || tx.sender.role === 'super_admin') fromDisplay = `Admin: ${tx.sender.username}`;
                // Not typical for admins to be senders in this system
            } else if (tx.type === 'Add Money') {
                fromDisplay = 'External Source (Bank/Card)'; // For Add Money
            } else if (tx.senderMobile) { // Fallback if sender object isn't populated/linked
                fromDisplay = `External: ${tx.senderMobile}`;
            }


            // Determine "To"
            if (tx.receiver) { // tx.receiver is populated User/Agent/Merchant object
                if (tx.receiver.role === 'user') toDisplay = `User: ${tx.receiver.name || tx.receiver.mobileNumber}`;
                else if (tx.receiver.role === 'agent') toDisplay = `Agent: ${tx.receiver.shopName || tx.receiver.name}`;
                else if (tx.receiver.merchantName) toDisplay = `Merchant: ${tx.receiver.merchantName} (${tx.receiver.merchantId})`; // Assuming receiver is populated merchant
                // else if (tx.receiver.role === 'admin' || tx.receiver.role === 'super_admin') fromDisplay = `Admin: ${tx.receiver.username}`;
            } else if (tx.type === 'Add Money' && tx.receiverMobile === user.mobileNumber) { // Special case for Add Money to self
                 toDisplay = 'Self (User)'; // If receiverMobile matches the target user of Add Money
            } else if (tx.type === 'Mobile Recharge' || tx.type === 'Cashout' || tx.type === 'Pay Bill') {
                toDisplay = tx.description || tx.receiverMobile || 'Service'; // e.g., "Recharge to 01..." or "Cash Out at Agent X"
            } else if (tx.receiverMobile) {
                toDisplay = `External: ${tx.receiverMobile}`;
            }


            // Adjust for "Self" based on transaction type and who the user is
            if (tx.type === 'Add Money' && tx.receiver && tx.receiver._id.equals(tx.receiver._id) /* This logic needs current user context */) {
                // This kind of 'Self' logic is better handled on frontend where you know WHO is viewing
            }


            return {
                ...tx.toObject(), // Get plain object
                fromDisplay,
                toDisplay,
                // For simplicity now, frontend will handle "Self" display
            };
        });


        res.json({
            transactions: formattedTransactions,
            page,
            totalPages,
            totalTransactions
        });
    } catch (error) {
        console.error("Error fetching transactions for admin:", error);
        res.status(500).json({ message: "Failed to fetch transactions." });
    }
};

// @desc    Admin clears ALL transaction history
// @route   DELETE /api/admin/data/transactions/all
// @access  Private (SuperAdmin ONLY - very destructive)
const clearAllTransactionHistory = async (req, res) => {
    try {
        // This is a very destructive operation. Add extra confirmation or safeguards.
        const result = await Transaction.deleteMany({});
        res.json({ message: `Successfully deleted ${result.deletedCount} transactions. History cleared.` });
    } catch (error) {
        console.error("Error clearing transaction history:", error);
        res.status(500).json({ message: "Failed to clear transaction history." });
    }
};


// @desc    Get dashboard statistics for Admin
// @route   GET /api/admin/data/stats
// @access  Private (Admin/SuperAdmin)
const getDashboardStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments({ role: 'user' });
        const agentCount = await Agent.countDocuments({ applicationStatus: 'approved', isActive: true }); // Count active, approved agents
        const pendingAgentApplications = await Agent.countDocuments({ applicationStatus: 'pending_admin_approval' });
        const merchantCount = await Merchant.countDocuments({ isActive: true }); // Count active merchants
        const adminCount = await Admin.countDocuments({ role: 'admin', isActive: true }); // Count active regular admins
        const superAdminCount = await Admin.countDocuments({ role: 'super_admin', isActive: true });


        // Transaction Summaries (Examples - can be more complex)
        const totalSendMoney = await Transaction.aggregate([
            { $match: { type: 'Send Money' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalAddMoney = await Transaction.aggregate([
            { $match: { type: 'Add Money' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalMobileRecharge = await Transaction.aggregate([
            { $match: { type: 'Mobile Recharge' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalPayment = await Transaction.aggregate([
            { $match: { type: 'Payment' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalCashOut = await Transaction.aggregate([ // This is the amount cashed out by users
            { $match: { type: 'Cashout' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        // Add PayBill similarly if implemented

        // Recent Activities (Last 5 transactions, for example)
        // Populate sender/receiver to get names for display
        const recentTransactions = await Transaction.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sender', 'name mobileNumber role shopName username') // Populate from User, Agent, Admin
            .populate('receiver', 'name mobileNumber role shopName merchantName merchantId username'); // Populate from User, Agent, Merchant, Admin

        // Format recent activities for display
        const formattedRecentActivities = recentTransactions.map(tx => {
            let activityText = `${tx.type} of ৳${tx.amount.toFixed(2)}`;
            let fromParty = 'System/External';
            let toParty = 'Service/External';

            if (tx.sender) {
                fromParty = tx.sender.name || tx.sender.shopName || tx.sender.username || tx.sender.mobileNumber || 'User/Agent';
            } else if (tx.type === 'Add Money') {
                fromParty = 'Bank/Card';
            }

            if (tx.receiver) {
                toParty = tx.receiver.merchantName || tx.receiver.shopName || tx.receiver.name || tx.receiver.username || tx.receiver.mobileNumber || 'User/Agent/Merchant';
            } else if (tx.type === 'Mobile Recharge') {
                toParty = `Number: ${tx.receiverMobile}`;
            } else if (tx.type === 'Cashout') {
                toParty = `Agent: ${tx.receiverMobile}`;
            }
            // Add more specific formatting based on transaction types

            if(tx.type === 'Send Money' || tx.type === 'Payment') {
                activityText = `${fromParty} ${tx.type.toLowerCase()} ৳${tx.amount.toFixed(2)} to ${toParty}`;
            } else if (tx.type === 'Add Money') {
                activityText = `${toParty} added ৳${tx.amount.toFixed(2)}`;
            } else if (tx.type === 'Mobile Recharge') {
                activityText = `${fromParty} recharged ৳${tx.amount.toFixed(2)} for ${toParty}`;
            } else if (tx.type === 'Cashout') {
                activityText = `${fromParty} cashed out ৳${tx.amount.toFixed(2)} via ${toParty}`;
            }
            // Simple registration log (not from transactions, would need separate log or user creation date)
            // For now, let's focus on transaction-based activity


            return {
                id: tx._id,
                text: activityText,
                time: new Date(tx.createdAt).toLocaleString([], {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
            };



        });

        // --- NEW: Loan and Investment Summaries ---
        // Total amount invested by users (from 'active' investments)
        const totalInvestedResult = await Investment.aggregate([
            { $match: { status: 'active' } }, // Only count active investments
            { $group: { _id: null, total: { $sum: '$investedAmount' } } }
        ]);
        const totalInvested = totalInvestedResult[0]?.total || 0;

        // Total loan amount currently disbursed and not fully repaid
        // This could also be sum of 'approvedAmount' for loans with status 'disbursed' or 'repaying'
        // Or, sum of 'outstandingLoanAmount' from the User model if you maintain that accurately.
        // Let's sum `approvedAmount` from LoanRequest for active loans for simplicity here.
        const totalLoanProvidedResult = await LoanRequest.aggregate([
            { $match: { status: { $in: ['disbursed', 'repaying'] } } }, // Loans that are out
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } } // Sum of approved amounts
        ]);
        const totalLoanProvided = totalLoanProvidedResult[0]?.total || 0;


        res.json({
            counts: {
                users: userCount,
                agents: agentCount,
                merchants: merchantCount,
                admins: adminCount + superAdminCount, // Total admins
                pendingAgentApplications: pendingAgentApplications
            },
            transactionSummary: {
                sendMoney: totalSendMoney[0]?.total || 0,
                addMoney: totalAddMoney[0]?.total || 0,
                mobileRecharge: totalMobileRecharge[0]?.total || 0,
                payment: totalPayment[0]?.total || 0,
                cashOut: totalCashOut[0]?.total || 0,
                payBill: 0, // Placeholder
            },
            recentActivities: formattedRecentActivities,
            investLoanSummary: { 
                totalInvested: totalInvested,
                totalLoanProvided: totalLoanProvided
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Failed to fetch dashboard statistics." });
    }
};

// --- Loan Request Management by Admin ---
// @desc    Get all loan requests (can filter by status)
// @route   GET /api/admin/data/loan-requests
// @access  Private (Admin/SuperAdmin)
const getAllLoanRequestsForAdmin = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15; // Match ITEMS_PER_PAGE on frontend
    const skip = (page - 1) * limit;
    const { status } = req.query;
    const query = status ? { status } : {};

    try {
        const loanRequests = await LoanRequest.find(query)
            .populate('user', 'name mobileNumber')
            .populate('approvedBy', 'username name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalLoanRequests = await LoanRequest.countDocuments(query); // Count based on filter
        const totalPages = Math.ceil(totalLoanRequests / limit);

        res.json({
            loanRequests, // The array of loan requests for the current page
            page,
            totalPages,
            totalLoanRequests // Total items matching the filter
        });
    } catch (error) { 
        console.error("Error fetching loan requests for admin:", error);
        res.status(500).json({ message: 'Failed to fetch loan requests.' }); 
    }
};

// @desc    Admin approves a loan request
// @route   PUT /api/admin/data/loan-requests/:id/approve
// @access  Private (Admin/SuperAdmin)
const approveLoanRequest = async (req, res) => {
    const { approvedAmount, dueDate, adminNotes } = req.body; // Admin can set these
    const adminId = req.user._id; // Logged in admin

    if (!approvedAmount || isNaN(parseFloat(approvedAmount)) || parseFloat(approvedAmount) <= 0) {
        return res.status(400).json({ message: "Valid approved amount is required." });
    }
    const numericApprovedAmount = parseFloat(approvedAmount);

    try {
        const loanRequest = await LoanRequest.findById(req.params.id);
        if (!loanRequest) return res.status(404).json({ message: 'Loan request not found.' });
        if (loanRequest.status !== 'pending') {
            return res.status(400).json({ message: `Cannot approve loan with status: ${loanRequest.status}` });
        }

        loanRequest.status = 'approved';
        loanRequest.approvedAmount = numericApprovedAmount;
        loanRequest.approvedBy = adminId;
        loanRequest.adminActionAt = new Date();
        if (dueDate) loanRequest.dueDate = new Date(dueDate); // Optional
        if (adminNotes) loanRequest.adminNotes = adminNotes;

        await loanRequest.save();
        res.json({ message: 'Loan request approved.', loanRequest });
    } catch (error) { res.status(500).json({ message: 'Failed to approve loan request.' }); }
};

// @desc    Admin rejects a loan request
// @route   PUT /api/admin/data/loan-requests/:id/reject
// @access  Private (Admin/SuperAdmin)
const rejectLoanRequest = async (req, res) => {
    const { adminNotes } = req.body;
    const adminId = req.user._id;
    try {
        const loanRequest = await LoanRequest.findById(req.params.id);
        if (!loanRequest) return res.status(404).json({ message: 'Loan request not found.' });
        if (loanRequest.status !== 'pending') {
            return res.status(400).json({ message: `Cannot reject loan with status: ${loanRequest.status}` });
        }
        loanRequest.status = 'rejected';
        loanRequest.approvedBy = adminId;
        loanRequest.adminActionAt = new Date();
        if (adminNotes) loanRequest.adminNotes = adminNotes;
        await loanRequest.save();
        res.json({ message: 'Loan request rejected.', loanRequest });
    } catch (error) { res.status(500).json({ message: 'Failed to reject loan request.' }); }
};

// @desc    Admin disburses an approved loan
// @route   POST /api/admin/data/loan-requests/:id/disburse
// @access  Private (Admin/SuperAdmin)
const disburseLoan = async (req, res) => {
    const loanId = req.params.id;
    const adminId = req.user._id; // Admin performing disbursement
    const session = await mongoose.startSession();
    let transactionCommitted = false;
    try {
        session.startTransaction({ /* ... options ... */ });
        const loanRequest = await LoanRequest.findById(loanId).session(session);
        if (!loanRequest) throw new Error('Loan request not found.');
        if (loanRequest.status !== 'approved') throw new Error(`Cannot disburse. Loan status: ${loanRequest.status}`);

        const userToReceive = await User.findById(loanRequest.user).session(session);
        if (!userToReceive) throw new Error('User for loan not found.');

        const disbursementAmount = loanRequest.approvedAmount || loanRequest.requestedAmount;

        // Add amount to user's balance
        userToReceive.balance += disbursementAmount;
        userToReceive.outstandingLoanAmount = (userToReceive.outstandingLoanAmount || 0) + disbursementAmount;
        await userToReceive.save({ session });

        // Update loan request
        loanRequest.status = 'disbursed';
        loanRequest.disbursedAt = new Date();
        // Ensure approvedBy is set if not already (e.g. if disbursement is a separate step by different admin)
        if (!loanRequest.approvedBy) loanRequest.approvedBy = adminId; 
        await loanRequest.save({ session });

        // Create transaction record
        const disbursementTx = new Transaction({
            // sender: adminId, // Or null for system
            // senderModel: 'Admin',
            receiver: userToReceive._id,
            receiverModel: 'User',
            amount: disbursementAmount,
            type: 'Loan Disbursed',
            description: `Loan disbursed for request ID: ${loanId}`,
            status: 'completed',
            balanceAfterTransaction: userToReceive.balance // User's balance after disbursement
        });
        await disbursementTx.save({ session });

        await session.commitTransaction();
        transactionCommitted = true;
        res.json({ message: 'Loan disbursed successfully.', loanRequest, userNewBalance: userToReceive.balance });
    } catch (error) { /* ... (robust error handling with abort) ... */ }
    finally { /* ... (session.endSession()) ... */ }
};


// --- Investment Management by Admin ---
// @desc    Get all investments for Admin view
// @route   GET /api/admin/data/investments
// @access  Private (Admin/SuperAdmin)
const getAllInvestmentsForAdmin = async (req, res) => {
    const { status } = req.query;
    const query = status ? { status } : {};
    try {
        const investments = await Investment.find(query)
            .populate('user', 'name mobileNumber')
            .populate('investmentTransactionId payoutTransactionId', 'type amount createdAt')
            .sort({ createdAt: -1 });
        res.json(investments);
    } catch (error) { res.status(500).json({ message: 'Failed to fetch investments.' }); }
};

// @desc    Admin processes an investment payout (marks as matured, calculates profit, prepares for withdrawal)
// @route   PUT /api/admin/data/investments/:id/process-payout
// @access  Private (Admin/SuperAdmin)
const processInvestmentPayout = async (req, res) => {
    const investmentId = req.params.id;
    // const { actualReturnRate } = req.body; // Admin might input this if not fixed

    try {
        const investment = await Investment.findById(investmentId);
        if (!investment) return res.status(404).json({ message: "Investment not found." });
        if (investment.status !== 'active' && investment.status !== 'matured') { // Can only process active or already matured ones
            return res.status(400).json({ message: `Cannot process payout for investment with status: ${investment.status}` });
        }

        // Calculate profit (example: simple interest for the term)
        // This logic would be based on your investment scheme rules
        let profit = 0;
        if (investment.termMonths && investment.expectedReturnRate) {
            // Simple interest: P * R * T (where R is per term)
            // If expectedReturnRate is annual, adjust for term
            const ratePerTerm = (investment.expectedReturnRate / 12) * investment.termMonths;
            profit = investment.investedAmount * ratePerTerm;
        } else if (investment.expectedReturnRate) { // If no term, assume rate is for the period until payout
            profit = investment.investedAmount * investment.expectedReturnRate;
        }
        profit = parseFloat(profit.toFixed(2)); // Round to 2 decimal places

        investment.profitEarned = profit;
        investment.totalPayoutAmount = investment.investedAmount + profit;
        investment.status = 'matured'; // Or 'payout_pending' if it requires another step
        // investment.payoutDate = new Date(); // Set this when user actually withdraws or admin disburses payout

        await investment.save();
        res.json({ message: "Investment payout processed. Ready for user withdrawal or admin disbursement.", investment });

    } catch (error) { res.status(500).json({ message: "Failed to process investment payout." }); }
};


module.exports = {
    getAllRegularUsers,
    getUserByIdForAdmin,
    createRegularUserByAdmin,
    deleteRegularUserByAdmin,
    getAllAgentsForAdmin,      // New
    getAgentByIdForAdmin,      // New
    createAgentByAdmin,        // New
    approveAgentApplication,   // New
    rejectAgentApplication,    // New
    toggleAgentActiveStatus,   // New
    deleteAgentByAdmin,         // New

    // Merchant Management
    getAllMerchantsForAdmin,    // New
    getMerchantByIdForAdmin,    // New
    createMerchantByAdmin,      // New
    updateMerchantByAdmin,      // New
    deleteMerchantByAdmin,       // New

    // Admin Account Management
    getAllAdminAccounts,
    getAdminAccountById,
    createAdminAccountBySuperAdmin,
    approveAdminApplicationBySuperAdmin, // For admins who applied via /api/admin/auth/apply
    rejectAdminApplicationBySuperAdmin,
    toggleAdminActiveStatus,
    resetAdminPasswordBySuperAdmin,
    deleteAdminAccount,

    getAllTransactionsForAdmin,     // New
    clearAllTransactionHistory,    // New
    
    getDashboardStats,

    getAllLoanRequestsForAdmin,
    approveLoanRequest,
    rejectLoanRequest,
    disburseLoan,
    getAllInvestmentsForAdmin,
    processInvestmentPayout
};