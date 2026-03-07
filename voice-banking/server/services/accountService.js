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

module.exports = { generateAccountNumber };
