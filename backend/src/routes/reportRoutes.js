const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDashboard,
  getInventoryReport,
  getBorrowerReport,
  getTransactionReport,
  getFineReport,
  getOverdueReport
} = require('../controllers/reportController');

// All report routes require authentication (admin and librarian)
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/inventory', getInventoryReport);
router.get('/borrowers', getBorrowerReport);
router.get('/transactions', getTransactionReport);
router.get('/fines', getFineReport);
router.get('/overdue', getOverdueReport);

module.exports = router;
