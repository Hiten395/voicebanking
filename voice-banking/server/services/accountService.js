const User = require('../models/User');

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

const generateUserAccounts = async () => {
  const savingsNumber = await generateAccountNumber('SAV');
  const pensionNumber = await generateAccountNumber('PEN');

  return [
    { type: 'savings', number: savingsNumber, balance: 10000 },
    { type: 'pension', number: pensionNumber, balance: 25000 }
  ];
};

module.exports = { generateAccountNumber, generateUserAccounts };
