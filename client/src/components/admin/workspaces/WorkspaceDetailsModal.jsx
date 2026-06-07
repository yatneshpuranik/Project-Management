import { useState } from 'react';
import { HiOutlineFolder } from 'react-icons/hi';

const WorkspaceDetailsModal = ({
  selectedWorkspace,
  onArchiveToggle,
  onDeleteWorkspace,
  onForceAddMember,
  onForceRemoveMember,
  onTransferOwnership
}) => {
  const [forceAddUserId, setForceAddUserId] = useState('');
  const [transferOwnerId, setTransferOwnerId] = useState('');

  if (!selectedWorkspace) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs italic">
        Select a workspace from the list to view members directory and moderation tools.
      </div>
    );
  }

  const handleInject = (e) => {
    e.preventDefault();
    if (!forceAddUserId.trim()) return;
    onForceAddMember(selectedWorkspace._id, forceAddUserId);
    setForceAddUserId('');
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    if (!transferOwnerId.trim()) return;
    onTransferOwnership(selectedWorkspace._id, transferOwnerId);
    setTransferOwnerId('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <HiOutlineFolder className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{selectedWorkspace.title}</h3>
          <p className="text-[10px] text-slate-500 truncate">Owner: {selectedWorkspace.createdBy?.name || 'Owner'}</p>
        </div>
      </div>

      {selectedWorkspace.description && (
        <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 italic">
          "{selectedWorkspace.description}"
        </p>
      )}

      <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-slate-400">
        <p className="flex justify-between">
          <span>Workspace ID:</span>
          <span className="font-semibold text-slate-400 truncate max-w-[150px]" title={selectedWorkspace._id}>
            {selectedWorkspace._id}
          </span>
        </p>
        <p className="flex justify-between">
          <span>Members count:</span>
          <span className="font-semibold text-slate-300">{selectedWorkspace.members?.length || 0}</span>
        </p>
        <p className="flex justify-between">
          <span>Channels count:</span>
          <span className="font-semibold text-slate-300">{selectedWorkspace.channels?.length || 0}</span>
        </p>
      </div>

      {/* Members list force management */}
      <div className="space-y-2 text-xs">
        <p className="font-bold text-slate-400">Current Members ({selectedWorkspace.members?.length || 0})</p>
        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
          {selectedWorkspace.members && selectedWorkspace.members.length > 0 ? (
            selectedWorkspace.members.map((m) => (
              <div key={m._id} className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-white/5">
                <span className="truncate max-w-[150px] font-semibold text-[11px]" title={m.name}>
                  {m.name}
                </span>
                {selectedWorkspace.createdBy?._id !== m._id && (
                  <button
                    onClick={() => onForceRemoveMember(selectedWorkspace._id, m._id)}
                    className="text-rose-400 hover:underline text-[10px] font-bold"
                  >
                    Evict
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic text-[10px]">No members inside this workspace.</p>
          )}
        </div>
      </div>

      {/* Workspace Admin Actions */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Actions</p>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onArchiveToggle(selectedWorkspace._id, !selectedWorkspace.isArchived)}
            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
          >
            {selectedWorkspace.isArchived ? 'Restore Board' : 'Archive Board'}
          </button>
          <button
            onClick={() => onDeleteWorkspace(selectedWorkspace._id)}
            className="py-1.5 bg-rose-500/20 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold transition"
          >
            Delete Board
          </button>
        </div>

        {/* Force Add Member */}
        <form onSubmit={handleInject} className="space-y-1">
          <label className="block text-[9px] uppercase font-bold text-slate-500">Force Add Member (User ID)</label>
          <div className="flex gap-2">
            <input
              value={forceAddUserId}
              onChange={(e) => setForceAddUserId(e.target.value)}
              placeholder="Paste User ID..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-xl transition"
            >
              Inject
            </button>
          </div>
        </form>

        {/* Transfer ownership */}
        <form onSubmit={handleTransfer} className="space-y-1">
          <label className="block text-[9px] uppercase font-bold text-slate-500">Transfer Ownership (User ID)</label>
          <div className="flex gap-2">
            <input
              value={transferOwnerId}
              onChange={(e) => setTransferOwnerId(e.target.value)}
              placeholder="Paste User ID..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-xl transition"
            >
              Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceDetailsModal;
