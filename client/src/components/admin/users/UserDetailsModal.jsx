import UserRoleManager from './UserRoleManager';

const UserDetailsModal = ({
  selectedUser,
  onBlockToggle,
  onForceLogout,
  onResetAccess,
  onDeleteUser,
  onUpdateRole
}) => {
  if (!selectedUser) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs italic">
        Select a user from the list to view profile metadata and moderator options.
      </div>
    );
  }

  // Prevent admin from blocking/deleting self or the main admin email
  const isProtectedAdmin = selectedUser.email === 'yatnesh@admin.com';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-lg font-bold">
          {selectedUser.name?.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{selectedUser.name}</h3>
          <p className="text-[10px] text-slate-500 truncate">{selectedUser.email}</p>
        </div>
      </div>

      <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-slate-400">
        <p className="flex justify-between">
          <span>Presence:</span>
          <span className="font-semibold text-slate-300">{selectedUser.presenceStatus || 'Offline'}</span>
        </p>
        <p className="flex justify-between">
          <span>User ID:</span>
          <span className="font-semibold text-slate-400 truncate max-w-[150px]" title={selectedUser._id}>
            {selectedUser._id}
          </span>
        </p>
        <p className="flex justify-between">
          <span>Role:</span>
          <span className="font-semibold text-cyan-400">{selectedUser.role}</span>
        </p>
        {selectedUser.isBlocked && (
          <div className="bg-rose-500/5 border border-rose-500/20 p-2.5 rounded-xl text-[10px] text-rose-400">
            <strong>Blocked reason:</strong> "{selectedUser.reason || 'No reason provided.'}"
          </div>
        )}
      </div>

      {/* Admin User Actions */}
      {!isProtectedAdmin && (
        <div className="pt-4 border-t border-white/5 space-y-2.5">
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
              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
            >
              Force Logout
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onResetAccess(selectedUser._id)}
              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
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
