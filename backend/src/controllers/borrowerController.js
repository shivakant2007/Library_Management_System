const mongoose = require('mongoose');
const Borrower = require('../models/Borrower');

// Helper validators
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const isValidPhone = (phone) => /^[0-9+\-\s]{7,20}$/.test(phone);

// @desc    Create borrower
// @route   POST /api/borrowers
// @access  Private (admin, librarian)
const createBorrower = async (req, res) => {
  try {
    let { borrowerId, name, email, phone, studentId, department, address, membershipDate, status } = req.body;

    // Trim strings
    if (typeof borrowerId === 'string') borrowerId = borrowerId.trim();
    if (typeof name === 'string') name = name.trim();
    if (typeof email === 'string') email = email.trim().toLowerCase();
    if (typeof phone === 'string') phone = phone.trim();
    if (typeof studentId === 'string') studentId = studentId.trim();
    if (typeof department === 'string') department = department.trim();
    if (typeof address === 'string') address = address.trim();
    if (typeof status === 'string') status = status.trim();

    // Handle empty optional fields -> undefined (to avoid unique empty string conflicts)
    if (email === '') email = undefined;
    if (phone === '') phone = undefined;
    if (studentId === '') studentId = undefined;
    if (department === '') department = undefined;
    if (address === '') address = undefined;

    // Validate required
    if (!borrowerId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide borrowerId and name'
      });
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    // Validate status if provided
    if (status && !['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or blocked'
      });
    }

    // Validate membershipDate if supplied
    let parsedMembershipDate;
    if (membershipDate !== undefined && membershipDate !== null && membershipDate !== '') {
      parsedMembershipDate = new Date(membershipDate);
      if (isNaN(parsedMembershipDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid membership date'
        });
      }
    }

    // Check duplicate borrowerId
    const existingBorrowerId = await Borrower.findOne({ borrowerId });
    if (existingBorrowerId) {
      return res.status(400).json({
        success: false,
        message: 'Borrower ID already exists'
      });
    }

    // Check duplicate email if provided
    if (email) {
      const existingEmail = await Borrower.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check duplicate studentId if provided
    if (studentId) {
      const existingStudentId = await Borrower.findOne({ studentId });
      if (existingStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    const borrower = await Borrower.create({
      borrowerId,
      name,
      email: email || undefined,
      phone: phone || undefined,
      studentId: studentId || undefined,
      department: department || undefined,
      address: address || undefined,
      membershipDate: parsedMembershipDate || undefined,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Borrower created successfully',
      borrower
    });
  } catch (error) {
    console.error('Create borrower error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message = `${field} already exists`;
      if (field === 'borrowerId') message = 'Borrower ID already exists';
      if (field === 'email') message = 'Email already exists';
      if (field === 'studentId') message = 'Student ID already exists';
      return res.status(400).json({
        success: false,
        message
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
      message: 'Server error while creating borrower'
    });
  }
};

// @desc    Get all borrowers with search/filter
// @route   GET /api/borrowers
// @access  Private
const getAllBorrowers = async (req, res) => {
  try {
    const { search, status, department } = req.query;

    const filter = {};

    if (status) {
      if (['active', 'blocked'].includes(status)) {
        filter.status = status;
      }
    }

    if (department) {
      filter.department = department.trim();
      // Use case-insensitive exact match via regex? Keep simple exact match but trim
      // To allow case-insensitive, use regex
      filter.department = { $regex: `^${department.trim()}$`, $options: 'i' };
    }

    let query = filter;

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      const searchOr = [
        { borrowerId: regex },
        { name: regex },
        { email: regex },
        { phone: regex },
        { studentId: regex }
      ];
      // Combine with existing filter using $and
      if (Object.keys(filter).length > 0) {
        query = {
          $and: [filter, { $or: searchOr }]
        };
      } else {
        query = { $or: searchOr };
      }
    }

    const borrowers = await Borrower.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: borrowers.length,
      borrowers
    });
  } catch (error) {
    console.error('Get all borrowers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching borrowers'
    });
  }
};

// @desc    Get single borrower
// @route   GET /api/borrowers/:id
// @access  Private
const getBorrowerById = async (req, res) => {
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

    res.status(200).json({
      success: true,
      borrower
    });
  } catch (error) {
    console.error('Get borrower by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching borrower'
    });
  }
};

