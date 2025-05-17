// server/controllers/userController.js
const User = require('../models/User');
const Agent = require('../models/Agent'); // Assuming you have an Agent model

// @desc    Update authenticated user's profile (for Name, DOB - Step 4 backend)
// @route   PUT /api/user/profile
// @access  Private (User must be logged in)
const updateUserProfile = async (req, res) => {
    // req.user is available from the protect middleware
    const user = req.user;

    // Extract fields that are allowed to be updated via this route
    const { name, dateOfBirth } = req.body;

    try {
        // Update fields if provided
        if (name !== undefined && name !== null) { // Allow clearing name? Maybe not in this case
            user.name = name.trim(); // Trim whitespace
        }
         if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== '') {
             try {
                 // Ensure dateOfBirth string can be parsed into a valid Date object
                 const dateObj = new Date(dateOfBirth);
                 if (isNaN(dateObj.getTime())) {
                      throw new Error('Invalid date format');
                 }
                 user.dateOfBirth = dateObj;
             } catch (dateError) {
                 console.error('Date parsing error:', dateError);
                 return res.status(400).json({ message: 'Invalid date of birth format. Please use YYYY-MM-DD.' });
             }
         }


        // Save the updated user document
        await user.save();

        const updatedUser = await User.findById(user._id).select('-pin');

        // Return the updated user object directly
        res.json(updatedUser);

    } catch (error) {
        console.error('Error updating user profile:', error);
         // Handle potential Mongoose validation errors (e.g., invalid date format)
        const message = error.message || 'Failed to update profile';
        res.status(500).json({ message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        // Exclude PIN and select only necessary fields for contact list
        const users = await User.find({}).select('name mobileNumber _id');
        res.json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
};

// @desc    Get a list of potential recipients (verified users and active agents) for an agent
// @route   GET /api/user/recipients-for-agent
// @access  Private (Agent only - using agentProtect middleware)
const getRecipientListForAgent = async (req, res) => {
    const currentAgentId = req.user._id; // Logged-in agent

    try {
        // Fetch verified regular users
        const users = await User.find({ role: 'user', isVerified: true })
                              .select('name mobileNumber _id role'); // Include role for frontend differentiation

        // Fetch other active, approved agents (excluding self)
        const otherAgents = await Agent.find({
                                  _id: { $ne: currentAgentId }, // Exclude self
                                  isActive: true,
                                  applicationStatus: 'approved'
                              })
                              .select('name shopName mobileNumber _id role'); // Include role

        // Combine and format for frontend
        const formattedUsers = users.map(u => ({
            _id: u._id,
            displayName: u.name || u.mobileNumber,
            mobileNumber: u.mobileNumber,
            type: 'User' // Add a type identifier
        }));

        const formattedAgents = otherAgents.map(a => ({
            _id: a._id,
            displayName: a.shopName || a.name || a.mobileNumber, // Prefer shopName for agents
            mobileNumber: a.mobileNumber,
            type: 'Agent' // Add a type identifier
        }));

        const recipients = [...formattedUsers, ...formattedAgents];
        // Optional: Sort by displayName
        recipients.sort((a, b) => a.displayName.localeCompare(b.displayName));

        res.json(recipients);

    } catch (error) {
        console.error("Error fetching recipient list for agent:", error);
        res.status(500).json({ message: 'Failed to fetch recipient list.' });
    }
};


module.exports = {
    updateUserProfile,
    getAllUsers,
    getRecipientListForAgent,
};