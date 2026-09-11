const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createBorrower,
  getAllBorrowers,
  getBorrowerById,
  updateBorrower,
  deleteBorrower
} = require('../controllers/borrowerController');

// All borrower routes require authentication (admin and librarian)
router.use(protect);

router.post('/', createBorrower);
router.get('/', getAllBorrowers);
router.get('/:id', getBorrowerById);
router.put('/:id', updateBorrower);
router.delete('/:id', deleteBorrower);

module.exports = router;
