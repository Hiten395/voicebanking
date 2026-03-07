const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes
});

otpSchema.index({ phone: 1 });

module.exports = mongoose.model('OTP', otpSchema);
