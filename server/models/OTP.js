const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    index: true // Index for faster lookups
  },
  identifier: { // For admin OTPs (e.g., username) or other entities
      type: String,
      index: true,
      sparse: true,
  },
  type: { // To distinguish OTP purpose/entity type
      type: String,
      required: true,
      enum: ['user', 'agent', 'admin_reset'], // Add 'admin_reset'
      default: 'user'
  },
  otpCode: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '0s' } // TTL index: MongoDB will automatically delete documents when expiresAt is reached
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;