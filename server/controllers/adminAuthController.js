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
        // Find the admin account
        const adminUser = await Admin.findOne({ username });
        if (!adminUser) return res.status(404).json({ message: "Admin account not found." });

        // Check status - should they be allowed to reset password?
        // Usually, active admins can reset. Maybe block pending/rejected?
        if (adminUser.applicationStatus !== 'approved' && adminUser.role !== 'super_admin') {
             return res.status(403).json({ message: 'Admin account not approved or is inactive.'});
        }


        // --- OTP Generation & Storage ---
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString().slice(0,6); // 6-digit
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP linked to admin's username or ID
        // Using username as identifier for simplicity in OTP collection
        await OTP.findOneAndUpdate(
            { identifier: username, type: 'admin_reset' }, // Use username as identifier, type to distinguish
            { otpCode, expiresAt, mobileNumber: null }, // No mobileNumber needed for admin OTP in this model
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`\n--- ADMIN PASSWORD RESET OTP for ${username}: ${otpCode} ---\n`);

        res.json({
            message: `Password reset OTP sent for ${username}. (Check server console)`,
            // For prototype UI, return OTP here:
            prototypeOtp: otpCode
        });

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

    try {
        // 1. Find and Validate OTP
        const otpRecord = await OTP.findOne({ identifier: username, type: 'admin_reset', otpCode: otpCode });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }
        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ _id: otpRecord._id }); // Clean up expired OTP
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }

        // 2. Find Admin Account
        const adminUser = await Admin.findOne({ username });
        if (!adminUser) { // Should not happen if OTP is valid, but safety check
            await OTP.deleteOne({ _id: otpRecord._id }); // Clean up OTP
            return res.status(404).json({ message: "Admin account not found." });
        }

        // 3. Reset Password and Activate/Approve (as password reset implies regaining access)
        adminUser.password = newPassword; // Password will be hashed by pre-save
        // Assuming reset password implies full activation/approval if they weren't already
        adminUser.isActive = true;
        adminUser.applicationStatus = 'approved';
        await adminUser.save();

        // 4. Clean up the used OTP
        await OTP.deleteOne({ _id: otpRecord._id });

        res.json({ message: "Password has been reset successfully. You can now login." });

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