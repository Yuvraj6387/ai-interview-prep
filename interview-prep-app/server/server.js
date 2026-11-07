require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const jobProfileRoutes = require('./routes/jobProfiles');
const questionRoutes = require('./routes/questions');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interviews');
const builderRoutes = require('./routes/builder');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', jobProfileRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/builder', builderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Fail fast instead of letting a request hang on an unreachable cluster.
      serverSelectionTimeoutMS: 8000,
      // Keep sockets warm so the first request after an idle spell doesn't pay
      // to re-establish a connection on top of everything else.
      maxPoolSize: 10,
      minPoolSize: 2
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    // Don't exit: on a free plan a restart means another cold start for the
    // next visitor. Mongoose keeps retrying in the background.
    console.error('❌ MongoDB connection error:', error.message);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

// Listen first, connect after. The health check is what wakes a sleeping free
// instance, and it shouldn't have to wait on a database handshake to answer.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
