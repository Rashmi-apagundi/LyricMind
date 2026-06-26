import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load Environment Variables FIRST (before anything else that reads process.env)
dotenv.config();

// ── Global safety net: prevent Spotify/MongoDB async errors from crashing the server ──
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection (non-fatal):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (non-fatal):', err.message);
});

import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import musicRoutes from './routes/musicRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl/Postman) or any localhost
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // support photo uploads up to 10MB if base64 encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'LyricMind AI Backend is running smoothly.' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({
    message: err.message || "An unexpected server error occurred."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
