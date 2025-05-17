// server/models/Merchant.js
const mongoose = require('mongoose');

const merchantSchema = mongoose.Schema({
    merchantName: { // e.g., "Daraz Online Shopping", "Swapno Super Shop"
        type: String,
        required: true,
        trim: true
    },
    merchantId: { // A unique ID for the merchant, could be system-generated or their own ID
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    mobileNumber: { // Contact mobile number for the merchant (can be different from payment receiving number if any)
        type: String,
        required: true,
        // You might want a different validation regex if merchant numbers differ
        match: [/^(?:\+?88)?01[3-9]\d{8}$/, 'Please fill a valid Bangladeshi mobile number']
    },
    // For this prototype, let's assume payments directly go to an account linked to this merchant entity.
    // In a real system, merchants would have associated bank accounts or e-wallets.
    // We can add a 'balance' to the merchant if we want to simulate crediting them.
    balance: {
        type: Number,
        required: true,
        default: 0.00
    },
    category: { // Optional: e.g., "E-commerce", "Groceries", "Restaurant"
        type: String,
        trim: true
    },
    isActive: { // To enable/disable a merchant
        type: Boolean,
        default: true
    }
    // Add other relevant fields like address, logoURL, etc.
}, {
    timestamps: true
});

// Optional: Add an index for faster searching by merchantId or name
// merchantSchema.index({ merchantId: 1 });
merchantSchema.index({ merchantName: 'text' }); // For text search on name

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;