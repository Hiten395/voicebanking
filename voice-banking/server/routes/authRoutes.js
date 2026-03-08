const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/otpService');
const { generateUserAccounts } = require('../services/accountService');
const { generateEmbedding, cosineSimilarity } = require('../services/voiceService');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── Token Helper ─────────────────────────────────────────────
const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, phone: user.phone }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' });

const issueTokens = (user) => {
  const accessToken = generateAccessToken(user);
  return accessToken;
};

// ─── POST /api/auth/send-otp ──────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Phone number or username required' });
    }

    // Determine if it's a phone number or username
    let query = {};
    let isPhone = false;
    if (/^[0-9]{10}$/.test(identifier)) {
      query.phone = identifier;
      isPhone = true;
    } else {
      query.username = identifier.toLowerCase();
    }

    const user = await User.findOne(query);
    if (!user && !isPhone) {
      // If registering new, we MUST require a phone number for OTP.
      // So if identifier is a username and user doesn't exist, we can't send OTP.
      return res.status(400).json({ success: false, error: 'User not found. Please register with a phone number first.' });
    }

    // If user exists, send OTP to their registered phone number
    const targetPhone = user ? user.phone : identifier;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.deleteMany({ phone: targetPhone });
    await OTP.create({ phone: targetPhone, otp: hashedOTP });
    await sendOTP(targetPhone, otp);

    res.json({ success: true, message: 'OTP sent successfully', phone: targetPhone });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ─── POST /api/auth/check-username ─────────────────────────────
router.post('/check-username', async (req, res) => {
  try {
    const { username, phone } = req.body;
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: 'Username must be 3-20 characters (letters, numbers, underscore)' });
    }
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }
    const query = [{ username: username.toLowerCase() }];
    if (phone) query.push({ phone });

    const existing = await User.findOne({ $or: query });
    if (existing) {
      if (existing.username === username.toLowerCase()) {
        return res.json({ success: true, available: false, error: 'Username already taken' });
      } else {
        return res.json({ success: true, available: false, error: 'Phone number already registered' });
      }
    }
    res.json({ success: true, available: true });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ success: false, error: 'Failed to check username' });
  }
});

