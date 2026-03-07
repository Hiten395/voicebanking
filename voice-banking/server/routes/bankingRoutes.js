const express = require('express');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { processVoiceQuery } = require('../services/aiService');

const router = express.Router();

// All routes require JWT
router.use(verifyToken);

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-pin -refreshToken -voiceprint');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// GET /api/user/transactions
router.get('/transactions', async (req, res) => {
  try {
    const { accountType, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user.id };
    if (accountType && accountType !== 'all') {
      query.accountType = accountType;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// POST /api/voice/query
router.post('/voice/query', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Query text required' });
    }

    const user = await User.findById(req.user.id).select('-pin -refreshToken -voiceprint');
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 }).limit(10);

    const result = await processVoiceQuery(text, {
      name: user.name,
      language: user.language,
      accounts: user.accounts,
      transactions
    });

    res.json(result);
  } catch (error) {
    console.error('Voice query error:', error);
    res.status(500).json({ message: 'Voice query failed' });
  }
});

module.exports = router;
