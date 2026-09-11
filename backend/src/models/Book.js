const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    publisher: {
      type: String,
      trim: true
    },
    publicationYear: {
      type: Number,
      validate: {
        validator: function (value) {
          if (value === undefined || value === null || value === '') return true;
          if (!Number.isInteger(value)) return false;
          const currentYear = new Date().getFullYear();
          return value >= 1000 && value <= currentYear + 5;
        },
        message: 'Publication year must be a valid year between 1000 and next 5 years'
      }
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies is required'],
      min: [1, 'Total copies must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Total copies must be an integer'
      }
    },
    availableCopies: {
      type: Number,
      required: [true, 'Available copies is required'],
      min: [0, 'Available copies cannot be negative'],
      validate: {
        validator: function (value) {
          if (!Number.isInteger(value)) return false;
          // 'this' refers to document on create/save; on update via findOneAndUpdate, this check is bypassed, controller handles it
          if (this.totalCopies !== undefined && this.totalCopies !== null) {
            return value <= this.totalCopies;
          }
          return true;
        },
        message: 'Available copies cannot be greater than total copies'
      }
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