// ─── POST /api/auth/register ────────────────────────────────────
// Creates user (OTP already verified by this point)
router.post('/register', async (req, res) => {
  try {
    const { username, name, age, phone, language, accountType, pin, voicePassphrase } = req.body;

    if (!username || !name || !age || !phone) {
      return res.status(400).json({ success: false, error: 'Username, name, age and phone are required' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: 'Username must be 3-20 characters (letters, numbers, underscore)' });
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }
    if (!pin || !/^[0-9]{4}$/.test(pin)) {
      return res.status(400).json({ success: false, error: 'A valid 4-digit PIN is required' });
    }

    const validAccountTypes = ['savings', 'current', 'pension'];
    const selectedType = validAccountTypes.includes(accountType) ? accountType : 'savings';

    const existingUser = await User.findOne({ $or: [{ phone }, { username: username.toLowerCase() }] });
    if (existingUser) {
      if (existingUser.username === username.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'Username already taken' });
      }
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Auto-generate unique account number for selected type
    const accounts = await generateUserAccounts(selectedType);

    let voiceprint = [];
    if (voicePassphrase && voicePassphrase.trim().length >= 3) {
      const embedding = await generateEmbedding(voicePassphrase.trim());
      if (embedding) {
        voiceprint = embedding;
      }
    }

    const user = await User.create({
      username: username.toLowerCase(),
      name,
      age: parseInt(age),
      phone,
      language: language || 'en',
      pin: hashedPin,
      voiceprint,
      accounts,
    });

    // Issue token so user is logged in immediately
    const accessToken = issueTokens(user);

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        language: user.language,
        accounts: user.accounts,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────
// If user exists → returns JWT (login flow)
// If user doesn't exist yet → returns success only (registration flow)
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }

    const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'OTP expired or not found' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    await OTP.deleteMany({ phone });

    const user = await User.findOne({ phone });

    // Registration flow — user doesn't exist yet, just confirm OTP is valid
    if (!user) {
      return res.json({ success: true, message: 'OTP verified' });
    }

    // Login flow — user exists, issue token
    user.failedPinAttempts = 0;
    user.isLocked = false;
    await user.save();

    const accessToken = issueTokens(user);

    res.json({
      success: true,
      accessToken,
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        language: user.language,
        accounts: user.accounts,
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
});

// ─── POST /api/auth/set-pin (JWT required) ────────────────────
router.post('/set-pin', verifyToken, async (req, res) => {
  try {
    const { pin, confirmPin } = req.body;
    if (!pin || !confirmPin) {
      return res.status(400).json({ success: false, error: 'PIN and confirm PIN required' });
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      return res.status(400).json({ success: false, error: 'PIN must be exactly 4 digits' });
    }
    if (pin !== confirmPin) {
      return res.status(400).json({ success: false, error: 'PINs do not match' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.pin = await bcrypt.hash(pin, 10);
    await user.save();

    res.json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({ success: false, error: 'Failed to set PIN' });
  }
});

// ─── POST /api/auth/enroll-voice (JWT required) ───────────────
router.post('/enroll-voice', verifyToken, async (req, res) => {
  try {
    const { voicePassphrase } = req.body;

    if (!voicePassphrase || typeof voicePassphrase !== 'string' || voicePassphrase.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Valid voice passphrase required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const embedding = await generateEmbedding(voicePassphrase.trim());
    if (!embedding) {
      return res.status(500).json({ success: false, error: 'Failed to generate voice embedding' });
    }

    user.voiceprint = embedding;
    await user.save();

    res.json({ success: true, message: 'Voice enrolled successfully' });
  } catch (error) {
    console.error('Voice enroll error:', error);
    res.status(500).json({ success: false, error: 'Voice enrollment failed' });
  }
});

// ─── POST /api/auth/login/otp ─────────────────────────────────
router.post('/login/otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    let query = {};
    if (/^[0-9]{10}$/.test(identifier)) {
      query.phone = identifier;
    } else {
      query.username = identifier.toLowerCase();
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isLocked) return res.status(423).json({ success: false, error: 'Account locked. Reset via OTP.' });

    const otpRecord = await OTP.findOne({ phone: user.phone }).sort({ createdAt: -1 });
    if (!otpRecord) return res.status(400).json({ success: false, error: 'OTP expired or not found' });

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid OTP' });

    await OTP.deleteMany({ phone: user.phone });
    user.failedPinAttempts = 0;
    user.isLocked = false;

    const accessToken = issueTokens(user);
    res.json({
      success: true,
      accessToken,
      data: { id: user._id, name: user.name, phone: user.phone, language: user.language, accounts: user.accounts }
    });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ─── POST /api/auth/login/pin ─────────────────────────────────
router.post('/login/pin', async (req, res) => {
  try {
    const { identifier, pin } = req.body;

    let query = {};
    if (/^[0-9]{10}$/.test(identifier)) {
      query.phone = identifier;
    } else {
      query.username = identifier.toLowerCase();
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isLocked) return res.status(423).json({ success: false, error: 'Account locked. Reset via OTP.' });
    if (!user.pin) return res.status(400).json({ success: false, error: 'PIN not set. Please register again.' });

    const isValid = await bcrypt.compare(pin, user.pin);
    if (!isValid) {
      user.failedPinAttempts += 1;
      if (user.failedPinAttempts >= 5) {
        user.isLocked = true;
        await user.save();
        return res.status(423).json({ success: false, error: 'Account locked after 5 failed attempts.', attemptsUsed: 5, maxAttempts: 5 });
      }
      await user.save();
      return res.status(400).json({ success: false, error: 'Invalid PIN', attemptsUsed: user.failedPinAttempts, maxAttempts: 5 });
    }

    user.failedPinAttempts = 0;
    const accessToken = issueTokens(user);
    res.json({
      success: true,
      accessToken,
      data: { id: user._id, name: user.name, phone: user.phone, language: user.language, accounts: user.accounts }
    });
  } catch (error) {
    console.error('PIN login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ─── POST /api/auth/login/voice ───────────────────────────────
router.post('/login/voice', async (req, res) => {
  try {
    const { identifier, voicePassphrase } = req.body;

    if (!identifier || !voicePassphrase || typeof voicePassphrase !== 'string' || voicePassphrase.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Identifier and valid voice passphrase required' });
    }

    let query = {};
    if (/^[0-9]{10}$/.test(identifier)) {
      query.phone = identifier;
    } else {
      query.username = identifier.toLowerCase();
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isLocked) return res.status(423).json({ success: false, error: 'Account locked. Reset via OTP.' });
    if (!user.voiceprint || user.voiceprint.length === 0) {
      return res.status(400).json({ success: false, error: 'Voice login not set up. Please use PIN.' });
    }

    const voiceVector = await generateEmbedding(voicePassphrase.trim());
    if (!voiceVector) {
      return res.status(500).json({ success: false, error: 'Failed to generate voice embedding' });
    }

    // Cosine similarity check
    const similarity = cosineSimilarity(voiceVector, user.voiceprint);
    if (similarity < 0.80) {
      return res.status(401).json({ success: false, error: 'Voice not recognized. Please try again or use PIN.' });
    }

    user.failedPinAttempts = 0;
    const accessToken = issueTokens(user);
    res.json({
      success: true,
      accessToken,
      data: { id: user._id, name: user.name, phone: user.phone, language: user.language, accounts: user.accounts }
    });
  } catch (error) {
    console.error('Voice login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;