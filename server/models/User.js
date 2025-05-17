// server/models/User.js
// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^(?:\+?88)?01[3-9]\d{8}$/, 'Please fill a valid Bangladeshi mobile number']
  },
  pin: {
    type: String, // Not required initially for agent applications
  },
  balance: {
    type: Number,
    required: true,
    default: 0.00
  },
  isVerified: { // For regular users, means OTP + PIN set. For agents, means OTP + PIN set + Admin Approved.
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user'], // Add agent roles
    required: true,
    default: 'user'
  },
  name: { // Can be used for agent's contact person name or their own name
      type: String,
      default: null
  },
  dateOfBirth: {
       type: Date,
       default: null
   },
  // --- Loan and Investment Tracking ---
  outstandingLoanAmount: { // Total principal amount user currently owes
      type: Number,
      default: 0
  },
  totalInvestedAmount: { // Total principal amount user currently has invested actively
      type: Number,
      default: 0
  },

}, {
  timestamps: true
});

// Hash PIN before saving
userSchema.pre('save', async function (next) {
  if (this.pin && this.isModified('pin')) {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin, salt);
  }
  next();
});

// Method to match entered PIN
userSchema.methods.matchPin = async function (enteredPin) {
   if (!this.pin) return false;
  return await bcrypt.compare(enteredPin, this.pin);
};

const User = mongoose.model('User', userSchema);
module.exports = User;