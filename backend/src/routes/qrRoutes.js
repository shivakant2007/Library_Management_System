const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBookQr, getBorrowerQr, lookupQr } = require('../controllers/qrController');

// All QR routes require authentication (admin and librarian)
router.use(protect);

router.get('/books/:id', getBookQr);
router.get('/borrowers/:id', getBorrowerQr);
router.post('/lookup', lookupQr);

module.exports = router;