// @desc    Update borrower
// @route   PUT /api/borrowers/:id
// @access  Private
const updateBorrower = async (req, res) => {
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

    let { borrowerId, name, email, phone, studentId, department, address, membershipDate, status } = req.body;

    // Trim and normalize
    if (borrowerId !== undefined && typeof borrowerId === 'string') borrowerId = borrowerId.trim();
    if (name !== undefined && typeof name === 'string') name = name.trim();
    if (email !== undefined && typeof email === 'string') email = email.trim().toLowerCase();
    if (phone !== undefined && typeof phone === 'string') phone = phone.trim();
    if (studentId !== undefined && typeof studentId === 'string') studentId = studentId.trim();
    if (department !== undefined && typeof department === 'string') department = department.trim();
    if (address !== undefined && typeof address === 'string') address = address.trim();
    if (status !== undefined && typeof status === 'string') status = status.trim();

    // Convert empty strings to undefined for optional fields (so we can clear or ignore)
    // For update, if field is provided as empty string, treat as undefined -> remove? But spec says do not accidentally remove fields not included. So only if explicitly empty, we should clear? Better to treat empty string as undefined and unset.
    if (email === '') email = undefined;
    if (phone === '') phone = undefined;
    if (studentId === '') studentId = undefined;
    if (department === '') department = undefined;
    if (address === '') address = undefined;

    // Validate borrowerId if supplied cannot be empty
    if (borrowerId !== undefined && borrowerId === '') {
      return res.status(400).json({ success: false, message: 'Borrower ID cannot be empty' });
    }
    if (name !== undefined && name === '') {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    // Validate email if supplied
    if (email !== undefined && email !== null && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // Validate phone if supplied
    if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    // Validate status
    if (status !== undefined && status !== null && !['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or blocked'
      });
    }

    // Validate membershipDate
    let parsedMembershipDate;
    let membershipDateProvided = membershipDate !== undefined;
    if (membershipDateProvided) {
      if (membershipDate === null || membershipDate === '') {
        parsedMembershipDate = undefined;
      } else {
        parsedMembershipDate = new Date(membershipDate);
        if (isNaN(parsedMembershipDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid membership date'
          });
        }
      }
    }

    // Check uniqueness for borrowerId if changed
    if (borrowerId !== undefined && borrowerId !== borrower.borrowerId) {
      const dup = await Borrower.findOne({ borrowerId });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: 'Borrower ID already exists'
        });
      }
    }

    // Check duplicate email if changed (and email provided)
    if (email !== undefined) {
      // if email is undefined we are clearing, skip duplicate check
      if (email) {
        const emailLower = email.toLowerCase();
        // Find other borrower with same email
        const dupEmail = await Borrower.findOne({ email: emailLower, _id: { $ne: borrower._id } });
        if (dupEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }
    }

    // Check duplicate studentId if changed
    if (studentId !== undefined) {
      if (studentId) {
        const dupStudent = await Borrower.findOne({ studentId, _id: { $ne: borrower._id } });
        if (dupStudent) {
          return res.status(400).json({
            success: false,
            message: 'Student ID already exists'
          });
        }
      }
    }

    // Apply updates only if provided
    if (borrowerId !== undefined) borrower.borrowerId = borrowerId;
    if (name !== undefined) borrower.name = name;
    if (email !== undefined) borrower.email = email;
    if (phone !== undefined) borrower.phone = phone;
    if (studentId !== undefined) borrower.studentId = studentId;
    if (department !== undefined) borrower.department = department;
    if (address !== undefined) borrower.address = address;
    if (membershipDateProvided) borrower.membershipDate = parsedMembershipDate;
    if (status !== undefined) borrower.status = status;

    await borrower.save();

    res.status(200).json({
      success: true,
      message: 'Borrower updated successfully',
      borrower
    });
  } catch (error) {
    console.error('Update borrower error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message = `${field} already exists`;
      if (field === 'borrowerId') message = 'Borrower ID already exists';
      if (field === 'email') message = 'Email already exists';
      if (field === 'studentId') message = 'Student ID already exists';
      return res.status(400).json({
        success: false,
        message
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
      message: 'Server error while updating borrower'
    });
  }
};

// @desc    Delete borrower
// @route   DELETE /api/borrowers/:id
// @access  Private
const deleteBorrower = async (req, res) => {
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

    await Borrower.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Borrower deleted successfully'
    });
  } catch (error) {
    console.error('Delete borrower error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting borrower'
    });
  }
};

module.exports = {
  createBorrower,
  getAllBorrowers,
  getBorrowerById,
  updateBorrower,
  deleteBorrower
};
