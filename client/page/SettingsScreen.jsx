import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageVariants } from '../utils/motion.js';
import { updateBoard, fetchBoardById, fetchBoards, setCurrentBoard } from '../redux/boardSlice';
import axiosInstance from '../utils/axiosInstance';
import { HiOutlineUserGroup, HiOutlineBell, HiOutlineCog, HiOutlineHashtag, HiOutlinePlus, HiOutlineTrash, HiOutlineLockOpen, HiOutlineLockClosed, HiOutlineUserRemove, HiOutlineShieldCheck, HiOutlineChevronDown } from 'react-icons/hi';
import { toast } from '../utils/toast';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { boards, currentBoard } = useSelector((state) => state.boards);

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);
  const currentUserId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [selectedSource, setSelectedSource] = useState(''); // 'my' or 'joined'
  const [tempBoardId, setTempBoardId] = useState('');

  useEffect(() => {
    if (currentBoard) {
      const isOwned = (currentBoard.createdBy?._id || currentBoard.createdBy || '').toString() === currentUserId;
      setSelectedSource(isOwned ? 'my' : 'joined');
      setTempBoardId(currentBoard._id);
    } else {
      setSelectedSource('');
      setTempBoardId('');
    }
  }, [currentBoard, currentUserId]);

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

  const myWorkspaces = boards.filter(b => (b.createdBy?._id || b.createdBy || '').toString() === currentUserId);
  const joinedWorkspaces = boards.filter(b => (b.createdBy?._id || b.createdBy || '').toString() !== currentUserId);
  const availableWorkspaces = selectedSource === 'my' ? myWorkspaces : selectedSource === 'joined' ? joinedWorkspaces : [];

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



  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 max-w-4xl font-sans"
    >
      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <HiOutlineCog className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Workspace Management</p>
            <h1 className="mt-1 text-2xl font-bold text-white">WorkSync Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentBoard ? (
                <>Selected Workspace: <strong className="text-sky-400">{currentBoard.title}</strong></>
              ) : (
                "Please select a workspace source and choose a workspace below to manage settings."
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Workspace Selector Dropdowns */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Workspace Source Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Workspace Source</label>
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setTempBoardId('');
                  dispatch(setCurrentBoard(null));
                }}
                className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 pr-10 text-xs text-white outline-none focus:border-sky-500 transition cursor-pointer font-semibold"
              >
                <option value="">Choose Source</option>
                <option value="my">My Workspaces</option>
                <option value="joined">Joined Workspaces</option>
              </select>
              <HiOutlineChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Choose Workspace Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Choose Workspace</label>
            <div className="relative">
              <select
                disabled={!selectedSource}
                value={tempBoardId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setTempBoardId(bId);
                  if (bId) {
                    dispatch(fetchBoardById(bId));
                  } else {
                    dispatch(setCurrentBoard(null));
                  }
                }}
                className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 pr-10 text-xs text-white outline-none focus:border-sky-500 transition cursor-pointer font-semibold disabled:opacity-50"
              >
                <option value="">Select Workspace</option>
                {availableWorkspaces.map((board) => (
                  <option key={board._id} value={board._id}>
                    {board.title}
                  </option>
                ))}
              </select>
              <HiOutlineChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {message && currentBoard && (
        <div className={`rounded-xl border p-4 text-xs font-semibold ${
          message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        }`}>
          {message.text}
        </div>
      )}

      {currentBoard ? (
        /* Settings Form */
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

              <div className="space-y-4">
                {/* Owner Section */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider mb-2">Owner</span>
                  {currentBoard.createdBy && (() => {
                    const member = currentBoard.createdBy;
                    return (
                      <div className="rounded-xl border border-sky-500/20 bg-slate-950/40 p-3 flex justify-between items-center text-xs w-full sm:w-1/2">
                        <div>
                          <p className="font-semibold text-slate-200">{member.name}</p>
                          <p className="text-[10px] text-slate-500">{member.email}</p>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 inline-block bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            OWNER
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Members Section */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2">Members</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(currentBoard.members || [])
                      .filter(member => {
                        const mId = (member?._id || member || '').toString();
                        const creatorId = (currentBoard.createdBy?._id || currentBoard.createdBy || '').toString();
                        return mId !== creatorId;
                      })
                      .map((member) => {
                        const isSelf = member._id === currentUserId;
                        return (
                          <div key={member._id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold text-slate-200">{member.name}</p>
                              <p className="text-[10px] text-slate-500">{member.email}</p>
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 inline-block bg-slate-800 text-slate-500">
                                MEMBER
                              </span>
                            </div>
                            {!isSelf && (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to transfer ownership of this workspace to ${member.name}? This will revoke your owner privileges.`)) return;
                                    try {
                                      await axiosInstance.put(`/boards/${currentBoard._id}`, { createdBy: member._id });
                                      toast.success('Ownership transferred successfully.');
                                      navigate('/boards');
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Failed to transfer ownership.');
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-500/15 border border-amber-500/25 rounded text-amber-400 hover:bg-amber-500 hover:text-white transition font-bold"
                                >
                                  Transfer Owner
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm('Are you sure you want to remove this member?')) return;
                                    try {
                                      await axiosInstance.delete(`/boards/${currentBoard._id}/members/${member._id}`);
                                      toast.success('Member removed successfully.');
                                      dispatch(fetchBoardById(currentBoard._id));
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Failed to remove member.');
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-500/15 border border-rose-500/25 rounded text-rose-400 hover:bg-rose-500 hover:text-white transition font-bold"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
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
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center text-slate-100">
          <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-900/20 p-12 text-center text-slate-300 shadow-2xl backdrop-blur-sm">
            <p className="text-lg font-semibold text-white">No workspace selected</p>
            <p className="mt-3 text-sm text-slate-400">Please choose a workspace from the dropdown above to edit its settings.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SettingsScreen;
