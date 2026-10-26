const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback to current working directory .env

const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const dbState = readyStates[mongoose.connection.readyState] || 'unknown';
  const isConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      connected: isConnected,
      state: dbState,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    },
    message: isConnected
      ? 'TaskFlow backend and MongoDB database are healthy'
      : 'Server is running, but MongoDB is not connected. Configure MONGODB_URI in backend/.env'
  });
});

// API Routes
app.use('/api/tasks', taskRoutes);

// Fallback to serve index.html for frontend routing (if accessed directly)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint '${req.originalUrl}' not found`
    });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Connect to MongoDB & Start Server
const connectDatabase = async () => {
  if (!MONGODB_URI || MONGODB_URI.includes('your_mongodb_connection_string')) {
    console.warn('\n===================================================================');
    console.warn('⚠️  MONGODB_URI is not configured in backend/.env');
    console.warn('-------------------------------------------------------------------');
    console.warn('To connect to MongoDB Atlas:');
    console.warn('1. Create a free database at https://www.mongodb.com/cloud/atlas');
    console.warn('2. Copy your connection string into backend/.env:');
    console.warn('   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/taskflow');
    console.warn('3. Ensure your IP (or 0.0.0.0/0) is whitelisted in Atlas Network Access');
    console.warn('===================================================================\n');
    return;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Successfully connected to database: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[MongoDB] Initial connection error: ${err.message}`);
    console.error('Please verify your connection string, username, password, and IP whitelist in MongoDB Atlas.');
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost');
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Connection restored');
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  connectDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`\n===================================================================`);
      console.log(`🚀 TaskFlow Server running at: http://localhost:${PORT}`);
      console.log(`📋 Frontend UI: http://localhost:${PORT}`);
      console.log(`🩺 Health API:  http://localhost:${PORT}/api/health`);
      console.log(`📌 Tasks API:   http://localhost:${PORT}/api/tasks`);
      console.log(`===================================================================\n`);
    });
  });
}

module.exports = app;
