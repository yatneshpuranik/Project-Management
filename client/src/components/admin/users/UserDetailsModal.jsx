import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserRoleManager from './UserRoleManager';
import { HiOutlineUser, HiOutlineFolder, HiOutlineExternalLink } from 'react-icons/hi';

const UserDetailsModal = ({
  selectedUser,
  selectedUserDetails,
  onBlockToggle,
  onForceLogout,
  onResetAccess,
  onDeleteUser,
  onUpdateRole,
}) => {
  const navigate = useNavigate();
  const [showWorkspacesList, setShowWorkspacesList] = useState(false);

  if (!selectedUser) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs italic font-sans">
        Select a user from the list to view profile metadata and moderator options.
      </div>
    );
  }

  // Prevent admin from blocking/deleting self or any admin email ending with @admin.com
  const isProtectedAdmin = selectedUser.email && selectedUser.email.endsWith('@admin.com');

  const workspaces = selectedUserDetails?.workspaces || [];
  const tasks = selectedUserDetails?.tasks || [];
  
  const ownedWorkspaces = workspaces.filter(w => {
    const ownerId = w.createdBy?._id || w.createdBy;
    return ownerId?.toString() === selectedUser._id?.toString();
  });
  
  const joinedWorkspaces = workspaces.filter(w => {
    const ownerId = w.createdBy?._id || w.createdBy;
    return ownerId?.toString() !== selectedUser._id?.toString();
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center gap-3.5 border-b border-white/5 pb-3">
        <img
          src={selectedUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.name || '')}`}
          alt={selectedUser.name}
          className="h-12 w-12 rounded-full object-cover border border-white/10 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{selectedUser.name}</h3>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{selectedUser.email}</p>
        </div>
      </div>

      <div className="space-y-2.5 text-slate-400">
        <p className="flex justify-between">
          <span>Username:</span>
          <span className="font-semibold text-slate-200">{selectedUser.name}</span>
        </p>
        <p className="flex justify-between">
          <span>Role:</span>
          <span className="font-bold text-blue-500 uppercase tracking-wide text-[10px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
            {selectedUser.role}
          </span>
        </p>
        <p className="flex justify-between">
          <span>Presence Status:</span>
          <span className="font-semibold text-slate-300">{selectedUser.presenceStatus || 'Offline'}</span>
        </p>
        <p className="flex justify-between">
          <span>Last Active:</span>
          <span className="font-semibold text-slate-300">
            {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString() : 'N/A'}
          </span>
        </p>

        {selectedUserDetails ? (
          <>
            <p className="flex justify-between border-t border-white/5 pt-2">
              <span>Owned Workspaces:</span>
              <span className="font-bold text-white">{ownedWorkspaces.length}</span>
            </p>
            <p className="flex justify-between">
              <span>Joined Workspaces:</span>
              <span className="font-bold text-white">{joinedWorkspaces.length}</span>
            </p>
            <p className="flex justify-between">
              <span>Assigned Tasks:</span>
              <span className="font-bold text-sky-400">{tasks.length}</span>
            </p>
          </>
        ) : (
          <div className="py-2 text-center text-slate-600 text-[10px]">Loading workspace metrics...</div>
        )}

        {selectedUser.isBlocked && (
          <div className="bg-rose-500/5 border border-rose-500/20 p-2.5 rounded-xl text-[10px] text-rose-400">
            <strong>Blocked reason:</strong> "{selectedUser.reason || 'No reason provided.'}"
          </div>
        )}
      </div>

      {/* View Workspaces Button */}
      {selectedUserDetails && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <button
            onClick={() => setShowWorkspacesList(!showWorkspacesList)}
            className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition"
          >
            <HiOutlineFolder className="h-4 w-4" />
            {showWorkspacesList ? 'Hide Workspaces Directory' : 'View Workspaces Directory'}
          </button>

          {showWorkspacesList && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1 pt-1">
              {workspaces.length > 0 ? (
                workspaces.map((w) => (
                  <div
                    key={w._id}
                    onClick={() => navigate(`/admin/workspaces?boardId=${w._id}`)}
                    className="flex justify-between items-center p-2 rounded-xl bg-slate-950/70 border border-white/5 hover:border-blue-500/30 transition cursor-pointer"
                  >
                    <span className="truncate max-w-[170px] text-[11px] text-slate-300 font-semibold">{w.title}</span>
                    <span className="text-slate-500 flex items-center gap-0.5 text-[9px] font-black uppercase">
                      {w.createdBy?._id?.toString() === selectedUser._id?.toString() || w.createdBy?.toString() === selectedUser._id?.toString() ? 'Owner' : 'Member'}
                      <HiOutlineExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-650 italic text-[10px] text-center py-2">No workspaces associated.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin User Actions */}
      {!isProtectedAdmin && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Moderator Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBlockToggle(selectedUser._id, !selectedUser.isBlocked)}
              className={`py-1.5 rounded-xl text-[10px] font-bold transition border ${
                selectedUser.isBlocked 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'
              }`}
            >
              {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
            </button>
            <button
              onClick={() => onForceLogout(selectedUser._id)}
              className="py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/10"
            >
              Force Logout
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onResetAccess(selectedUser._id)}
              className="py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/10"
            >
              Reset Access
            </button>
            <button
              onClick={() => onDeleteUser(selectedUser._id)}
              className="py-1.5 bg-rose-500/20 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold transition"
            >
              Delete User
            </button>
          </div>

          {/* Role modification */}
          <UserRoleManager selectedUser={selectedUser} onUpdateRole={onUpdateRole} />
        </div>
      )}
    </div>
  );
};

export default UserDetailsModal;
