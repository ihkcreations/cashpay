// server/controllers/adminAuthController.js
const Admin = require('../models/Admin'); // <<<< USE Admin MODEL
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');

// @desc    Admin Login
// @route   POST /api/admin/auth/login
// @access  Public
const adminLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const adminUser = await Admin.findOne({ username: username }); // Query Admin collection

        if (!adminUser) { // Check if adminUser exists at all
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Role check is inherent by querying Admin model, but explicit check is good
        if (adminUser.role !== 'admin' && adminUser.role !== 'super_admin') {
            return res.status(401).json({ message: 'Account is not an authorized admin type.' });
        }

        if (adminUser.applicationStatus === 'pending_super_admin_approval') {
            return res.status(403).json({ message: 'Your admin application is pending approval.'});
        }
        if (adminUser.applicationStatus === 'rejected') {
            return res.status(403).json({ message: 'Your admin application was rejected.'});
        }
        // Only 'approved' status should proceed past this for non-super_admins
        if (adminUser.role === 'admin' && adminUser.applicationStatus !== 'approved') {
            return res.status(403).json({ message: 'Admin account not yet approved.' });
        }
        if (!adminUser.isActive) {
            return res.status(403).json({ message: 'Admin account is not active. Please contact support.' });
        }


        if (await adminUser.matchPassword(password)) {
            const adminDataToReturn = {
                _id: adminUser._id,
                username: adminUser.username,
                name: adminUser.name,
                role: adminUser.role,
            };

            res.json({
                ...adminDataToReturn,
                token: generateToken(adminUser._id, adminUser.role),
                message: 'Admin login successful!'
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ message: 'Admin login failed. Please try again.' });
    }
};

// @desc    Admin Applies for New Account
// @route   POST /api/admin/auth/apply
// @access  Public
const adminApplyForAccount = async (req, res) => {
    const { username, password, name, superAdminOtp } = req.body;

    if (!username || !password || !name || !superAdminOtp) {
        return res.status(400).json({ message: 'Username, password, name, and Super Admin OTP are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const PROTOTYPE_SUPER_ADMIN_OTP = process.env.ADMIN_APP_OTP || "25684238"; // Use .env
    if (superAdminOtp !== PROTOTYPE_SUPER_ADMIN_OTP) {
        return res.status(400).json({ message: 'Invalid Super Admin OTP.' });
    }

    try {
        const existingAdmin = await Admin.findOne({ username: username }); // Query Admin collection
        if (existingAdmin) {
            return res.status(400).json({ message: 'Username already exists.' });
        }

        const newAdmin = new Admin({ // Create Admin document
            username,
            password, // Will be hashed
            name,
            role: 'admin', // New applicants are regular admins
            applicationStatus: 'pending_super_admin_approval',
            isActive: false, // Not active until approved
        });

        await newAdmin.save();

        res.status(201).json({
            message: 'Admin account application submitted. Awaiting Super Admin approval.'
        });

    } catch (error) {
        console.error('Admin Application Error:', error);
        res.status(500).json({ message: 'Admin account application failed.' });
    }
};


// @desc    Admin Password Reset Request (Sends OTP - Placeholder)
// @route   POST /api/admin/auth/request-password-reset
// @access  Public
const requestAdminPasswordReset = async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username is required." });

    try {
        const adminUser = await Admin.findOne({ username }); // Query Admin collection
        if (!adminUser) return res.status(404).json({ message: "Admin account not found." });

        // In a real app, send OTP to adminUser.email (if you add email field)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString().slice(0,6);
        // For prototype, we log. Store in OTP collection for verification.
        // await OTP.findOneAndUpdate({ identifier: username, type: 'admin_reset' }, { otpCode, expiresAt }, { upsert: true });
        
        res.json({ message: `Password reset OTP for ${username}. (Check server console)` });

    } catch (error) { 
        console.error("Req Admin Pass Reset Error:", error);
        res.status(500).json({ message: "Failed to request password reset." });
     }
};

// @desc    Admin Reset Password with OTP
// @route   POST /api/admin/auth/reset-password
// @access  Public
const resetAdminPassword = async (req, res) => {
    const { username, otpCode, newPassword } = req.body;
    
    if (!username || !otpCode || !newPassword) {
        return res.status(400).json({ message: "Username, OTP, and new password are required." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }
    // TODO: Actual OTP verification from OTP collection
    

    try {
        const adminUser = await Admin.findOne({ username }); // Query Admin collection
        if (!adminUser) return res.status(404).json({ message: "Admin account not found." });

        adminUser.password = newPassword;
        adminUser.isActive = true; // Re-activate if they were inactive
        adminUser.applicationStatus = 'approved'; // Ensure status is approved
        await adminUser.save();

        res.json({ message: "Password has been reset successfully." });
    } catch (error) { 
        console.error("Admin Reset Password Error:", error);
        res.status(500).json({ message: "Failed to reset password." });
    }
};

const getAdminProfile = async (req, res) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Not authorized or not an admin profile." });
    }
    res.json(req.user);
};


module.exports = {
    adminLogin,
    adminApplyForAccount,
    requestAdminPasswordReset,
    resetAdminPassword,
    getAdminProfile
};