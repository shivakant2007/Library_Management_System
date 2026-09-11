const mongoose = require('mongoose');
const Book = require('../models/Book');

// Helper to validate publication year
const isValidPublicationYear = (year) => {
  if (year === undefined || year === null || year === '') return true;
  if (!Number.isInteger(year)) return false;
  const currentYear = new Date().getFullYear();
  return year >= 1000 && year <= currentYear + 5;
};

// @desc    Create a new book
// @route   POST /api/books
// @access  Private (admin, librarian)
const createBook = async (req, res) => {
  try {
    let { title, author, isbn, category, publisher, publicationYear, totalCopies, availableCopies, description } = req.body;

    // Trim string fields if present
    if (typeof title === 'string') title = title.trim();
    if (typeof author === 'string') author = author.trim();
    if (typeof isbn === 'string') isbn = isbn.trim();
    if (typeof category === 'string') category = category.trim();
    if (typeof publisher === 'string') publisher = publisher.trim();
    if (typeof description === 'string') description = description.trim();

    // Validate required fields
    if (!title || !author || !isbn || !category || totalCopies === undefined || totalCopies === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, author, isbn, category and totalCopies'
      });
    }

    // Validate totalCopies
    if (!Number.isInteger(totalCopies) || totalCopies < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total copies must be an integer of at least 1'
      });
    }

    // Handle availableCopies default
    if (availableCopies === undefined || availableCopies === null || availableCopies === '') {
      availableCopies = totalCopies;
    }

    // Validate availableCopies
    if (!Number.isInteger(availableCopies) || availableCopies < 0 || availableCopies > totalCopies) {
      return res.status(400).json({
        success: false,
        message: 'Available copies must be an integer between 0 and totalCopies'
      });
    }

    // Validate publicationYear if supplied
    if (publicationYear !== undefined && publicationYear !== null && publicationYear !== '') {
      // Ensure numeric
      if (typeof publicationYear === 'string' && publicationYear.trim() !== '') {
        const parsed = Number(publicationYear);
        if (!Number.isNaN(parsed)) publicationYear = parsed;
      }
      if (!Number.isInteger(publicationYear) || !isValidPublicationYear(publicationYear)) {
        return res.status(400).json({
          success: false,
          message: 'Publication year must be a valid year between 1000 and next 5 years'
        });
      }
    } else {
      publicationYear = undefined;
    }

    // Check duplicate ISBN
    const existingIsbn = await Book.findOne({ isbn });
    if (existingIsbn) {
      return res.status(400).json({
        success: false,
        message: 'ISBN already exists'
      });
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      category,
      publisher: publisher || undefined,
      publicationYear,
      totalCopies,
      availableCopies,
      description: description || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      book
    });
  } catch (error) {
    console.error('Create book error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating book'
    });
  }
};

// @desc    Get all books
// @route   GET /api/books
// @access  Private
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching books'
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Private
const getBookById = async (req, res) => {
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

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    console.error('Get book by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching book'
    });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private
