import Permission from '../model/permission.js';
import Board from '../model/board.js';
import User from '../model/userModel.js';

export const seedPermissions = async () => {
  try {
    const defaults = [
      {
        role: 'ADMIN',
        canInvite: true, canRemoveMember: true, canTransferOwnership: true, canAssignTasks: true,
        canMoveTasks: true, canManageChannels: true, canDeleteWorkspace: true, canArchiveWorkspace: true,
        canModerateComments: true, canManagePermissions: true
      },
      {
        role: 'WORKSPACE_OWNER',
        canInvite: true, canRemoveMember: true, canTransferOwnership: true, canAssignTasks: true,
        canMoveTasks: true, canManageChannels: true, canDeleteWorkspace: true, canArchiveWorkspace: true,
        canModerateComments: true, canManagePermissions: false
      },
      {
        role: 'WORKSPACE_MEMBER',
        canInvite: false, canRemoveMember: false, canTransferOwnership: false, canAssignTasks: false,
        canMoveTasks: true, canManageChannels: false, canDeleteWorkspace: false, canArchiveWorkspace: false,
        canModerateComments: false, canManagePermissions: false
      },
      {
        role: 'USER',
        canInvite: false, canRemoveMember: false, canTransferOwnership: false, canAssignTasks: false,
        canMoveTasks: false, canManageChannels: false, canDeleteWorkspace: false, canArchiveWorkspace: false,
        canModerateComments: false, canManagePermissions: false
      }
    ];

    for (const def of defaults) {
      await Permission.findOneAndUpdate({ role: def.role }, def, { upsert: true, new: true });
    }
    console.log('Seeded roles and permissions matrix defaults successfully.');
  } catch (err) {
    console.error('Failed to seed permissions:', err);
  }
};

export const checkPermission = async (userId, boardId, permissionName) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    if (user.role === 'ADMIN') return true;

    let role = 'USER';

    if (boardId) {
      const board = await Board.findById(boardId);
      if (board) {
        const isOwner = (board.createdBy?._id || board.createdBy || '').toString() === userId.toString();
        const isMember = board.members.some(m => (m?._id || m || '').toString() === userId.toString());
        
        if (isOwner) {
          role = 'WORKSPACE_OWNER';
        } else if (isMember) {
          role = 'WORKSPACE_MEMBER';
        }
      }
    }

    const perm = await Permission.findOne({ role });
    if (!perm) return false;

    return !!perm[permissionName];
  } catch (err) {
    console.error('Error checking permission:', err);
    return false;
  }
};
