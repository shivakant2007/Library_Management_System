const mongoose = require('mongoose');

const issueTransactionSchema = new mongoose.Schema(
  {
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Borrower',
      required: [true, 'Borrower is required']
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book is required']
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'IssuedBy is required']
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    returnDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['issued', 'returned'],
      default: 'issued'
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: [0, 'Fine amount cannot be negative']
    },
    fineStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'not_applicable'],
      default: 'not_applicable'
    },
    finePaidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for frequent queries
issueTransactionSchema.index({ status: 1 });
issueTransactionSchema.index({ borrower: 1 });
issueTransactionSchema.index({ book: 1 });
issueTransactionSchema.index({ borrower: 1, book: 1, status: 1 });

const IssueTransaction = mongoose.model('IssueTransaction', issueTransactionSchema);

module.exports = IssueTransaction;
