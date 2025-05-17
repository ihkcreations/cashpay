const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    index: true // Index for faster lookups
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