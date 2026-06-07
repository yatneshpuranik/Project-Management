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
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Middleware
app.set('trust proxy', 1)
app.use(cors({
  origin: process.env.FRONTEND_URL ,
  credentials: true,
}));
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
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
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