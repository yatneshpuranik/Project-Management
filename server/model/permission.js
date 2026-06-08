import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['ADMIN', 'WORKSPACE_OWNER', 'WORKSPACE_MEMBER', 'USER'],
    required: true,
    unique: true
  },
  canInvite: { type: Boolean, default: false },
  canRemoveMember: { type: Boolean, default: false },
  canTransferOwnership: { type: Boolean, default: false },
  canAssignTasks: { type: Boolean, default: false },
  canMoveTasks: { type: Boolean, default: false },
  canManageChannels: { type: Boolean, default: false },
  canDeleteWorkspace: { type: Boolean, default: false },
  canArchiveWorkspace: { type: Boolean, default: false },
  canModerateComments: { type: Boolean, default: false },
  canManagePermissions: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Permission', permissionSchema);
