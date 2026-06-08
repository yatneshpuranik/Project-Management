import { useState, useEffect } from 'react';
import { HiOutlineFolder, HiOutlineClipboardList, HiOutlineTrash, HiOutlineCheck } from 'react-icons/hi';
import axiosInstance from '../../../../utils/axiosInstance';
import { toast } from '../../../../utils/toast.js';

const WorkspaceDetailsModal = ({
  selectedWorkspace,
  onArchiveToggle,
  onDeleteWorkspace,
  onForceAddMember,
  onForceRemoveMember,
  onTransferOwnership,
  onRefreshWorkspace // Callback to trigger reload in parent
}) => {
  const [forceAddQuery, setForceAddQuery] = useState('');
  const [forceAddSuggestions, setForceAddSuggestions] = useState([]);
  const [selectedForceAddUser, setSelectedForceAddUser] = useState(null);
  const [isSearchingForceAdd, setIsSearchingForceAdd] = useState(false);

  const [transferQuery, setTransferQuery] = useState('');
  const [transferSuggestions, setTransferSuggestions] = useState([]);
  const [selectedTransferUser, setSelectedTransferUser] = useState(null);
  const [isSearchingTransfer, setIsSearchingTransfer] = useState(false);

  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // Debounced search for Force Add Member
  useEffect(() => {
    if (!forceAddQuery.trim() || !selectedWorkspace?._id) {
      setForceAddSuggestions([]);
      return;
    }
    setIsSearchingForceAdd(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(forceAddQuery)}&boardId=${selectedWorkspace._id}`);
        setForceAddSuggestions(response.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingForceAdd(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [forceAddQuery, selectedWorkspace?._id]);

  // Debounced search for Transfer Ownership
  useEffect(() => {
    if (!transferQuery.trim()) {
      setTransferSuggestions([]);
      return;
    }
    setIsSearchingTransfer(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(transferQuery)}`);
        setTransferSuggestions(response.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingTransfer(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [transferQuery]);

  if (!selectedWorkspace) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs italic font-sans">
        Select a workspace from the list to view members directory and moderation tools.
      </div>
    );
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task permanently?')) return;
    setDeletingTaskId(taskId);
    try {
      await axiosInstance.delete(`/admin/tasks/${taskId}`);
      toast.success('Task deleted successfully');
      if (onRefreshWorkspace) {
        onRefreshWorkspace(selectedWorkspace);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const tasks = selectedWorkspace.tasks || [];
  const statusColors = {
    Todo: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    'In Progress': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Review: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Done: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };

  return (
    <div className="space-y-5 font-sans">
      <div className="flex items-center gap-3.5 border-b border-white/5 pb-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
          <HiOutlineFolder className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{selectedWorkspace.title}</h3>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            Owner: <span className="text-slate-300 font-semibold">{selectedWorkspace.createdBy?.name || 'Owner'}</span>
          </p>
        </div>
      </div>

      {selectedWorkspace.description && (
        <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 italic leading-relaxed">
          "{selectedWorkspace.description}"
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-bold text-slate-500">
        <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
          <p>Members</p>
          <p className="text-sm font-black text-white mt-1">{selectedWorkspace.members?.length || 0}</p>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
          <p>Tasks</p>
          <p className="text-sm font-black text-white mt-1">{tasks.length}</p>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
          <p>Channels</p>
          <p className="text-sm font-black text-white mt-1">{selectedWorkspace.channels?.length || 0}</p>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2 text-xs">
        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Workspace Members</p>
        <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
          {selectedWorkspace.members && selectedWorkspace.members.length > 0 ? (
            selectedWorkspace.members.map((m) => (
              <div key={m._id} className="flex justify-between items-center p-2 rounded-xl bg-slate-950/80 border border-white/5">
                <span className="truncate max-w-[150px] font-semibold text-[11px] text-slate-300" title={m.name}>
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

      {/* Tasks List */}
      <div className="space-y-2 text-xs">
        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Workspace Tasks</p>
        <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <div key={t._id} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold text-[11px] text-white leading-normal truncate max-w-[160px]" title={t.title}>
                    {t.title}
                  </span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded capitalize ${statusColors[t.status] || 'bg-slate-500/10 text-slate-400'}`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500">
                  <span>Progress: <strong className="text-sky-400">{t.progress}%</strong></span>
                  <button
                    disabled={deletingTaskId === t._id}
                    onClick={() => handleDeleteTask(t._id)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    title="Delete Task"
                  >
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic text-[10px]">No tasks inside this workspace.</p>
          )}
        </div>
      </div>

      {/* Workspace Admin Actions */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Actions</p>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onArchiveToggle(selectedWorkspace._id, !selectedWorkspace.isArchived)}
            className="py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/10"
          >
            {selectedWorkspace.isArchived ? 'Restore Board' : 'Archive Board'}
          </button>
          <button
            onClick={() => onDeleteWorkspace(selectedWorkspace._id)}
            className="py-2 bg-rose-500/20 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold transition"
          >
            Delete Board
          </button>
        </div>

        {/* Force Add Member */}
        <div className="space-y-1 text-left">
          <label className="block text-[9px] uppercase font-bold text-slate-500">Force Add Member</label>
          {selectedForceAddUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={selectedForceAddUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedForceAddUser.name)}`}
                  alt={selectedForceAddUser.name}
                  className="h-6 w-6 rounded-full border border-white/10"
                />
                <div>
                  <p className="font-bold text-white leading-tight">{selectedForceAddUser.name}</p>
                  <p className="text-[9px] text-slate-500 leading-none mt-0.5">{selectedForceAddUser.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    onForceAddMember(selectedWorkspace._id, selectedForceAddUser._id);
                    setSelectedForceAddUser(null);
                    setForceAddQuery('');
                  }}
                  className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  Inject
                </button>
                <button
                  onClick={() => setSelectedForceAddUser(null)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                value={forceAddQuery}
                onChange={(e) => setForceAddQuery(e.target.value)}
                placeholder="Search user to add..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
              />
              {isSearchingForceAdd && (
                <div className="absolute right-3 top-2 text-[9px] text-slate-500">Searching...</div>
              )}
              {forceAddSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto border border-white/10 bg-slate-950 rounded-xl z-50 p-1 space-y-0.5 shadow-2xl custom-scrollbar">
                  {forceAddSuggestions.map((usr) => (
                    <button
                      key={usr._id}
                      onClick={() => {
                        setSelectedForceAddUser(usr);
                        setForceAddSuggestions([]);
                      }}
                      className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg text-left"
                    >
                      <img
                        src={usr.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(usr.name)}`}
                        alt={usr.name}
                        className="h-5 w-5 rounded-full border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-[11px] truncate leading-tight">{usr.name}</p>
                        <p className="text-slate-500 text-[9px] truncate leading-none mt-0.5">{usr.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transfer ownership */}
        <div className="space-y-1 text-left">
          <label className="block text-[9px] uppercase font-bold text-slate-500">Transfer Ownership</label>
          {selectedTransferUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={selectedTransferUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedTransferUser.name)}`}
                  alt={selectedTransferUser.name}
                  className="h-6 w-6 rounded-full border border-white/10"
                />
                <div>
                  <p className="font-bold text-white leading-tight">{selectedTransferUser.name}</p>
                  <p className="text-[9px] text-slate-500 leading-none mt-0.5">{selectedTransferUser.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    onTransferOwnership(selectedWorkspace._id, selectedTransferUser._id);
                    setSelectedTransferUser(null);
                    setTransferQuery('');
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-955 font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  Transfer
                </button>
                <button
                  onClick={() => setSelectedTransferUser(null)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                value={transferQuery}
                onChange={(e) => setTransferQuery(e.target.value)}
                placeholder="Search new owner..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
              />
              {isSearchingTransfer && (
                <div className="absolute right-3 top-2 text-[9px] text-slate-500">Searching...</div>
              )}
              {transferSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto border border-white/10 bg-slate-950 rounded-xl z-50 p-1 space-y-0.5 shadow-2xl custom-scrollbar">
                  {transferSuggestions.map((usr) => (
                    <button
                      key={usr._id}
                      onClick={() => {
                        setSelectedTransferUser(usr);
                        setTransferSuggestions([]);
                      }}
                      className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg text-left"
                    >
                      <img
                        src={usr.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(usr.name)}`}
                        alt={usr.name}
                        className="h-5 w-5 rounded-full border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-[11px] truncate leading-tight">{usr.name}</p>
                        <p className="text-slate-500 text-[9px] truncate leading-none mt-0.5">{usr.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDetailsModal;
