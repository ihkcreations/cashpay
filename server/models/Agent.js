// server/models/Agent.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = mongoose.Schema({
    mobileNumber: { // Primary identifier for login and contact
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^(?:\+?88)?01[3-9]\d{8}$/, 'Please fill a valid Bangladeshi mobile number']
    },
    pin: {
        type: String,
        // Not required initially, set after admin approval
    },
    balance: { // Agents will have their own operational balance
        type: Number,
        required: true,
        default: 0.00
    },
    name: { // Contact person name for the agency
        type: String,
        required: true,
        trim: true
    },
    shopName: {
        type: String,
        required: true,
        trim: true
    },
    district: {
        type: String,
        required: true,
        trim: true
    },
    area: {
        type: String,
        required: true,
        trim: true
    },
    nidNumber: {
        type: String,
        required: true,
        unique: true, // NID should be unique among agents
        trim: true
    },
    applicationStatus: { // Tracks the onboarding process
        type: String,
        enum: ['pending_otp_verification', 'pending_admin_approval', 'approved', 'rejected'],
        required: true,
        default: 'pending_otp_verification'
    },
    isActive: { // For admin to enable/disable the agent after approval
        type: Boolean,
        default: false // Becomes true upon PIN setup after approval, or admin can toggle
    },
    role: { // <<<<<< ADD THIS FIELD
        type: String,
        required: true,
        enum: ['agent'], // Only 'agent' is valid for this schema
        default: 'agent'
    }
    // You can add commission rates, transaction limits, etc. later
}, {
    timestamps: true
});

// Index for faster searching
// agentSchema.index({ mobileNumber: 1 });
agentSchema.index({ shopName: 'text', name: 'text' });

// Middleware to hash the PIN before saving
agentSchema.pre('save', async function (next) {
    // Ensure 'role' is always 'agent' if not already set
    if (this.isNew || !this.role) {
        this.role = 'agent';
    }
    if (this.pin && this.isModified('pin')) {
        const salt = await bcrypt.genSalt(10);
        this.pin = await bcrypt.hash(this.pin, salt);
    }
    next();
});

// Method to compare entered PIN with the hashed PIN in the database
agentSchema.methods.matchPin = async function (enteredPin) {
    if (!this.pin) return false;
    return await bcrypt.compare(enteredPin, this.pin);
};

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;