const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  issueBook,
  returnBook,
  getActiveTransactions,
  getAllTransactions,
  getTransactionById,
  getOverdueTransactions,
  getFines,
  payFine
} = require('../controllers/transactionController');

// All transaction routes require authentication (admin and librarian)
router.use(protect);

router.post('/issue', issueBook);
router.post('/return', returnBook);
router.get('/overdue', getOverdueTransactions);
router.get('/fines', getFines);
router.get('/active', getActiveTransactions);
router.get('/', getAllTransactions);
router.post('/:id/pay-fine', payFine);
router.get('/:id', getTransactionById);

module.exports = router;
