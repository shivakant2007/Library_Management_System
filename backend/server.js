const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const bookRoutes = require('./src/routes/bookRoutes');
const borrowerRoutes = require('./src/routes/borrowerRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const qrRoutes = require('./src/routes/qrRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const User = require('./src/models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route (preserve)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management System API is running'
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Book routes (protected)
app.use('/api/books', bookRoutes);

// Borrower routes (protected)
app.use('/api/borrowers', borrowerRoutes);

// Transaction routes (protected)
app.use('/api/transactions', transactionRoutes);

// QR routes (protected)
app.use('/api/qr', qrRoutes);

// Report routes (protected)
app.use('/api/reports', reportRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Function to create initial admin from ENV if not exists
const createInitialAdmin = async () => {
  try {
    const { ADMIN_NAME, ADMIN_USER_ID, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    // If env vars not provided, do not create admin automatically
    if (!ADMIN_NAME || !ADMIN_USER_ID || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return;
    }

    // Check whether an admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists, skipping creation');
      return;
    }

    // Check duplicate userId/email before creating
    const dupUserId = await User.findOne({ userId: ADMIN_USER_ID });
    if (dupUserId) {
      console.log('ADMIN_USER_ID already exists, cannot create admin');
      return;
    }
    const dupEmail = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (dupEmail) {
      console.log('ADMIN_EMAIL already exists, cannot create admin');
      return;
    }

    await User.create({
      name: ADMIN_NAME,
      userId: ADMIN_USER_ID,
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'admin'
    });

    console.log(`Initial admin created: ${ADMIN_USER_ID} (${ADMIN_EMAIL})`);
    // Never log password
  } catch (error) {
    console.error('Failed to create initial admin:', error.message);
  }
};

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Wait a bit for DB to connect, then try admin creation
  // In case DB connection is async, ensure mongoose is ready
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    await createInitialAdmin();
  } else {
    mongoose.connection.once('open', createInitialAdmin);
  }
});
