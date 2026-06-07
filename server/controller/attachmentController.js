import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Task from '../model/task.js';
import Attachment from '../model/attachment.js';
import Board from '../model/board.js';
import { createActivity } from './activityController.js';

export const uploadAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;
    const userName = req.userName || 'Unknown';

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Attachment file is required' });
    }

    const attachment = await Attachment.create({
      boardId: task.boardId,
      taskId,
      uploadedBy: userId,
      uploadedByName: userName,
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    task.attachments.push(attachment._id);
    await task.save();

    await createActivity({
      boardId: task.boardId,
      taskId,
      userId,
      userName,
      type: 'Attachment Uploaded',
      message: `${userName} uploaded ${req.file.originalname}`,
      meta: { attachmentId: attachment._id.toString() },
    });

    res.status(201).json({ message: 'Attachment uploaded successfully', attachment });
  } catch (error) {
    return res.status(500).json({ message: 'Error uploading attachment', error: error.message });
  }
};

export const getTaskAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId).populate('attachments');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.status(200).json({ message: 'Attachments fetched successfully', attachments: task.attachments });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching attachments', error: error.message });
  }
};

export const downloadAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
      return res.status(400).json({ message: 'Invalid attachment ID format' });
    }

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const board = await Board.findById(attachment.boardId);
    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const filename = path.basename(attachment.url);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.resolve(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(410).json({ message: 'Attachment file no longer exists' });
    }

    res.download(filePath, attachment.filename);
  } catch (error) {
    return res.status(500).json({ message: 'Error downloading attachment', error: error.message });
  }
};