const updateBook = async (req, res) => {
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

    let { title, author, isbn, category, publisher, publicationYear, totalCopies, availableCopies, description } = req.body;

    // Trim strings if present
    if (typeof title === 'string') title = title.trim();
    if (typeof author === 'string') author = author.trim();
    if (typeof isbn === 'string') isbn = isbn.trim();
    if (typeof category === 'string') category = category.trim();
    if (typeof publisher === 'string') publisher = publisher.trim();
    if (typeof description === 'string') description = description.trim();

    // Validate title/author/category/isbn if supplied (cannot be empty)
    if (title !== undefined && title === '') {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }
    if (author !== undefined && author === '') {
      return res.status(400).json({ success: false, message: 'Author cannot be empty' });
    }
    if (isbn !== undefined && isbn === '') {
      return res.status(400).json({ success: false, message: 'ISBN cannot be empty' });
    }
    if (category !== undefined && category === '') {
      return res.status(400).json({ success: false, message: 'Category cannot be empty' });
    }

    // Validate ISBN uniqueness if changed
    if (isbn !== undefined && isbn !== book.isbn) {
      const dup = await Book.findOne({ isbn });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: 'ISBN already exists'
        });
      }
    }

    // Validate publicationYear if supplied
    if (publicationYear !== undefined) {
      if (publicationYear === null || publicationYear === '') {
        publicationYear = undefined;
        // allow clearing? set to undefined
      } else {
        if (typeof publicationYear === 'string' && publicationYear.trim() !== '') {
          const parsed = Number(publicationYear);
          if (!Number.isNaN(parsed)) publicationYear = parsed;
        }
        if (!Number.isInteger(publicationYear) || !isValidPublicationYear(publicationYear)) {
          return res.status(400).json({
            success: false,
            message: 'Publication year must be a valid year between 1000 and next 5 years'
          });
        }
      }
    }

    // Handle totalCopies / availableCopies logic
    let newTotal = book.totalCopies;
    let newAvailable = book.availableCopies;
    let totalChanged = false;
    let availableChanged = false;

    if (totalCopies !== undefined) {
      if (totalCopies === null || totalCopies === '') {
        return res.status(400).json({ success: false, message: 'Total copies cannot be empty' });
      }
      if (typeof totalCopies === 'string') {
        const parsed = Number(totalCopies);
        if (!Number.isNaN(parsed)) totalCopies = parsed;
      }
      if (!Number.isInteger(totalCopies) || totalCopies < 1) {
        return res.status(400).json({
          success: false,
          message: 'Total copies must be an integer of at least 1'
        });
      }
      newTotal = totalCopies;
      totalChanged = true;
    }

    if (availableCopies !== undefined) {
      if (availableCopies === null || availableCopies === '') {
        return res.status(400).json({ success: false, message: 'Available copies cannot be empty' });
      }
      if (typeof availableCopies === 'string') {
        const parsed = Number(availableCopies);
        if (!Number.isNaN(parsed)) availableCopies = parsed;
      }
      if (!Number.isInteger(availableCopies) || availableCopies < 0) {
        return res.status(400).json({
          success: false,
          message: 'Available copies must be an integer of at least 0'
        });
      }
      newAvailable = availableCopies;
      availableChanged = true;
    }

    // If total changed but available not explicitly changed, check if existing available exceeds new total
    if (totalChanged && !availableChanged) {
      if (newAvailable > newTotal) {
        // Check unavailable logic: unavailable = old total - old available
        const unavailable = book.totalCopies - book.availableCopies;
        if (newTotal < unavailable) {
          return res.status(400).json({
            success: false,
            message: `Total copies cannot be less than borrowed copies (${unavailable} currently borrowed)`
          });
        }
        // Cap available to newTotal
        newAvailable = newTotal;
      } else {
        // Also check borrowed constraint even when available <= newTotal, but newTotal might still be less than unavailable?
        const unavailable = book.totalCopies - book.availableCopies;
        if (newTotal < unavailable) {
          return res.status(400).json({
            success: false,
            message: `Total copies cannot be less than borrowed copies (${unavailable} currently borrowed)`
          });
        }
      }
    }

    // If both or available changed, validate relationship
    if (newAvailable > newTotal) {
      return res.status(400).json({
        success: false,
        message: 'Available copies cannot be greater than total copies'
      });
    }

    // Also if total changed, ensure not less than borrowed (covers case where both supplied)
    const borrowed = book.totalCopies - book.availableCopies;
    if (totalChanged && newTotal < borrowed) {
      return res.status(400).json({
        success: false,
        message: `Total copies cannot be less than borrowed copies (${borrowed} currently borrowed)`
      });
    }

    // Apply updates
    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (isbn !== undefined) book.isbn = isbn;
    if (category !== undefined) book.category = category;
    if (publisher !== undefined) book.publisher = publisher;
    if (publicationYear !== undefined) book.publicationYear = publicationYear;
    if (description !== undefined) book.description = description;
    book.totalCopies = newTotal;
    book.availableCopies = newAvailable;

    await book.save();

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    console.error('Update book error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating book'
    });
  }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private
const deleteBook = async (req, res) => {
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

    await Book.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting book'
    });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook
};
