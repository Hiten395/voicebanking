const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  type: { type: String, enum: ['savings', 'pension'], required: true },
  number: { type: String, required: true },
  balance: { type: Number, default: 0 }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  phone: { type: String, required: true, unique: true, match: /^[0-9]{10}$/ },
  language: { type: String, default: 'en', enum: ['en', 'hi', 'ta', 'te'] },
  pin: { type: String, required: true },
  voiceprint: { type: [Number], default: [] },
  accounts: [accountSchema],
  failedPinAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  refreshToken: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
