import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateBoard, fetchBoardById } from '../redux/boardSlice';
import axiosInstance from '../utils/axiosInstance';
import { HiOutlineUserGroup, HiOutlineBell, HiOutlineCog, HiOutlineHashtag, HiOutlinePlus, HiOutlineTrash, HiOutlineLockOpen, HiOutlineLockClosed, HiOutlineUserRemove, HiOutlineShieldCheck } from 'react-icons/hi';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { currentBoard } = useSelector((state) => state.boards);
  const currentUserId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const isOwner = currentBoard && (
    currentBoard.createdBy?._id === currentUserId ||
    currentBoard.createdBy === currentUserId ||
    userRole === 'ADMIN'
  );

  useEffect(() => {
    if (currentBoard) {
      setTitle(currentBoard.title || '');
      setDescription(currentBoard.description || '');
      setVisibility(currentBoard.visibility || 'private');
      setChannels(currentBoard.channels || ['general', 'development', 'testing', 'announcements']);
    }
  }, [currentBoard]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!currentBoard?._id) return;
    setLoading(true);
    setMessage(null);
    try {
      await dispatch(updateBoard({
        boardId: currentBoard._id,
        data: {
          title: title.trim(),
          description: description.trim(),
          visibility,
          channels
        }
      })).unwrap();
      
      setMessage({ type: 'success', text: 'Workspace settings updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Failed to update settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = () => {
    const cleanName = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanName) return;
    if (channels.includes(cleanName)) {
      alert('Channel already exists');
      return;
    }
    setChannels(prev => [...prev, cleanName]);
    setNewChannelName('');
  };

  const handleDeleteChannel = (ch) => {
    if (ch === 'general') {
      alert('The #general channel cannot be deleted.');
      return;
    }
    setChannels(prev => prev.filter(c => c !== ch));
  };

  const handlePromoteUser = async (userId) => {
    try {
      await axiosInstance.post(`/user/promote/${userId}`);
      alert('User promoted to Owner role successfully.');
      if (currentBoard?._id) dispatch(fetchBoardById(currentBoard._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to promote user');
    }
  };

  const handleDemoteUser = async (userId) => {
    try {
      await axiosInstance.post(`/user/demote/${userId}`);
      alert('User demoted to Member role successfully.');
      if (currentBoard?._id) dispatch(fetchBoardById(currentBoard._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to demote user');
    }
  };

  if (!currentBoard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-900/20 p-12 text-center text-slate-300 shadow-2xl backdrop-blur-sm">
          <p className="text-lg font-semibold text-white">No active workspace selected</p>
          <p className="mt-3 text-sm text-slate-400">Please select a workspace board from the dashboard first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <HiOutlineCog className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Workspace Management</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{currentBoard.title} Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Workspace Owner: <strong className="text-sky-400">{currentBoard.createdBy?.name || 'Unknown'}</strong>
            </p>
          </div>
        </div>
      </header>

      {message && (
        <div className={`rounded-xl border p-4 text-xs font-semibold ${
          message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* General Details */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white">General Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Name</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isOwner}
                placeholder="Workspace name"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-sky-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isOwner}
                rows={3}
                placeholder="Scope and description..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-sky-500 disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        {/* Visibility / Access Control */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white">Visibility & Discovery</h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
            <div className="flex items-start gap-3">
              {visibility === 'public' ? (
                <HiOutlineLockOpen className="h-5 w-5 text-emerald-400 mt-0.5" />
              ) : (
                <HiOutlineLockClosed className="h-5 w-5 text-indigo-400 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold text-white">Workspace Visibility</p>
                <p className="text-[10px] text-slate-500">Public workspaces allow members to join directly. Private workspaces require access approval.</p>
              </div>
            </div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              disabled={!isOwner}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 disabled:opacity-50"
            >
              <option value="private">Private (Invite / Access Request)</option>
              <option value="public">Public (Open joining)</option>
            </select>
          </div>
        </section>

        {/* Channels List */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Workspace Chat Channels</h3>
            <p className="text-[10px] text-slate-400">Add or remove communications channels for this workspace.</p>
          </div>

          <div className="space-y-3">
            {/* Dynamic list */}
            <div className="grid gap-2 sm:grid-cols-2">
              {channels.map((ch) => (
                <div key={ch} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <HiOutlineHashtag className="h-4 w-4 text-slate-500" />
                    <span>{ch}</span>
                  </div>
                  {isOwner && ch !== 'general' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(ch)}
                      className="p-1 hover:bg-slate-900 text-slate-500 hover:text-rose-400 rounded transition"
                    >
                      <HiOutlineTrash className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Input to add */}
            {isOwner && (
              <div className="flex gap-2 pt-2">
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="New channel name (e.g. design)"
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1"
                >
                  <HiOutlinePlus className="h-4.5 w-4.5" /> Add
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Member Access Management (Owner-only) */}
        {isOwner && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Role Promotion & Access Control</h3>
              <p className="text-[10px] text-slate-400">Manage member privileges globally from this workspace.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[currentBoard.createdBy, ...currentBoard.members].filter(Boolean).map((member) => {
                const isSelf = member._id === currentUserId;
                const isMemberOwner = member.role === 'OWNER';
                return (
                  <div key={member._id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{member.name}</p>
                      <p className="text-[10px] text-slate-500">{member.email}</p>
                      <span className={`px-1 rounded text-[9px] font-bold mt-1 inline-block ${isMemberOwner ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        {member.role || 'MEMBER'}
                      </span>
                    </div>
                    {!isSelf && (
                      <div className="flex gap-1">
                        {isMemberOwner ? (
                          <button
                            type="button"
                            onClick={() => handleDemoteUser(member._id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition font-bold"
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromoteUser(member._id)}
                            className="px-2 py-1 bg-sky-500/15 border border-sky-500/25 rounded text-sky-400 hover:bg-sky-500 hover:text-white transition font-bold"
                          >
                            Promote
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Action Button */}
        {isOwner && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 disabled:opacity-60 transition"
            >
              {loading ? 'Saving preferences...' : 'Save Workspace Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default SettingsScreen;
