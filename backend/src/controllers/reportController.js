const Book = require('../models/Book');
const Borrower = require('../models/Borrower');
const IssueTransaction = require('../models/IssueTransaction');
const { calculateFine } = require('../utils/fineUtils');

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
// @access  Private (admin, librarian)
const getDashboard = async (req, res) => {
  try {
    // Books
    const totalTitles = await Book.countDocuments();
    const bookAgg = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      }
    ]);
    const totalCopies = bookAgg[0]?.totalCopies || 0;
    const availableCopies = bookAgg[0]?.availableCopies || 0;
    const issuedCopies = totalCopies - availableCopies;

    // Borrowers
    const totalBorrowers = await Borrower.countDocuments();
    const activeBorrowers = await Borrower.countDocuments({ status: 'active' });
    const blockedBorrowers = await Borrower.countDocuments({ status: 'blocked' });

    // Transactions
    const totalTransactions = await IssueTransaction.countDocuments();
    const currentlyIssued = await IssueTransaction.countDocuments({ status: 'issued' });
    const returnedTransactions = await IssueTransaction.countDocuments({ status: 'returned' });

    // Fines - stored
    const unpaidAgg = await IssueTransaction.aggregate([
      { $match: { fineStatus: 'unpaid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } }
    ]);
    const paidAgg = await IssueTransaction.aggregate([
      { $match: { fineStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } }
    ]);
    const unpaidAmount = unpaidAgg[0]?.total || 0;
    const unpaidCount = unpaidAgg[0]?.count || 0;
    const paidAmount = paidAgg[0]?.total || 0;
    const paidCount = paidAgg[0]?.count || 0;

    // Overdue - dynamic
    const now = new Date();
    const issuedTransactions = await IssueTransaction.find({ status: 'issued' });
    let overdueCount = 0;
    let overdueAmount = 0;
    for (const t of issuedTransactions) {
      if (!t.dueDate) continue;
      const { overdueDays, fineAmount } = calculateFine(t.dueDate, now);
      if (overdueDays > 0) {
        overdueCount++;
        overdueAmount += fineAmount;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        books: {
          totalTitles,
          totalCopies,
          availableCopies,
          issuedCopies
        },
        borrowers: {
          total: totalBorrowers,
          active: activeBorrowers,
          blocked: blockedBorrowers
        },
        transactions: {
          total: totalTransactions,
          currentlyIssued,
          returned: returnedTransactions
        },
        fines: {
          unpaidAmount,
          paidAmount,
          unpaidCount,
          paidCount
        },
        overdue: {
          count: overdueCount,
          amount: overdueAmount
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard'
    });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private
const getInventoryReport = async (req, res) => {
  try {
    const totalTitles = await Book.countDocuments();
    const agg = await Book.aggregate([
      { $group: { _id: null, totalCopies: { $sum: '$totalCopies' }, availableCopies: { $sum: '$availableCopies' } } }
    ]);
    const totalCopies = agg[0]?.totalCopies || 0;
    const availableCopies = agg[0]?.availableCopies || 0;
    const issuedCopies = totalCopies - availableCopies;

    const books = await Book.find().sort({ createdAt: -1 }).lean();
    const booksWithIssued = books.map((b) => ({
      _id: b._id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      totalCopies: b.totalCopies,
      availableCopies: b.availableCopies,
      issuedCopies: b.totalCopies - b.availableCopies
    }));

    const outOfStock = booksWithIssued.filter((b) => b.availableCopies === 0);
    const inStock = booksWithIssued.filter((b) => b.availableCopies > 0);

    // Category totals
    const categoryAgg = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          totalTitles: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      },
      { $sort: { totalCopies: -1 } }
    ]);
    const categories = categoryAgg.map((c) => ({
      category: c._id,
      totalTitles: c.totalTitles,
      totalCopies: c.totalCopies,
      availableCopies: c.availableCopies,
      issuedCopies: c.totalCopies - c.availableCopies
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTitles,
          totalCopies,
          availableCopies,
          issuedCopies
        },
        books: booksWithIssued,
        outOfStock,
        inStock,
        categories
      }
    });
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory report'
    });
  }
};

// @desc    Get borrower report
// @route   GET /api/reports/borrowers
// @access  Private
const getBorrowerReport = async (req, res) => {
  try {
    const total = await Borrower.countDocuments();
    const active = await Borrower.countDocuments({ status: 'active' });
    const blocked = await Borrower.countDocuments({ status: 'blocked' });

    const borrowers = await Borrower.find()
      .select('borrowerId name email studentId department status membershipDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Department counts
    const deptAgg = await Borrower.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$department', 'Unknown'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    const departments = deptAgg.map((d) => ({
      department: d._id,
      count: d.count
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active,
          blocked
        },
        borrowers,
        departments
      }
    });
  } catch (error) {
    console.error('Get borrower report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching borrower report'
    });
  }
};

