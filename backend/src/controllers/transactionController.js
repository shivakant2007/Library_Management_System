const mongoose = require('mongoose');
const IssueTransaction = require('../models/IssueTransaction');
const Book = require('../models/Book');
const Borrower = require('../models/Borrower');
const { calculateFine, FINE_PER_DAY } = require('../utils/fineUtils');

// Helper to validate due date - must be future
const isValidDueDate = (dueDateStr) => {
  if (!dueDateStr) return false;
  const d = new Date(dueDateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d > now;
};

// Helper to resolve borrower by human borrowerId or ObjectId
const findBorrower = async (identifier) => {
  if (!identifier) return null;
  const trimmed = String(identifier).trim();
  let borrower = await Borrower.findOne({ borrowerId: trimmed });
  if (borrower) return borrower;
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    borrower = await Borrower.findById(trimmed);
  }
  return borrower;
};

// Helper to enrich transaction with fine calculation (for active overdue display)
// Does not modify DB, just adds virtual fields for response
const enrichWithDynamicFine = (transactionDoc) => {
  const obj = transactionDoc.toObject ? transactionDoc.toObject() : { ...transactionDoc };
  // Ensure fine fields defaults for old docs
  if (obj.fineAmount === undefined || obj.fineAmount === null) obj.fineAmount = 0;
  if (!obj.fineStatus) obj.fineStatus = obj.fineAmount > 0 ? 'unpaid' : 'not_applicable';
  // For issued transactions, calculate current overdue dynamically
  if (obj.status === 'issued' && obj.dueDate) {
    const { overdueDays, fineAmount } = calculateFine(obj.dueDate, new Date());
    // Only for display: show what current fine would be if returned now
    obj.currentOverdueDays = overdueDays;
    obj.currentFineAmount = fineAmount;
    // For active overdue, we do NOT overwrite stored fineAmount; just provide dynamic
    // But for convenience, also provide overdueDays at top level
    obj.overdueDays = overdueDays;
    // If transaction has stored fine 0 but is currently overdue, show dynamic fine as fineAmount for UI?
    // Keep stored fineAmount separately, but also expose dynamic
  } else if (obj.status === 'returned' && obj.dueDate && obj.returnDate) {
    const { overdueDays, fineAmount } = calculateFine(obj.dueDate, obj.returnDate);
    obj.overdueDays = overdueDays;
    // For returned, fineAmount already stored, but ensure overdueDays exposed
  }
  return obj;
};

// @desc    Issue book to borrower
// @route   POST /api/transactions/issue
// @access  Private (admin, librarian)
const issueBook = async (req, res) => {
  try {
    const { borrowerId, bookId, dueDate, borrower, book } = req.body;
    const borrowerIdentifier = borrowerId || borrower;
    const bookIdentifier = bookId || book;

    if (!borrowerIdentifier || !bookIdentifier || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide borrowerId, bookId and dueDate'
      });
    }

    const d = new Date(dueDate);
    if (isNaN(d.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date'
      });
    }
    if (d <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Due date must be in the future'
      });
    }
    const parsedDueDate = d;

    const borrowerDoc = await findBorrower(borrowerIdentifier);
    if (!borrowerDoc) {
      return res.status(404).json({
        success: false,
        message: 'Borrower not found'
      });
    }

    if (borrowerDoc.status === 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'Blocked borrowers cannot borrow books'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(bookIdentifier).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format'
      });
    }
    const bookDoc = await Book.findById(String(bookIdentifier).trim());
    if (!bookDoc) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (bookDoc.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No available copies for this book'
      });
    }

    const existingActive = await IssueTransaction.findOne({
      borrower: borrowerDoc._id,
      book: bookDoc._id,
      status: 'issued'
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'This book is already issued to this borrower and not yet returned'
      });
    }

    // Atomic decrement
    const updatedBook = await Book.findOneAndUpdate(
      { _id: bookDoc._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(400).json({
        success: false,
        message: 'No available copies for this book'
      });
    }

    try {
      const transactionDoc = await IssueTransaction.create({
        borrower: borrowerDoc._id,
        book: bookDoc._id,
        issuedBy: req.user.id,
        issueDate: new Date(),
        dueDate: parsedDueDate,
        status: 'issued',
        fineAmount: 0,
        fineStatus: 'not_applicable',
        finePaidAt: null
      });

      const populated = await IssueTransaction.findById(transactionDoc._id)
        .populate('borrower', 'borrowerId name email phone studentId department status')
        .populate('book', 'title author isbn category totalCopies availableCopies')
        .populate('issuedBy', 'name userId email role');

      return res.status(201).json({
        success: true,
        message: 'Book issued successfully',
        transaction: populated
      });
    } catch (createErr) {
      await Book.findByIdAndUpdate(bookDoc._id, { $inc: { availableCopies: 1 } });
      console.error('Create transaction error:', createErr);
      return res.status(500).json({
        success: false,
        message: 'Server error while issuing book'
      });
    }
  } catch (error) {
    console.error('Issue book error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while issuing book'
    });
  }
};

