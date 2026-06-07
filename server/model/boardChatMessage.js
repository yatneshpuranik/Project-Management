import mongoose from 'mongoose';

const boardChatMessageSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['General', 'Development', 'Testing', 'Announcements'],
      default: 'General',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    readBy: [
      {
        type: String,
        trim: true,
      },
    ],
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('BoardChatMessage', boardChatMessageSchema);
