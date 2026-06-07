import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: null,
  },
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  randomizationFactor: 0.5,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connect error:', error.message || error);
});

socket.on('reconnect_attempt', (attempt) => {
  console.info('Socket reconnect attempt:', attempt);
});

socket.on('reconnect_error', (error) => {
  console.error('Socket reconnect error:', error.message || error);
});

socket.on('reconnect_failed', () => {
  console.error('Socket reconnection failed');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('Socket connection skipped: no auth token found');
    return;
  }

  socket.auth = { token };
  if (!socket.connected && !socket.connecting) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected || socket.connecting) {
    socket.disconnect();
  }
};

export default socket;
