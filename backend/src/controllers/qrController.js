const mongoose = require('mongoose');
const Book = require('../models/Book');
const Borrower = require('../models/Borrower');
const { generateBookPayload, generateBorrowerPayload, parsePayload, generateQrImage } = require('../utils/qrUtils');

// @desc    Generate QR for a Book
// @route   GET /api/qr/books/:id
// @access  Private (admin, librarian)
const getBookQr = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format'
      });
    }

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const payload = generateBookPayload(book._id);
    const qrCode = await generateQrImage(payload);

    res.status(200).json({
      success: true,
      type: 'book',
      payload,
      qrCode,
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        totalCopies: book.totalCopies,
        availableCopies: book.availableCopies
      }
    });
  } catch (error) {
    console.error('Get Book QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating Book QR'
    });
  }
};

// @desc    Generate QR for a Borrower
// @route   GET /api/qr/borrowers/:id
// @access  Private (admin, librarian)
const getBorrowerQr = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid borrower ID format'
      });
    }

    const borrower = await Borrower.findById(id);
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: 'Borrower not found'
      });
    }

    const payload = generateBorrowerPayload(borrower._id);
    const qrCode = await generateQrImage(payload);

    res.status(200).json({
      success: true,
      type: 'borrower',
      payload,
      qrCode,
      borrower: {
        _id: borrower._id,
        borrowerId: borrower.borrowerId,
        name: borrower.name,
        studentId: borrower.studentId,
        department: borrower.department,
        status: borrower.status
      }
    });
  } catch (error) {
    console.error('Get Borrower QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating Borrower QR'
    });
  }
};

// @desc    Lookup by QR payload
// @route   POST /api/qr/lookup
// @access  Private (admin, librarian)
const lookupQr = async (req, res) => {
  try {
    const { payload } = req.body;

    if (payload === undefined || payload === null) {
      return res.status(400).json({
        success: false,
        message: 'QR payload is required'
      });
    }

    if (typeof payload !== 'string' || payload.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'QR payload is required'
      });
    }

    let parsed;
    try {
      parsed = parsePayload(payload);
    } catch (parseErr) {
      // Map specific parse errors to appropriate status
      const msg = parseErr.message;
      if (msg.includes('Invalid QR identifier')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR identifier'
        });
      }
      if (msg.includes('Unsupported QR type') || msg.includes('Unsupported QR version') || msg.includes('Invalid QR payload')) {
        return res.status(400).json({
          success: false,
          message: msg
        });
      }
      if (msg.includes('QR payload is required')) {
        return res.status(400).json({
          success: false,
          message: 'QR payload is required'
        });
      }
      return res.status(400).json({
        success: false,
        message: msg
      });
    }

    if (parsed.type === 'book') {
      const book = await Book.findById(parsed.id);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found for QR payload'
        });
      }

      return res.status(200).json({
        success: true,
        type: 'book',
        payload: payload.trim(),
        data: {
          _id: book._id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          category: book.category,
          totalCopies: book.totalCopies,
          availableCopies: book.availableCopies
        }
      });
    }

    if (parsed.type === 'borrower') {
      const borrower = await Borrower.findById(parsed.id);
      if (!borrower) {
        return res.status(404).json({
          success: false,
          message: 'Borrower not found for QR payload'
        });
      }

      return res.status(200).json({
        success: true,
        type: 'borrower',
        payload: payload.trim(),
        data: {
          _id: borrower._id,
          borrowerId: borrower.borrowerId,
          name: borrower.name,
          studentId: borrower.studentId,
          department: borrower.department,
          status: borrower.status
        }
      });
    }

    // Should not reach here
    return res.status(400).json({
      success: false,
      message: 'Unsupported QR type'
    });
  } catch (error) {
    console.error('QR lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing QR lookup'
    });
  }
};

module.exports = {
  getBookQr,
  getBorrowerQr,
  lookupQr
};
