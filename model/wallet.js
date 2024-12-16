const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',  // Refers to your User model
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      required: true,
    },
    transactions: [
      {
        type: {
          type: String,  // 'credit' or 'debit'
          enum: ['credit', 'debit'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        description: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
