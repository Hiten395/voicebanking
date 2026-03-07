const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/otpService');
const { generateUserAccounts } = require('../services/accountService');
const { cosineSimilarity } = require('../services/voiceService');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── Token Helpers ────────────────────────────────────────────
const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, phone: user.phone }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id, phone: user.phone }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const issueTokens = async (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();
  setRefreshCookie(res, refreshToken);
  return accessToken;
};

// ─── POST /api/auth/send-otp ──────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.deleteMany({ phone });
    await OTP.create({ phone, otp: hashedOTP });
    await sendOTP(phone, otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────
// Creates user + sends OTP automatically
router.post('/register', async (req, res) => {
  try {
    const { name, age, phone, language } = req.body;

    if (!name || !age || !phone) {
      return res.status(400).json({ success: false, error: 'Name, age and phone are required' });
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Auto-generate unique account numbers
    const accounts = await generateUserAccounts();

    const user = await User.create({
      name,
      age: parseInt(age),
      phone,
      language: language || 'en',
      accounts,
    });

    // Auto-send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);
    await OTP.deleteMany({ phone });
    await OTP.create({ phone, otp: hashedOTP });
    await sendOTP(phone, otp);

    res.status(201).json({ success: true, message: 'Account created. OTP sent to your phone.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────
// Returns JWT so frontend can call set-pin next
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
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Reset lock if any
    user.failedPinAttempts = 0;
    user.isLocked = false;

    const accessToken = await issueTokens(user, res);

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
    const { voiceVector } = req.body;

    if (!voiceVector || !Array.isArray(voiceVector) || voiceVector.length !== 256) {
      return res.status(400).json({ success: false, error: 'Valid 256-float voice vector required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.voiceprint = voiceVector;
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
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isLocked) return res.status(423).json({ success: false, error: 'Account locked. Reset via OTP.' });

    const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });
    if (!otpRecord) return res.status(400).json({ success: false, error: 'OTP expired or not found' });

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid OTP' });

    await OTP.deleteMany({ phone });
    user.failedPinAttempts = 0;
    user.isLocked = false;

    const accessToken = await issueTokens(user, res);
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
    const { phone, pin } = req.body;
    const user = await User.findOne({ phone });
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
    const accessToken = await issueTokens(user, res);
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
    const { phone, voiceVector } = req.body; // ✅ vector, text nahi

    if (!phone || !voiceVector || !Array.isArray(voiceVector) || voiceVector.length !== 256) {
      return res.status(400).json({ success: false, error: 'Phone and valid voice vector required' });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isLocked) return res.status(423).json({ success: false, error: 'Account locked. Reset via OTP.' });
    if (!user.voiceprint || user.voiceprint.length === 0) {
      return res.status(400).json({ success: false, error: 'Voice login not set up. Please use PIN.' });
    }

    // Cosine similarity check
    const similarity = cosineSimilarity(voiceVector, user.voiceprint);
    if (similarity < 0.85) {
      return res.status(401).json({ success: false, error: 'Voice not recognized. Please try again or use PIN.' });
    }

    user.failedPinAttempts = 0;
    const accessToken = await issueTokens(user, res);
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

// ─── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false, error: 'Invalid refresh token' });
    }

    const accessToken = await issueTokens(user, res);
    res.json({
      success: true,
      accessToken,
      data: { id: user._id, name: user.name, phone: user.phone, language: user.language, accounts: user.accounts }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(403).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
  } catch (_) {
    // token already expired — still logout
  }
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;