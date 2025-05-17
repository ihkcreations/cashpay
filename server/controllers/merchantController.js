// server/controllers/merchantController.js
const Merchant = require('../models/Merchant');

// @desc    Get all active merchants
// @route   GET /api/merchants
// @access  Private (User must be logged in to see merchants)
const getAllMerchants = async (req, res) => {
    try {
        // Fetch only active merchants and select necessary fields
        const merchants = await Merchant.find({ isActive: true })
                                    .select('merchantName merchantId mobileNumber category _id'); // Add other fields if needed for display
        res.json(merchants);
    } catch (error) {
        console.error('Error fetching merchants:', error);
        res.status(500).json({ message: 'Failed to fetch merchants.' });
    }
};

// Placeholder for admin to add merchants (will be part of admin panel)
const addMerchant = async (req, res) => {
    // const { merchantName, merchantId, mobileNumber, category, balance } = req.body;
    // // ... validation ...
    // try {
    //     const newMerchant = await Merchant.create({ merchantName, merchantId, mobileNumber, category, balance });
    //     res.status(201).json(newMerchant);
    // } catch (error) {
    //     if (error.code === 11000) { // Duplicate key
    //         return res.status(400).json({ message: 'Merchant ID already exists.' });
    //     }
    //     res.status(500).json({ message: 'Failed to add merchant.', errorDetails: error.message });
    // }
    res.status(501).json({message: "Admin function: Add merchant not implemented for user access."})
};

module.exports = {
    getAllMerchants,
    addMerchant // For admin later
};