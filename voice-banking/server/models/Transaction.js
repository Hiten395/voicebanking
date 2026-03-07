const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountType: { type: String, enum: ['savings', 'pension'], required: true },
  accountNumber: { type: String, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  merchant: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String, default: '' }
}, { timestamps: true });

transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