// @desc    Return book
// @route   POST /api/transactions/return
// @access  Private (admin,librarian)
const returnBook = async (req, res) => {
  try {
    const { transactionId, id } = req.body;
    const transId = transactionId || id;

    if (!transId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transactionId'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(transId).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await IssueTransaction.findById(String(transId).trim());
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned for this transaction'
      });
    }

    const bookDoc = await Book.findById(transaction.book);
    if (!bookDoc) {
      return res.status(404).json({
        success: false,
        message: 'Associated book not found'
      });
    }

    if (bookDoc.availableCopies >= bookDoc.totalCopies) {
      return res.status(400).json({
        success: false,
        message: 'Book inventory inconsistency: available copies already at maximum'
      });
    }

    // Calculate fine based on dueDate and now (returnDate)
    const now = new Date();
    const { overdueDays, fineAmount } = calculateFine(transaction.dueDate, now);
    let fineStatus = 'not_applicable';
    if (fineAmount > 0) {
      fineStatus = 'unpaid';
    }

    // Update transaction with return and fine
    transaction.status = 'returned';
    transaction.returnDate = now;
    transaction.fineAmount = fineAmount;
    transaction.fineStatus = fineStatus;
    transaction.finePaidAt = null;
    await transaction.save();

    try {
      const updatedBook = await Book.findByIdAndUpdate(
        transaction.book,
        { $inc: { availableCopies: 1 } },
        { new: true }
      );

      if (updatedBook.availableCopies > updatedBook.totalCopies) {
        transaction.status = 'issued';
        transaction.returnDate = null;
        transaction.fineAmount = 0;
        transaction.fineStatus = 'not_applicable';
        transaction.finePaidAt = null;
        await transaction.save();
        await Book.findByIdAndUpdate(transaction.book, { $inc: { availableCopies: -1 } });
        return res.status(400).json({
          success: false,
          message: 'Book inventory inconsistency: available copies cannot exceed total copies'
        });
      }

      const populated = await IssueTransaction.findById(transaction._id)
        .populate('borrower', 'borrowerId name email phone studentId department status')
        .populate('book', 'title author isbn category totalCopies availableCopies')
        .populate('issuedBy', 'name userId email role');

      // Add overdueDays for response
      const enriched = enrichWithDynamicFine(populated);

      return res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        transaction: enriched
      });
    } catch (bookErr) {
      transaction.status = 'issued';
      transaction.returnDate = null;
      transaction.fineAmount = 0;
      transaction.fineStatus = 'not_applicable';
      transaction.finePaidAt = null;
      await transaction.save();
      console.error('Return book increment error:', bookErr);
      return res.status(500).json({
        success: false,
        message: 'Server error while returning book'
      });
    }
  } catch (error) {
    console.error('Return book error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while returning book'
    });
  }
};

// @desc    Get active transactions
// @route   GET /api/transactions/active
// @access  Private
const getActiveTransactions = async (req, res) => {
  try {
    const transactions = await IssueTransaction.find({ status: 'issued' })
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ createdAt: -1 });

    const enriched = transactions.map((t) => enrichWithDynamicFine(t));

    res.status(200).json({
      success: true,
      count: enriched.length,
      transactions: enriched
    });
  } catch (error) {
    console.error('Get active transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active transactions'
    });
  }
};

