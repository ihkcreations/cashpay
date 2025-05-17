// server/models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: { // Admin's full name or display name
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'super_admin'],
        default: 'admin',
    },
    // For the admin application flow shown in your UI
    applicationStatus: {
        type: String,
        enum: [null, 'pending_super_admin_approval', 'approved', 'rejected'],
        // Default to null for super_admin created directly, or 'pending' for applicants
        default: function() {
            return this.role === 'super_admin' ? 'approved' : null;
        }
    },
    isActive: { // Can be used by super_admin to enable/disable other admins
        type: Boolean,
        default: function() {
            return this.role === 'super_admin' ? true : false; // Super admin active by default
        }
    },
    // email: { // Optional, but highly recommended for password resets
    //     type: String,
    //     trim: true,
    //     lowercase: true,
    //     unique: true,
    //     sparse: true, // Allows null but unique if value exists
    //     match: [/.+\@.+\..+/, 'Please fill a valid email address']
    // },
    // lastLogin: {
    //     type: Date
    // }
}, {
    timestamps: true,
});

// Index for username
// adminSchema.index({ username: 1 });

// Hash password before saving
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema); // Collection will be 'admins'

module.exports = Admin;