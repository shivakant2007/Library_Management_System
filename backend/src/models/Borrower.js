const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema(
  {
    borrowerId: {
      type: String,
      required: [true, 'Borrower ID is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          if (!value) return true; // optional
          return /^\S+@\S+\.\S+$/.test(value);
        },
        message: 'Please provide a valid email'
      }
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          // Simple phone validation: 7-15 digits, may contain spaces, dashes, plus
          return /^[0-9+\-\s]{7,20}$/.test(value);
        },
        message: 'Please provide a valid phone number'
      }
    },
    studentId: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    membershipDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Sparse unique indexes for optional fields that should be unique when present
borrowerSchema.index({ email: 1 }, { unique: true, sparse: true });
borrowerSchema.index({ studentId: 1 }, { unique: true, sparse: true });

const Borrower = mongoose.model('Borrower', borrowerSchema);

module.exports = Borrower;
