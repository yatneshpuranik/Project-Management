import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Board from '../model/board.js';
import Task from '../model/task.js';
import User from '../model/userModel.js';
import BoardChatMessage from '../model/boardChatMessage.js';
import Notification from '../model/notification.js';
import { encryptId, decryptId, encryptUserIds } from '../utils/idCrypt.js';
import logger from '../utils/logger.js';

const console = {
  log: (...args) => logger.debug(...args),
  error: (...args) => logger.error(...args),
  warn: (...args) => logger.warn(...args),
  info: (...args) => logger.info(...args)
};

const activeUsers = new Map(); // Store active users per board (Keys: decrypted boardId)
const activeTaskUsers = new Map(); // Store active users per task (Keys: decrypted taskId)
const activeChatUsers = new Map(); // Store active chat users per board (Keys: decrypted boardId)
const userSockets = new Map(); // Store Map of decUserId -> Set of socketIds

let ioInstance;

export const getIo = () => ioInstance;

/**
 * Utility to emit event directly to all active socket connections of a specific user.
 */
export const emitToUser = (userId, eventName, data) => {
  const decUserId = decryptId(userId);
  const socketIds = userSockets.get(decUserId);
  if (socketIds) {
    socketIds.forEach((id) => {
      ioInstance.to(id).emit(eventName, data);
    });
  }
};

export const evictUserFromBoard = (boardId, userId) => {
  const decBoardId = decryptId(boardId);
  const decUserId = decryptId(userId);

  // Remove from activeUsers
  if (activeUsers.has(decBoardId)) {
    activeUsers.get(decBoardId).delete(decUserId);
    const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
      ...uVal,
      userId: encryptId(uId)
    }));
    ioInstance.to(`board-${decBoardId}`).emit('online-users', { users: onlineUsers });
  }

  // Remove from activeChatUsers
  if (activeChatUsers.has(decBoardId)) {
    activeChatUsers.get(decBoardId).delete(decUserId);
    const roomChat = `board-chat-${decBoardId}`;
    ioInstance.to(roomChat).emit('workspaceUserOffline', {
      boardId: encryptId(decBoardId),
      userId: encryptId(decUserId),
    });
  }

  const socketIds = userSockets.get(decUserId);
  if (socketIds) {
    socketIds.forEach((id) => {
      const clientSocket = ioInstance.sockets.sockets.get(id);
      if (clientSocket) {
        clientSocket.leave(`board-${decBoardId}`);
        clientSocket.leave(`board-chat-${decBoardId}`);
        if (clientSocket.joinedChats) {
          clientSocket.joinedChats.delete(decBoardId);
        }
        // Redirect client immediately via socket event
        clientSocket.emit('memberRemoved', {
          boardId: encryptId(decBoardId),
          memberId: encryptId(decUserId),
        });
      }
    });
  }
};

export const forceDisconnectUser = (userId, reason = 'Your account has been blocked') => {
  const decUserId = decryptId(userId);
  const socketIds = userSockets.get(decUserId);
  if (socketIds) {
    socketIds.forEach((id) => {
      const clientSocket = ioInstance?.sockets?.sockets?.get(id);
      if (clientSocket) {
        clientSocket.emit('blocked', { reason });
        clientSocket.disconnect(true);
      }
    });
  }
};

const extractBoardId = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (data.boardId) {
      if (typeof data.boardId === 'object') {
        return data.boardId._id || data.boardId.id || null;
      }
      return data.boardId;
    }
    return data._id || data.id || null;
  }
  return null;
};

const checkSocketBoardMembership = async (userId, decBoardId) => {
  if (!decBoardId || !userId) return false;
  try {
    const board = await Board.findById(decBoardId);
    if (!board) return false;
    return board.createdBy.toString() === userId || board.members.some(m => m.toString() === userId);
  } catch (e) {
    return false;
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token && socket.handshake.headers?.cookie) {
      const cookieString = socket.handshake.headers.cookie;
      const match = cookieString.match(/token=([^;]+)/);
      token = match ? match[1] : null;
    }

    if (!token) {
      throw new Error('Authentication token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw new Error('Invalid authentication token');
    }

    if (user.isBlocked) {
      throw new Error('User account is blocked');
    }

    socket.userId = user._id.toString();
    socket.userName = user.name;
    next();
  } catch (err) {
    console.error('Socket authentication failed:', err.message);
    next(new Error('Authentication error'));
  }
};

