const User = require('../models/User');

const ACCOUNT_PREFIXES = {
  savings: 'SAV',
  current: 'CUR',
  pension: 'PEN'
};

const generateAccountNumber = async (prefix) => {
  let number;
  let exists = true;
  while (exists) {
    const digits = Math.floor(100000 + Math.random() * 900000);
    number = `${prefix}-${digits}`;
    const found = await User.findOne({ 'accounts.number': number });
    exists = !!found;
  }
  return number;
};

const generateUserAccounts = async (accountType = 'savings') => {
  const prefix = ACCOUNT_PREFIXES[accountType];
  if (!prefix) {
    throw new Error(`Invalid account type: ${accountType}`);
  }

  const accountNumber = await generateAccountNumber(prefix);

  return [
    { type: accountType, number: accountNumber, balance: 0 }
  ];
};

module.exports = { generateAccountNumber, generateUserAccounts };
