const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/otpService');
const { generateAccountNumber } = require('../services/accountService');
const { generateEmbedding, cosineSimilarity } = require('../services/voiceService');

const router = express.Router();

// Generate tokens
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, phone: user.phone }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id, phone: user.phone }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Valid 10-digit phone number required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.deleteMany({ phone });
    await OTP.create({ phone, otp: hashedOTP });
    await sendOTP(phone, otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    await OTP.deleteMany({ phone });
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, age, phone, language, pin, voicePassphrase } = req.body;

    if (!name || !age || !phone || !pin) {
      return res.status(400).json({ message: 'Name, age, phone, and PIN are required' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const savingsNumber = await generateAccountNumber('SB');
    const pensionNumber = await generateAccountNumber('PN');

    let voiceprint = [];
    if (voicePassphrase) {
      const embedding = await generateEmbedding(voicePassphrase);
      if (!embedding) {
        return res.status(500).json({ message: 'Failed to process voice passphrase. Please try again.' });
      }
      voiceprint = embedding;
    }

    const user = await User.create({
      name,
      age,
      phone,
      language: language || 'en',
      pin: hashedPin,
      voiceprint,
      accounts: [
        { type: 'savings', number: savingsNumber, balance: 25000 },
        { type: 'pension', number: pensionNumber, balance: 50000 }
      ]
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: { id: user._id, name: user.name, phone: user.phone, language: user.language }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/login/otp
router.post('/login/otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isLocked) {
      return res.status(423).json({ message: 'Account is locked. Please reset via OTP.' });
    }

    const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    await OTP.deleteMany({ phone });

    // Reset failed attempts on successful login
    user.failedPinAttempts = 0;
    user.isLocked = false;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user._id, name: user.name, phone: user.phone, language: user.language }
    });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// POST /api/auth/login/pin
router.post('/login/pin', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isLocked) {
      return res.status(423).json({ message: 'Account is locked. Please reset via OTP.' });
    }

    const isValid = await bcrypt.compare(pin, user.pin);
    if (!isValid) {
      user.failedPinAttempts += 1;
      if (user.failedPinAttempts >= 5) {
        user.isLocked = true;
        await user.save();
        return res.status(423).json({ message: 'Account locked due to too many failed attempts. Reset via OTP.', attemptsUsed: 5, maxAttempts: 5 });
      }
      await user.save();
      return res.status(400).json({
        message: 'Invalid PIN',
        attemptsUsed: user.failedPinAttempts,
        maxAttempts: 5
      });
    }

    user.failedPinAttempts = 0;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user._id, name: user.name, phone: user.phone, language: user.language }
    });
  } catch (error) {
    console.error('PIN login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// POST /api/auth/login/voice
router.post('/login/voice', async (req, res) => {
  try {
    const { phone, voicePassphrase } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isLocked) {
      return res.status(423).json({ message: 'Account is locked. Please reset via OTP.' });
    }
    if (!user.voiceprint || user.voiceprint.length === 0) {
      return res.status(400).json({ message: 'Voice login not set up for this account' });
    }

    const embedding = await generateEmbedding(voicePassphrase);
    if (!embedding) {
      return res.status(500).json({ message: 'Voice processing failed' });
    }

    const similarity = cosineSimilarity(embedding, user.voiceprint);
    if (similarity < 0.85) {
      return res.status(401).json({ message: 'Voice not recognized. Please try again or use another login method.', similarity });
    }

    user.failedPinAttempts = 0;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user._id, name: user.name, phone: user.phone, language: user.language }
    });
  } catch (error) {
    console.error('Voice login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshCookie(res, newRefreshToken);
    res.json({
      accessToken,
      user: { id: user._id, name: user.name, phone: user.phone, language: user.language }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
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
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }
});

module.exports = router;