const setupSocket = (io) => {
  io.use(authenticateSocket);
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const connUserId = socket.userId;
    if (connUserId) {
      if (!userSockets.has(connUserId)) {
        userSockets.set(connUserId, new Set());
      }
      userSockets.get(connUserId).add(socket.id);
    }

    // User joins a board
    socket.on('join-board', async (data) => {
      const bId = extractBoardId(data);
      const decBoardId = decryptId(bId);
      const room = `board-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      if (!decBoardId || !mongoose.Types.ObjectId.isValid(decBoardId)) {
        socket.emit('error-msg', { message: 'Invalid board ID format' });
        return;
      }

      try {
        const board = await Board.findById(decBoardId);
        if (!board) {
          socket.emit('error-msg', { message: 'Board not found' });
          return;
        }

        const isMember =
          board.createdBy.toString() === decUserId ||
          board.members.some((member) => member.toString() === decUserId);

        if (!isMember) {
          socket.emit('error-msg', { message: 'Unauthorized board access' });
          return;
        }

        socket.join(room);
        socket.boardId = decBoardId;
        socket.userId = decUserId;

        // Track active users
        if (!activeUsers.has(decBoardId)) {
          activeUsers.set(decBoardId, new Map());
        }
        activeUsers.get(decBoardId).set(decUserId, {
          userName,
          socketId: socket.id,
          viewingTask: null,
          status: 'Online',
          lastActive: Date.now()
        });

        // Broadcast online users
        const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
          ...uVal,
          userId: encryptId(uId)
        }));
        io.to(room).emit('online-users', { users: onlineUsers });

        console.log(`User ${decUserId} joined board ${decBoardId}`);
      } catch (err) {
        console.error('Socket join-board validation error:', err);
        socket.emit('error-msg', { message: 'Internal socket error during validation' });
      }
    });

    // User leaves a board
    socket.on('leave-board', (data) => {
      const { boardId } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      const room = `board-${decBoardId}`;

      socket.leave(room);

      // Remove user from active users
      if (activeUsers.has(decBoardId)) {
        activeUsers.get(decBoardId).delete(decUserId);
        const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
          ...uVal,
          userId: encryptId(uId)
        }));
        io.to(room).emit('online-users', { users: onlineUsers });

        // Clean up empty board
        if (activeUsers.get(decBoardId).size === 0) {
          activeUsers.delete(decBoardId);
        }
      }

      console.log(`User ${decUserId} left board ${decBoardId}`);
    });

    // Task created
    socket.on('task-created', async (data) => {
      const { boardId, task } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('task-created', { task });
      console.log(`Task created in board ${decBoardId}:`, task.title);
    });

    // Task updated
    socket.on('task-updated', async (data) => {
      const { boardId, task } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('task-updated', { task });
      console.log(`Task updated in board ${decBoardId}:`, task.title);
    });

    // Task deleted
    socket.on('task-deleted', async (data) => {
      const { boardId, taskId } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('task-deleted', { taskId });
      console.log(`Task deleted from board ${decBoardId}: ${taskId}`);
    });

    // Task moved between statuses
    socket.on('task-moved', async (data) => {
      const { boardId, task, fromStatus, toStatus } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('task-moved', {
        task,
        fromStatus,
        toStatus,
      });
      console.log(
        `Task moved in board ${decBoardId}: ${fromStatus} -> ${toStatus}`
      );
    });

    // Typing indicator - user is editing
    socket.on('typing-start', async (data) => {
      const { boardId, taskId } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      const userName = socket.userName;

      socket.to(room).emit('typing-start', {
        userId: encryptId(decUserId),
        userName,
        taskId,
      });
    });

    // User stopped typing
    socket.on('typing-stop', async (data) => {
      const { boardId, taskId } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;

      socket.to(room).emit('typing-stop', {
        userId: encryptId(decUserId),
        taskId,
      });
    });

    // Board activity/comment
    socket.on('comment-added', async (data) => {
      const { boardId, taskId, comment } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;

      io.to(room).emit('comment-added', {
        taskId,
        comment,
      });

      console.log(`Comment added to task ${taskId}`);
    });

    // Camel-case Comment events for Feature 2
    socket.on('commentAdded', async (data) => {
      const { boardId, taskId, comment } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('commentAdded', { taskId, comment });
    });

    socket.on('commentUpdated', async (data) => {
      const { boardId, taskId, comment } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('commentUpdated', { taskId, comment });
    });

    socket.on('commentDeleted', async (data) => {
      const { boardId, taskId, commentId } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('commentDeleted', { taskId, commentId });
    });

    // Actionable Invitation events for Feature 1
    socket.on('invitationSent', (data) => {
      const { recipientId, notification } = data;
      // Direct emit instead of global broadcast
      emitToUser(recipientId, 'invitationSent', { recipientId, notification });
    });

    socket.on('invitationAccepted', async (data) => {
      const { boardId, taskId, notification } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('invitationAccepted', { taskId, notification });
    });

    socket.on('invitationRejected', async (data) => {
      const { boardId, taskId, notification } = data;
      const decBoardId = decryptId(boardId);
      const decUserId = socket.userId;
      if (!(await checkSocketBoardMembership(decUserId, decBoardId))) {
        return;
      }
      const room = `board-${decBoardId}`;
      io.to(room).emit('invitationRejected', { taskId, notification });
    });

    // Task Chat rooms & Group Chat events
    socket.on('taskChatJoined', async (data) => {
      const { taskId, boardId, taskTitle } = data;
      const decTaskId = decryptId(taskId);
      const decBoardId = decryptId(boardId);
      const room = `task-${decTaskId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      try {
        const task = await Task.findById(decTaskId);
        if (!task) {
          socket.emit('error-msg', { message: 'Task not found' });
          return;
        }

        const board = await Board.findById(task.boardId);
        if (!board) {
          socket.emit('error-msg', { message: 'Board not found' });
          return;
        }

        const isMember =
          board.createdBy.toString() === decUserId ||
          board.members.some((member) => member.toString() === decUserId);
        if (!isMember) {
          socket.emit('error-msg', { message: 'Unauthorized task chat access' });
          return;
        }

        socket.join(room);
        socket.taskId = decTaskId;

        if (decBoardId && activeUsers.has(decBoardId)) {
          const userEntry = activeUsers.get(decBoardId).get(decUserId);
          if (userEntry) {
            userEntry.viewingTask = taskTitle || 'Task Details';
            userEntry.lastActive = Date.now();
            const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
              ...uVal,
              userId: encryptId(uId)
            }));
            io.to(`board-${decBoardId}`).emit('online-users', { users: onlineUsers });
          }
        }

        if (!activeTaskUsers.has(decTaskId)) {
          activeTaskUsers.set(decTaskId, new Map());
        }
        activeTaskUsers.get(decTaskId).set(decUserId, { userName, socketId: socket.id });

        const activeUsersList = Array.from(activeTaskUsers.get(decTaskId).entries()).map(([uId, uVal]) => ({
          ...uVal,
          userId: encryptId(uId)
        }));
        io.to(room).emit('activeUsersUpdated', { taskId, users: activeUsersList });
        console.log(`User ${decUserId} joined task chat ${decTaskId}`);
      } catch (err) {
        console.error('Socket taskChatJoined validation error:', err);
        socket.emit('error-msg', { message: 'Internal socket error during task chat join' });
      }
    });

    socket.on('taskChatLeft', (data) => {
      const { taskId, boardId } = data;
      const decTaskId = decryptId(taskId);
      const decUserId = socket.userId;
      const decBoardId = decryptId(boardId);
      const room = `task-${decTaskId}`;

      socket.leave(room);

      if (decBoardId && activeUsers.has(decBoardId)) {
        const userEntry = activeUsers.get(decBoardId).get(decUserId);
        if (userEntry) {
          userEntry.viewingTask = null;
          userEntry.lastActive = Date.now();
          const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
            ...uVal,
            userId: encryptId(uId)
          }));
          io.to(`board-${decBoardId}`).emit('online-users', { users: onlineUsers });
        }
      }

      if (activeTaskUsers.has(decTaskId)) {
        activeTaskUsers.get(decTaskId).delete(decUserId);
        const activeUsersList = Array.from(activeTaskUsers.get(decTaskId).entries()).map(([uId, uVal]) => ({
          ...uVal,
          userId: encryptId(uId)
        }));
        io.to(room).emit('activeUsersUpdated', { taskId, users: activeUsersList });

        if (activeTaskUsers.get(decTaskId).size === 0) {
          activeTaskUsers.delete(decTaskId);
        }
      }
      socket.taskId = undefined;
      console.log(`User ${decUserId} left task chat ${decTaskId}`);
    });

    socket.on('chatMessageSent', (data) => {
      const { boardId, taskId, message } = data;
      const decTaskId = decryptId(taskId);
      const room = `task-${decTaskId}`;
      io.to(room).emit('chatMessageSent', { taskId, message });
    });

    socket.on('chatMessageEdited', (data) => {
      const { boardId, taskId, message } = data;
      const decTaskId = decryptId(taskId);
      const room = `task-${decTaskId}`;
      io.to(room).emit('chatMessageEdited', { taskId, message });
    });

    socket.on('chatMessageDeleted', (data) => {
      const { boardId, taskId, messageId } = data;
      const decTaskId = decryptId(taskId);
      const room = `task-${decTaskId}`;
      io.to(room).emit('chatMessageDeleted', { taskId, messageId });
    });

    socket.on('typingStarted', (data) => {
      const { boardId, taskId } = data;
      const decTaskId = decryptId(taskId);
      const decUserId = socket.userId;
      const decBoardId = decryptId(boardId);
      const room = `task-${decTaskId}`;
      const userName = socket.userName;

      socket.to(room).emit('typingStarted', { userId: encryptId(decUserId), userName, taskId });

      if (decBoardId && activeUsers.has(decBoardId)) {
        const userEntry = activeUsers.get(decBoardId).get(decUserId);
        if (userEntry) {
          userEntry.status = 'Typing...';
          userEntry.lastActive = Date.now();
          const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
            ...uVal,
            userId: encryptId(uId)
          }));
          io.to(`board-${decBoardId}`).emit('online-users', { users: onlineUsers });
        }
      }
    });

    socket.on('typingStopped', (data) => {
      const { boardId, taskId } = data;
      const decTaskId = decryptId(taskId);
      const decUserId = socket.userId;
      const decBoardId = decryptId(boardId);
      const room = `task-${decTaskId}`;
      const userName = socket.userName;

      socket.to(room).emit('typingStopped', { userId: encryptId(decUserId), userName, taskId });

      if (decBoardId && activeUsers.has(decBoardId)) {
        const userEntry = activeUsers.get(decBoardId).get(decUserId);
        if (userEntry) {
          userEntry.status = 'Online';
          userEntry.lastActive = Date.now();
          const onlineUsers = Array.from(activeUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
            ...uVal,
            userId: encryptId(uId)
          }));
          io.to(`board-${decBoardId}`).emit('online-users', { users: onlineUsers });
        }
      }
    });

    // Attachment uploaded
    socket.on('attachment-uploaded', (data) => {
      const { boardId, taskId, attachment } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-${decBoardId}`;

      io.to(room).emit('attachment-uploaded', { taskId, attachment });
      console.log(`Attachment uploaded in board ${decBoardId} for task ${taskId}`);
    });

    // Attachment deleted
    socket.on('attachment-deleted', (data) => {
      const { boardId, taskId, attachmentId } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-${decBoardId}`;

      io.to(room).emit('attachment-deleted', { taskId, attachmentId });
      console.log(`Attachment deleted in board ${decBoardId} for task ${taskId}`);
    });

    // Activity created
    socket.on('activity-created', (data) => {
      const bId = extractBoardId(data);
      const decBoardId = decryptId(bId);
      const room = `board-${decBoardId}`;

      if (!decBoardId || !mongoose.Types.ObjectId.isValid(decBoardId)) {
        return;
      }

      io.to(room).emit('activity-created', { activity: data.activity });
      console.log(`Activity created in board ${decBoardId}`);
    });

    // WORKSPACE CHAT EVENT HANDLERS
    socket.on('workspaceChatJoined', async (data) => {
      const bId = extractBoardId(data);
      const decBoardId = decryptId(bId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      if (!decBoardId || !mongoose.Types.ObjectId.isValid(decBoardId)) {
        socket.emit('error-msg', { message: 'Invalid board ID format' });
        return;
      }

      try {
        const board = await Board.findById(decBoardId);
        if (!board) {
          socket.emit('error-msg', { message: 'Board not found' });
          return;
        }

        const isMember =
          board.createdBy.toString() === decUserId ||
          board.members.some((member) => member.toString() === decUserId);

        if (!isMember) {
          socket.emit('error-msg', { message: 'Unauthorized chat access' });
          return;
        }

        socket.join(room);

        if (!socket.joinedChats) {
          socket.joinedChats = new Set();
        }
        socket.joinedChats.add(decBoardId);

        if (!activeChatUsers.has(decBoardId)) {
          activeChatUsers.set(decBoardId, new Map());
        }
        activeChatUsers.get(decBoardId).set(decUserId, {
          userName,
          socketId: socket.id,
        });

        // Emit workspaceUserOnline to others in the room
        io.to(room).emit('workspaceUserOnline', {
          boardId: encryptId(decBoardId),
          userId: encryptId(decUserId),
          userName,
        });

        // Send current list of online users in this chat room to the joiner
        const onlineUsersList = Array.from(activeChatUsers.get(decBoardId).entries()).map(([uId, uVal]) => ({
          userId: encryptId(uId),
          userName: uVal.userName,
        }));
        socket.emit('workspaceOnlineMembers', {
          boardId: encryptId(decBoardId),
          users: onlineUsersList,
        });

        console.log(`User ${decUserId} joined workspace chat ${decBoardId}`);
      } catch (err) {
        console.error('Socket workspaceChatJoined error:', err);
      }
    });

    socket.on('workspaceChatLeft', (data) => {
      const { boardId } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      socket.leave(room);

      if (socket.joinedChats) {
        socket.joinedChats.delete(decBoardId);
      }

      if (activeChatUsers.has(decBoardId)) {
        activeChatUsers.get(decBoardId).delete(decUserId);
        if (activeChatUsers.get(decBoardId).size === 0) {
          activeChatUsers.delete(decBoardId);
        }
      }

      io.to(room).emit('workspaceUserOffline', {
        boardId: encryptId(decBoardId),
        userId: encryptId(decUserId),
        userName,
      });

      console.log(`User ${decUserId} left workspace chat ${decBoardId}`);
    });

    socket.on('workspaceMessageSent', async (data) => {
      const { boardId, channel, content } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      if (!content || !content.trim()) return;

      try {
        const board = await Board.findById(decBoardId);
        if (!board) return;

        const isMember =
          board.createdBy.toString() === decUserId ||
          board.members.some((member) => member.toString() === decUserId);
        if (!isMember) return;

        const message = await BoardChatMessage.create({
          boardId: decBoardId,
          channel: channel || 'General',
          senderId: decUserId,
          senderName: userName,
          content: content.trim(),
          readBy: [userName],
        });

        const encryptedMsg = encryptUserIds(message);

        io.to(room).emit('workspaceMessageSent', {
          boardId: encryptId(decBoardId),
          message: encryptedMsg,
        });
      } catch (err) {
        console.error('Socket workspaceMessageSent error:', err);
      }
    });

    socket.on('workspaceMessageEdited', async (data) => {
      const { boardId, messageId, content } = data;
      const decBoardId = decryptId(boardId);
      const decMessageId = decryptId(messageId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;

      if (!content || !content.trim()) return;

      try {
        const message = await BoardChatMessage.findById(decMessageId);
        if (!message) return;
        if (message.senderId.toString() !== decUserId) return;

        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();

        const encryptedMsg = encryptUserIds(message);

        io.to(room).emit('workspaceMessageEdited', {
          boardId: encryptId(decBoardId),
          message: encryptedMsg,
        });
      } catch (err) {
        console.error('Socket workspaceMessageEdited error:', err);
      }
    });

    socket.on('workspaceMessageDeleted', async (data) => {
      const { boardId, messageId } = data;
      const decBoardId = decryptId(boardId);
      const decMessageId = decryptId(messageId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;

      try {
        const message = await BoardChatMessage.findById(decMessageId);
        if (!message) return;

        const board = await Board.findById(decBoardId);
        const isOwner = board && board.createdBy.toString() === decUserId;
        const isAuthor = message.senderId.toString() === decUserId;

        if (!isAuthor && !isOwner) return;

        await message.deleteOne();

        io.to(room).emit('workspaceMessageDeleted', {
          boardId: encryptId(decBoardId),
          messageId: encryptId(decMessageId),
        });
      } catch (err) {
        console.error('Socket workspaceMessageDeleted error:', err);
      }
    });

    socket.on('workspaceTypingStarted', (data) => {
      const { boardId, channel } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      socket.to(room).emit('workspaceTypingStarted', {
        boardId: encryptId(decBoardId),
        userId: encryptId(decUserId),
        userName,
        channel,
      });
    });

    socket.on('workspaceTypingStopped', (data) => {
      const { boardId, channel } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;

      socket.to(room).emit('workspaceTypingStopped', {
        boardId: encryptId(decBoardId),
        userId: encryptId(decUserId),
        channel,
      });
    });

    // Reactions Event Handlers
    socket.on('workspaceReactionAdded', async (data) => {
      const { boardId, messageId, emoji } = data;
      const decBoardId = decryptId(boardId);
      const decMessageId = decryptId(messageId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;
      const userName = socket.userName;

      try {
        const message = await BoardChatMessage.findById(decMessageId);
        if (!message) return;

        if (!message.reactions) {
          message.reactions = [];
        }
        if (!message.reactions.some(r => r.userId === decUserId && r.emoji === emoji)) {
          message.reactions.push({ userId: decUserId, userName, emoji });
          await message.save();

          io.to(room).emit('workspaceReactionAdded', {
            boardId: encryptId(decBoardId),
            messageId: encryptId(decMessageId),
            reaction: { userId: encryptId(decUserId), userName, emoji }
          });
        }
      } catch (err) {
        console.error('Socket workspaceReactionAdded error:', err);
      }
    });

    socket.on('workspaceReactionRemoved', async (data) => {
      const { boardId, messageId, emoji } = data;
      const decBoardId = decryptId(boardId);
      const decMessageId = decryptId(messageId);
      const room = `board-chat-${decBoardId}`;
      const decUserId = socket.userId;

      try {
        const message = await BoardChatMessage.findById(decMessageId);
        if (!message) return;

        if (message.reactions) {
          message.reactions = message.reactions.filter(r => !(r.userId === decUserId && r.emoji === emoji));
          await message.save();

          io.to(room).emit('workspaceReactionRemoved', {
            boardId: encryptId(decBoardId),
            messageId: encryptId(decMessageId),
            userId: encryptId(decUserId),
            emoji
          });
        }
      } catch (err) {
        console.error('Socket workspaceReactionRemoved error:', err);
      }
    });

    // Voice Channel Event Handlers
    socket.on('joinVoiceChannel', (data) => {
      const { boardId, channelName } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-voice-${decBoardId}-${channelName}`;
      
      // If already in a voice channel, leave it first
      if (socket.voiceChannel && socket.voiceBoardId) {
        const oldRoom = `board-voice-${socket.voiceBoardId}-${socket.voiceChannel}`;
        socket.leave(oldRoom);
        socket.to(`board-${socket.voiceBoardId}`).emit('userLeftVoice', {
          userId: encryptId(socket.userId),
          userName: socket.userName,
          channelName: socket.voiceChannel
        });
      }

      socket.join(room);
      socket.voiceChannel = channelName;
      socket.voiceBoardId = decBoardId;
      
      socket.to(`board-${decBoardId}`).emit('userJoinedVoice', {
        userId: encryptId(socket.userId),
        userName: socket.userName,
        channelName
      });
      console.log(`User ${socket.userId} joined voice channel ${channelName} in board ${decBoardId}`);
    });

    socket.on('leaveVoiceChannel', (data) => {
      const { boardId, channelName } = data;
      const decBoardId = decryptId(boardId);
      const room = `board-voice-${decBoardId}-${channelName}`;
      socket.leave(room);

      socket.voiceChannel = undefined;
      socket.voiceBoardId = undefined;

      socket.to(`board-${decBoardId}`).emit('userLeftVoice', {
        userId: encryptId(socket.userId),
        userName: socket.userName,
        channelName
      });
      console.log(`User ${socket.userId} left voice channel ${channelName} in board ${decBoardId}`);
    });

    socket.on('voiceStateUpdate', (data) => {
      const { boardId, channelName, isMuted, isCameraOn, isScreenSharing } = data;
      const decBoardId = decryptId(boardId);
      
      socket.to(`board-${decBoardId}`).emit('voiceStateUpdated', {
        userId: encryptId(socket.userId),
        userName: socket.userName,
        channelName,
        isMuted,
        isCameraOn,
        isScreenSharing
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id}`);

      // Leave voice channel if in one
      if (socket.voiceChannel && socket.voiceBoardId) {
        const room = `board-voice-${socket.voiceBoardId}-${socket.voiceChannel}`;
        socket.to(`board-${socket.voiceBoardId}`).emit('userLeftVoice', {
          userId: encryptId(socket.userId),
          userName: socket.userName,
          channelName: socket.voiceChannel
        });
        socket.voiceChannel = undefined;
        socket.voiceBoardId = undefined;
      }

      const dUserId = socket.userId;
      if (dUserId) {
        // Remove socket from userSockets
        if (userSockets.has(dUserId)) {
          userSockets.get(dUserId).delete(socket.id);
          if (userSockets.get(dUserId).size === 0) {
            userSockets.delete(dUserId);
            
            // Set User presence to Offline in database since last socket disconnected
            try {
              await User.findByIdAndUpdate(dUserId, { presenceStatus: 'Offline', lastActive: new Date() });
              
              // Broadcast presence offline to all their boards
              const boards = await Board.find({
                $or: [{ createdBy: dUserId }, { members: dUserId }]
              });
              boards.forEach(b => {
                socket.to(`board-${b._id.toString()}`).emit('presence-update', {
                  userId: encryptId(dUserId),
                  status: 'Offline',
                  lastActive: new Date()
                });
              });
            } catch (err) {
              console.error('Socket disconnect user presence update failed:', err);
            }
          }
        }

        // Clean up joined chats
        if (socket.joinedChats) {
          socket.joinedChats.forEach((decBoardId) => {
            if (activeChatUsers.has(decBoardId)) {
              activeChatUsers.get(decBoardId).delete(dUserId);
              if (activeChatUsers.get(decBoardId).size === 0) {
                activeChatUsers.delete(decBoardId);
              }
            }
            io.to(`board-chat-${decBoardId}`).emit('workspaceUserOffline', {
              boardId: encryptId(decBoardId),
              userId: encryptId(dUserId),
              userName: socket.userName,
            });
          });
        }
      }

      // Remove from active task users if present
      if (socket.taskId && socket.userId) {
        const taskId = socket.taskId;
        const room = `task-${taskId}`;
        if (activeTaskUsers.has(taskId)) {
          activeTaskUsers.get(taskId).delete(socket.userId);
          const activeUsersList = Array.from(activeTaskUsers.get(taskId).entries()).map(([uId, uVal]) => ({
            ...uVal,
            userId: encryptId(uId)
          }));
          io.to(room).emit('activeUsersUpdated', { taskId: encryptId(taskId), users: activeUsersList });
          if (activeTaskUsers.get(taskId).size === 0) {
            activeTaskUsers.delete(taskId);
          }
        }
      }

      // Remove user from all boards
      if (socket.boardId && socket.userId) {
        const boardId = socket.boardId;
        if (activeUsers.has(boardId)) {
          activeUsers.get(boardId).delete(socket.userId);
          const onlineUsers = Array.from(activeUsers.get(boardId).entries()).map(([uId, uVal]) => ({
            ...uVal,
            userId: encryptId(uId)
          }));
          io.to(`board-${boardId}`).emit('online-users', { users: onlineUsers });

          if (activeUsers.get(boardId).size === 0) {
            activeUsers.delete(boardId);
          }
        }
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error: ${error}`);
    });
  });
};

export default setupSocket;