// @desc    Get transaction report
// @route   GET /api/reports/transactions
// @access  Private
const getTransactionReport = async (req, res) => {
  try {
    const total = await IssueTransaction.countDocuments();
    const currentlyIssued = await IssueTransaction.countDocuments({ status: 'issued' });
    const returned = await IssueTransaction.countDocuments({ status: 'returned' });

    // Overdue count
    const issuedTransactions = await IssueTransaction.find({ status: 'issued' });
    let overdue = 0;
    const now = new Date();
    for (const t of issuedTransactions) {
      if (!t.dueDate) continue;
      const { overdueDays } = calculateFine(t.dueDate, now);
      if (overdueDays > 0) overdue++;
    }

    const transactions = await IssueTransaction.find()
      .populate('borrower', 'borrowerId name email studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ createdAt: -1 })
      .lean();

    // Add overdueDays for issued
    const enriched = transactions.map((t) => {
      if (t.status === 'issued' && t.dueDate) {
        const { overdueDays } = calculateFine(t.dueDate, now);
        return { ...t, overdueDays };
      }
      if (t.status === 'returned' && t.dueDate && t.returnDate) {
        const { overdueDays } = calculateFine(t.dueDate, t.returnDate);
        return { ...t, overdueDays };
      }
      return { ...t, overdueDays: 0 };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          currentlyIssued,
          returned,
          overdue
        },
        transactions: enriched
      }
    });
  } catch (error) {
    console.error('Get transaction report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction report'
    });
  }
};

// @desc    Get fine report
// @route   GET /api/reports/fines
// @access  Private
const getFineReport = async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !['unpaid', 'paid', 'not_applicable'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fine status filter'
      });
    }

    // Summary across all fines
    const totalAgg = await IssueTransaction.aggregate([
      { $match: { fineAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } }
    ]);
    const unpaidAgg = await IssueTransaction.aggregate([
      { $match: { fineStatus: 'unpaid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } }
    ]);
    const paidAgg = await IssueTransaction.aggregate([
      { $match: { fineStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } }
    ]);

    const summary = {
      totalFineAmount: totalAgg[0]?.total || 0,
      totalFineCount: totalAgg[0]?.count || 0,
      unpaidAmount: unpaidAgg[0]?.total || 0,
      unpaidCount: unpaidAgg[0]?.count || 0,
      paidAmount: paidAgg[0]?.total || 0,
      paidCount: paidAgg[0]?.count || 0
    };

    const filter = { fineAmount: { $gt: 0 } };
    if (status && ['unpaid', 'paid'].includes(status)) {
      filter.fineStatus = status;
    }

    const records = await IssueTransaction.find(filter)
      .populate('borrower', 'borrowerId name email studentId department status')
      .populate('book', 'title author isbn category')
      .populate('issuedBy', 'name userId email role')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = records.map((r) => {
      let overdueDays = 0;
      if (r.dueDate) {
        const ref = r.returnDate || new Date();
        const calc = calculateFine(r.dueDate, ref);
        overdueDays = calc.overdueDays;
      }
      return { ...r, overdueDays };
    });

    res.status(200).json({
      success: true,
      data: {
        summary,
        records: enriched
      }
    });
  } catch (error) {
    console.error('Get fine report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fine report'
    });
  }
};

// @desc    Get overdue report
// @route   GET /api/reports/overdue
// @access  Private
const getOverdueReport = async (req, res) => {
  try {
    const now = new Date();
    const issued = await IssueTransaction.find({ status: 'issued' })
      .populate('borrower', 'borrowerId name email studentId department status')
      .populate('book', 'title author isbn category totalCopies availableCopies')
      .populate('issuedBy', 'name userId email role')
      .sort({ dueDate: 1 })
      .lean();

    const overdue = [];
    for (const t of issued) {
      if (!t.dueDate) continue;
      const { overdueDays, fineAmount } = calculateFine(t.dueDate, now);
      if (overdueDays > 0) {
        overdue.push({
          _id: t._id,
          borrower: t.borrower,
          book: t.book,
          issuedBy: t.issuedBy,
          issueDate: t.issueDate,
          dueDate: t.dueDate,
          overdueDays,
          currentFineAmount: fineAmount,
          fineAmount, // alias for convenience
          status: t.status
        });
      }
    }

    res.status(200).json({
      success: true,
      count: overdue.length,
      data: overdue
    });
  } catch (error) {
    console.error('Get overdue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overdue report'
    });
  }
};

module.exports = {
  getDashboard,
  getInventoryReport,
  getBorrowerReport,
  getTransactionReport,
  getFineReport,
  getOverdueReport
};
