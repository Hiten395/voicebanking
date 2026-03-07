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

// POST /api/voice/query (mounted at /api/voice, so route is just /query)
router.post('/query', async (req, res) => {
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

// POST /api/user/transfer — Transfer between own accounts (savings ↔ pension)
router.post('/transfer', async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description } = req.body;

    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ message: 'fromAccount, toAccount and amount are required' });
    }
    if (fromAccount === toAccount) {
      return res.status(400).json({ message: 'Cannot transfer to the same account' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sourceAcc = user.accounts.find(a => a.type === fromAccount);
    const destAcc = user.accounts.find(a => a.type === toAccount);

    if (!sourceAcc || !destAcc) {
      return res.status(400).json({ message: 'Invalid account type' });
    }
    if (sourceAcc.balance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Update balances
    sourceAcc.balance -= parsedAmount;
    destAcc.balance += parsedAmount;
    await user.save();

    // Create transaction records
    const debitTx = await Transaction.create({
      userId: user._id,
      accountType: fromAccount,
      accountNumber: sourceAcc.number,
      type: 'debit',
      amount: parsedAmount,
      merchant: `Transfer to ${toAccount}`,
      category: 'Transfer',
      description: description || `Transfer to ${toAccount} account`
    });

    const creditTx = await Transaction.create({
      userId: user._id,
      accountType: toAccount,
      accountNumber: destAcc.number,
      type: 'credit',
      amount: parsedAmount,
      merchant: `Transfer from ${fromAccount}`,
      category: 'Transfer',
      description: description || `Transfer from ${fromAccount} account`
    });

    res.json({
      message: 'Transfer successful',
      transaction: debitTx,
      updatedBalances: {
        [fromAccount]: sourceAcc.balance,
        [toAccount]: destAcc.balance
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Transfer failed' });
  }
});

// POST /api/user/deposit — Deposit money into an account
router.post('/deposit', async (req, res) => {
  try {
    const { accountType, amount, description } = req.body;

    if (!accountType || !amount) {
      return res.status(400).json({ message: 'accountType and amount are required' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const account = user.accounts.find(a => a.type === accountType);
    if (!account) {
      return res.status(400).json({ message: 'Invalid account type' });
    }

    // Update balance
    account.balance += parsedAmount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      accountType,
      accountNumber: account.number,
      type: 'credit',
      amount: parsedAmount,
      merchant: 'Cash Deposit',
      category: 'Deposit',
      description: description || 'Cash deposit'
    });

    res.json({
      message: 'Deposit successful',
      transaction,
      updatedBalance: account.balance
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ message: 'Deposit failed' });
  }
});

// POST /api/user/withdraw — Withdraw money from an account
router.post('/withdraw', async (req, res) => {
  try {
    const { accountType, amount, description } = req.body;

    if (!accountType || !amount) {
      return res.status(400).json({ message: 'accountType and amount are required' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const account = user.accounts.find(a => a.type === accountType);
    if (!account) {
      return res.status(400).json({ message: 'Invalid account type' });
    }
    if (account.balance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Update balance
    account.balance -= parsedAmount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      accountType,
      accountNumber: account.number,
      type: 'debit',
      amount: parsedAmount,
      merchant: 'Cash Withdrawal',
      category: 'Withdrawal',
      description: description || 'Cash withdrawal'
    });

    res.json({
      message: 'Withdrawal successful',
      transaction,
      updatedBalance: account.balance
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ message: 'Withdrawal failed' });
  }
});

module.exports = router;