// @desc    Get all transactions with optional status filter
// @route   GET /api/transactions
// @access  Private
const getAllTransactions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['issued', 'returned'].includes(status)) {
      filter.status = status;
    }

    const transactions = await IssueTransaction.find(filter)
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ createdAt: -1 });

    const enriched = transactions.map((t) => enrichWithDynamicFine(t));

    res.status(200).json({
      success: true,
      count: enriched.length,
      transactions: enriched
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await IssueTransaction.findById(id)
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const enriched = enrichWithDynamicFine(transaction);

    res.status(200).json({
      success: true,
      transaction: enriched
    });
  } catch (error) {
    console.error('Get transaction by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction'
    });
  }
};

// @desc    Get overdue transactions (issued where dueDate < now)
// @route   GET /api/transactions/overdue
// @access  Private
const getOverdueTransactions = async (req, res) => {
  try {
    const now = new Date();
    // Find issued where dueDate < now (calendar comparison via fine calc)
    const allIssued = await IssueTransaction.find({ status: 'issued' })
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ dueDate: 1 });

    const overdue = [];
    for (const t of allIssued) {
      if (!t.dueDate) continue;
      const { overdueDays, fineAmount } = calculateFine(t.dueDate, now);
      if (overdueDays > 0) {
        const enriched = enrichWithDynamicFine(t);
        // Ensure overdueDays/fineAmount are set for overdue
        enriched.overdueDays = overdueDays;
        enriched.fineAmount = fineAmount; // current dynamic, not stored
        enriched.currentFineAmount = fineAmount;
        overdue.push(enriched);
      }
    }

    res.status(200).json({
      success: true,
      count: overdue.length,
      transactions: overdue
    });
  } catch (error) {
    console.error('Get overdue transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overdue transactions'
    });
  }
};

// @desc    Get transactions with fines (fineAmount >0)
// @route   GET /api/transactions/fines
// @access  Private
const getFines = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { fineAmount: { $gt: 0 } };
    if (status && ['unpaid', 'paid'].includes(status)) {
      filter.fineStatus = status;
    } else if (status && status === 'not_applicable') {
      // Not needed for fines, but handle
      filter.fineStatus = status;
    }

    const transactions = await IssueTransaction.find(filter)
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ createdAt: -1 });

    const enriched = transactions.map((t) => enrichWithDynamicFine(t));

    res.status(200).json({
      success: true,
      count: enriched.length,
      transactions: enriched
    });
  } catch (error) {
    console.error('Get fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fines'
    });
  }
};

// @desc    Pay fine for transaction
// @route   POST /api/transactions/:id/pay-fine
// @access  Private (admin,librarian)
const payFine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await IssueTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Backward compatibility: treat missing as 0/not_applicable
    const fineAmount = transaction.fineAmount || 0;
    const fineStatus = transaction.fineStatus || (fineAmount > 0 ? 'unpaid' : 'not_applicable');

    if (fineAmount === 0 || fineStatus === 'not_applicable') {
      return res.status(400).json({
        success: false,
        message: 'No fine to pay for this transaction'
      });
    }

    if (fineStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Fine already paid'
      });
    }

    if (fineStatus !== 'unpaid') {
      return res.status(400).json({
        success: false,
        message: 'Fine is not in unpaid state'
      });
    }

    transaction.fineStatus = 'paid';
    transaction.finePaidAt = new Date();
    await transaction.save();

    const populated = await IssueTransaction.findById(transaction._id)
      .populate('borrower', 'borrowerId name email phone studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role');

    const enriched = enrichWithDynamicFine(populated);

    return res.status(200).json({
      success: true,
      message: 'Fine paid successfully',
      transaction: enriched
    });
  } catch (error) {
    console.error('Pay fine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while paying fine'
    });
  }
};

module.exports = {
  issueBook,
  returnBook,
  getActiveTransactions,
  getAllTransactions,
  getTransactionById,
  getOverdueTransactions,
  getFines,
  payFine
};
