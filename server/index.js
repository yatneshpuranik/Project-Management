import express from "express";
import path from "path";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDb from "./configFiles/db.js";
import userRoute from "./route/userRoute.js";
import boardRoute from "./route/boardRoute.js";
import taskRoute from "./route/taskRoute.js";
import attachmentRoute from "./route/attachmentRoute.js";
import activityRoute from "./route/activityRoute.js";
import analyticsRoute from "./route/analyticsRoute.js";
import notificationRoute from "./route/notificationRoute.js";
import adminRoute from "./route/admin/adminRoutes.js";
import searchRoute from "./route/searchRoute.js";
import setupSocket from "./socket/socket.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { decryptionMiddleware } from "./utils/idCrypt.js";

dotenv.config();

const validateEnv = () => {
  const missing = []
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET')
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) missing.push('MONGO_URI or MONGODB_URI')
  if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL')
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '))
    process.exit(1)
  }
}

validateEnv()

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    if (allowedOrigins.indexOf(origin) !== -1 || isLocal) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

// Middleware
app.set('trust proxy', 1);

// Manual Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss: http: https:;");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.removeHeader('X-Powered-By');
  next();
});

// Global Request Sanitizer (NoSQL injection, Prototype Pollution, XSS)
const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeRequestData = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (
        key === '__proto__' || 
        key === 'constructor' || 
        key === 'prototype' || 
        key.startsWith('$') || 
        key.includes('.')
      ) {
        delete obj[key];
      } else if (typeof obj[key] === 'string') {
        if (!['password', 'token', 'inviteToken', 'invitationToken'].includes(key)) {
          obj[key] = escapeHtml(obj[key].trim());
        }
      } else if (typeof obj[key] === 'object') {
        sanitizeRequestData(obj[key]);
      }
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeRequestData(req.body);
  if (req.query) sanitizeRequestData(req.query);
  if (req.params) sanitizeRequestData(req.params);
  next();
});

// Memory Rate Limiter
const rateLimitStore = new Map();
const rateLimiter = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, []);
    }
    
    const timestamps = rateLimitStore.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.'
      });
    }
    next();
  };
};

app.use('/api/user/login', rateLimiter(10, 60 * 1000));
app.use('/api/user/register', rateLimiter(5, 60 * 1000));
app.use('/api/user/resend-verification', rateLimiter(3, 60 * 1000));

app.use(cors(corsOptions));
app.use(express.json());
app.use(decryptionMiddleware);
app.use(cookieParser());

// Routes
app.use("/api/user", userRoute);
app.use("/api/boards", boardRoute);
app.use("/api/workspaces", boardRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/attachments", attachmentRoute);
app.use("/api/activity", activityRoute);
app.use("/api/analytics", analyticsRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/search", searchRoute);

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io Setup
setupSocket(io);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

import logger from "./utils/logger.js";

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }

  // Mongoose Cast Error (Invalid ID formats)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data format'
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
  });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges.`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use. Stop the running process or set PORT to a free port.`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('listening', () => {
  // Silenced duplicate log
});

const startServer = async () => {
  try {
    await connectDb()

    // Initialize Permanent Admin Account
    try {
      const User = (await import('./model/userModel.js')).default;
      const bcrypt = await import('bcryptjs');
      const adminEmail = 'yatneshpuranik@asadmin.com';
      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        const hashedPassword = await bcrypt.default.hash('yatneshpuranik_14/11', 10);
        admin = new User({
          name: 'Administrator',
          username: 'admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          isVerified: true,
          isRegistered: true,
        });
        await admin.save();
        console.log('Permanent Admin account initialized successfully.');
      }
    } catch (adminErr) {
      console.error('Error initializing admin account:', adminErr);
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Socket.io Ready`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message || error)
    process.exit(1)
  }
}

startServer()