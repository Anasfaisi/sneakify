const mongoose = require('mongoose');

const unverifiedUserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Please enter your First name'],
    },
    lastName: {
        type: String,
    },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpiry: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes TTL
  },
});

module.exports = mongoose.model('UnverifiedUser', unverifiedUserSchema);
