import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchBoards,
  fetchBoardById,
  createBoard,
  setCurrentBoard,
  addBoardMember,
  removeBoardMember,
} from '../redux/boardSlice.js'
import Board from '../components/Board.jsx'
import WorkspaceSidePanel from '../components/WorkspaceSidePanel.jsx'
import TaskDetailsDrawer from '../components/TaskDetailsDrawer.jsx'
import axiosInstance from '../utils/axiosInstance'
import socket from '../utils/socket'
import { HiOutlineClock, HiOutlinePlus, HiOutlineUserAdd, HiOutlineFolder, HiOutlineTemplate, HiOutlineSparkles } from 'react-icons/hi'

const BoardsScreen = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { boardId, taskId } = useParams()
  const { boards, currentBoard } = useSelector((state) => state.boards)
  const { tasks, onlineUsers } = useSelector((state) => state.tasks)
  const currentUserId = localStorage.getItem('userId');

  const getDeadlineInfo = (dueDate, status) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isDone = status === 'Done';

    let text;
    let isOverdue = false;
    let className = 'text-slate-500 bg-slate-950/40';

    if (diffDays < 0) {
      isOverdue = !isDone;
      text = `${Math.abs(diffDays)}d overdue`;
      if (isOverdue) {
        className = 'text-rose-400 bg-rose-500/10 border border-rose-500/20 font-bold';
      }
    } else if (diffDays === 0) {
      text = 'Due Today';
      if (!isDone) {
        className = 'text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold';
      }
    } else if (diffDays === 1) {
      text = 'Tomorrow';
      if (!isDone) {
        className = 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
      }
    } else {
      text = `${diffDays}d left`;
    }

    return { text, isOverdue, className };
  };

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Invite member state
  const [allUsers, setAllUsers] = useState([])
  const [inviteSearch, setInviteSearch] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Toggle Activity feed
  const [isActivityOpen, setIsActivityOpen] = useState(true)

  // Owner dashboard view state
  const [showOwnerDashboard, setShowOwnerDashboard] = useState(false)

  useEffect(() => {
    dispatch(fetchBoards())
  }, [dispatch])

  useEffect(() => {
    if (boardId) {
      dispatch(fetchBoardById(boardId))
    }
  }, [boardId, dispatch])

  useEffect(() => {
    if (!boardId && boards.length > 0) {
      // Don't auto-redirect to first board so the user can see the main boards directory/dashboard
    }
  }, [boardId, boards])

  useEffect(() => {
    if (!boardId && currentBoard) {
      dispatch(setCurrentBoard(null))
    }
  }, [boardId, currentBoard, dispatch])

  // Fetch all users for membership invite
  useEffect(() => {
    if (boardId) {
      const loadUsers = async () => {
        try {
          const response = await axiosInstance.get('/user/all-users')
          setAllUsers(response.data.users || [])
        } catch (e) {
          console.error(e)
        }
      }
      loadUsers()
    }
  }, [boardId])

  // Eviction listener
  useEffect(() => {
    if (!boardId) return;
    const handleEviction = (data) => {
      if (data.boardId === boardId && data.memberId === currentUserId) {
        alert('You have been removed from this board by the owner.');
        navigate('/boards', { replace: true });
      }
    };
    socket.on('memberRemoved', handleEviction);
    return () => {
      socket.off('memberRemoved', handleEviction);
    };
  }, [boardId, currentUserId, navigate]);

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const resultAction = await dispatch(
        createBoard({ title: title.trim(), description: description.trim() })
      )
      if (createBoard.fulfilled.match(resultAction)) {
        setTitle('')
        setDescription('')
        setIsCreateModalOpen(false)
        navigate(`/boards/${resultAction.payload._id}`)
      }
    } catch (err) {
      console.error('Error creating board:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInvite = async (userToAddId) => {
    try {
      await dispatch(addBoardMember({ boardId, memberId: userToAddId }))
      setIsInviteOpen(false)
      setInviteSearch('')
    } catch (err) {
      console.error('Invite member failed', err)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await dispatch(removeBoardMember({ boardId, memberId })).unwrap();
    } catch (err) {
      console.error('Remove member failed', err);
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleBlockMember = async (userId, userName) => {
    const reason = window.prompt(`Enter block reason for ${userName}:`, 'Violating workspace policy');
    if (reason === null) return;
    try {
      await axiosInstance.post(`/user/block/${userId}`, { reason });
      alert('User blocked successfully.');
      if (boardId) {
        dispatch(fetchBoardById(boardId));
      }
    } catch (err) {
      console.error('Block member failed', err);
      alert(err.response?.data?.message || 'Failed to block member.');
    }
  };

  // Filter users not on the current board
  const nonMembers = allUsers.filter(u => {
    const isMember = currentBoard?.members?.some(m => m._id === u._id)
    const isCreator = currentBoard?.createdBy?._id === u._id
    const matchesSearch = u.name?.toLowerCase().includes(inviteSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(inviteSearch.toLowerCase())
    return !isMember && !isCreator && matchesSearch
  })

  // 1. Boards Directory Dashboard (If no board selected)
  if (!boardId) {
    return (
      <div className="space-y-8 max-w-full">
        {/* Dash Header */}
        <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Workspace Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Project Boards</h1>
              <p className="mt-1 text-xs text-slate-400">
                Review available board workspaces, view team participation, and create new collaborative spaces.
              </p>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="flex gap-4">
              <div className="rounded-xl bg-slate-900/60 border border-white/5 px-4 py-2 text-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Total Boards</span>
                <span className="text-xl font-bold text-white mt-1 block">{boards.length}</span>
              </div>
              <div className="rounded-xl bg-slate-900/60 border border-white/5 px-4 py-2 text-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Collaboration Status</span>
                <span className="text-xl font-bold text-sky-400 mt-1 block flex items-center gap-1 justify-center">
                  <HiOutlineSparkles className="h-4 w-4" /> Active
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Boards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">All Workspaces</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-sky-500/10 transition"
            >
              <HiOutlinePlus className="h-4 w-4" /> Create Board
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <div
                key={board._id}
                onClick={() => navigate(`/boards/${board._id}`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/20 p-5 hover:border-slate-700/60 hover:bg-slate-900/30 cursor-pointer shadow-md transition hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-3">
                    <HiOutlineFolder className="h-5 w-5 text-sky-500" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Workspace</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition truncate">{board.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">{board.description || 'No description provided.'}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {board.members?.slice(0, 3).map((member, idx) => (
                      <span
                        key={idx}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-slate-800 to-slate-700 text-white text-[9px] font-bold border border-slate-950"
                        title={member.name}
                      >
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {board.members?.length > 3 && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 text-slate-400 text-[8px] font-semibold border border-slate-950">
                        +{board.members.length - 3}
                      </span>
                    )}
                  </div>
                  <span>{board.members?.length || 0} participants</span>
                </div>
              </div>
            ))}

            {/* Create Board Inline Action */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-transparent p-6 hover:border-sky-500/40 hover:bg-sky-500/5 cursor-pointer text-slate-400 hover:text-sky-400 transition min-h-[160px]"
            >
              <HiOutlinePlus className="h-6 w-6 mb-2" />
              <span className="text-xs font-semibold">Add New Workspace</span>
              <span className="text-[10px] text-slate-500 mt-1">Start tracking dynamic boards</span>
            </div>
          </div>
        </section>

        {/* Create Board Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white mb-2">Create New Workspace</h3>
              <p className="text-[11px] text-slate-400 mb-4">Set up board details. Collaborators can join via invitation.</p>
              
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Workspace name, e.g., Sprint Plan"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-sky-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Summary of scope..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-sky-500 transition"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-60 transition"
                  >
                    {isCreating ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  const isOwner = currentBoard && (currentBoard.createdBy?._id === currentUserId || currentBoard.createdBy === currentUserId);

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-[calc(100vh-121px)] overflow-hidden">
      
      {/* Center Main Board Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/10">
        
        {/* Board Header Bar */}
        <header className="relative z-20 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-slate-400">
              <HiOutlineTemplate className="h-4 w-4" />
              <span className="text-[9px] uppercase tracking-wider font-semibold">Active Space</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-white truncate">{currentBoard?.title || 'Loading Board...'}</h2>
            {currentBoard && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                <span>Workspace Owner: <strong className="text-sky-400">{currentBoard.createdBy?.name || 'Unknown'}</strong></span>
                <span>Board Owner: <strong className="text-sky-400">{currentBoard.createdBy?.name || 'Unknown'}</strong></span>
                <span>Created By: <strong className="text-sky-400">{currentBoard.createdBy?.name || 'Unknown'}</strong></span>
              </div>
            )}
            {currentBoard?.description && (
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{currentBoard.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Board Members list */}
            <div className="flex items-center gap-1 bg-slate-950/80 rounded-xl px-2 py-1.5 border border-white/5">
              <div className="flex -space-x-1">
                {currentBoard?.members?.slice(0, 4).map((member, idx) => (
                  <span
                    key={idx}
                    className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-md bg-slate-800 text-white text-[8px] font-bold border border-slate-900"
                    title={member.name}
                  >
                    {member.name?.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              <span className="text-[9px] text-slate-400 px-1">
                {currentBoard?.members?.length || 0} joined
              </span>

              {/* Add Member Dropdown Trigger */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setIsInviteOpen(!isInviteOpen)}
                    className="rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 p-1 transition"
                    title="Invite Teammate"
                  >
                    <HiOutlineUserAdd className="h-3.5 w-3.5" />
                  </button>

                  {/* Invite Dropdown Panel */}
                  {isInviteOpen && (
                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-2xl">
                      <p className="text-[10px] font-semibold text-white mb-2">Invite Collaborator</p>
                      <input
                        value={inviteSearch}
                        onChange={(e) => setInviteSearch(e.target.value)}
                        placeholder="Search name or email..."
                        className="w-full rounded-lg border border-white/5 bg-slate-950 px-2 py-1.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-sky-500 mb-2"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {nonMembers.length > 0 ? (
                          nonMembers.map(u => (
                            <div 
                              key={u._id}
                              onClick={() => handleInvite(u._id)}
                              className="flex items-center justify-between rounded p-1.5 bg-slate-950/30 hover:bg-slate-950 border border-transparent hover:border-white/5 cursor-pointer transition"
                            >
                              <span className="text-[10px] text-slate-200 truncate pr-2">{u.name}</span>
                              <span className="text-[9px] text-sky-400 font-bold hover:underline">Add</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[9px] text-slate-500 text-center py-2">No other users found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Owner Dashboard Toggle */}
            {isOwner && (
              <button
                onClick={() => setShowOwnerDashboard(!showOwnerDashboard)}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                  showOwnerDashboard
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-400 font-bold'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
            )}

            {/* Toggle right activity log */}
            <button
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                isActivityOpen 
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' 
                  : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <HiOutlineClock className="h-4 w-4" />
              <span className="hidden sm:inline">Activity Feed</span>
            </button>
          </div>
        </header>

        {/* Board content or Owner Dashboard */}
        <div className="flex-1 overflow-y-auto">
          {showOwnerDashboard && isOwner ? (
            <div className="space-y-6 p-4 bg-slate-900/40 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-base font-bold text-white">Owner Dashboard & Member Management</h3>
                <p className="text-xs text-slate-400 mt-1">Review team status, details of task assignments, and manage roles.</p>
              </div>

              {/* Members Control Table */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Workspace Members</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currentBoard?.members?.map((member) => {
                    const isSelf = member._id === currentUserId;
                    return (
                      <div key={member._id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{member.name}</p>
                          <p className="text-[10px] text-slate-500">{member.email}</p>
                        </div>
                        {!isSelf && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/25 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition font-bold"
                            >
                              Remove
                            </button>
                            {member.role !== 'OWNER' && (
                              <button
                                onClick={() => handleBlockMember(member._id, member.name)}
                                className="px-2.5 py-1 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition font-bold"
                              >
                                Block
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks Progress Tracking Table */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Tasks Progress Tracking</h4>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/40 text-slate-400">
                        <th className="p-3">Task Name</th>
                        <th className="p-3">Assigned To</th>
                        <th className="p-3">Progress</th>
                        <th className="p-3">Deadline</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {tasks.length > 0 ? (
                        tasks.map((task) => (
                          <tr key={task._id} className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-white truncate max-w-[200px]">{task.title}</td>
                            <td className="p-3">{task.assignedTo?.name || 'Unassigned'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                                {task.progress !== undefined ? task.progress : 0}%
                              </span>
                            </td>
                            <td className="p-3">
                              {task.dueDate ? (() => {
                                const dl = getDeadlineInfo(task.dueDate, task.status);
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border border-white/5 w-max ${dl.className}`}>
                                      {dl.text}
                                    </span>
                                  </div>
                                );
                              })() : <span className="text-slate-500">None</span>}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold text-[9px]">
                                {task.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="p-4 text-center text-slate-500">No tasks created.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <Board boardId={boardId} />
            </div>
          )}
        </div>
      </div>

      {/* Dockable Right Workspace Panel */}
      {isActivityOpen && (
        <aside className="w-full xl:w-76 flex-shrink-0 flex flex-col h-full bg-slate-950 border-l border-white/10 overflow-hidden rounded-2xl xl:rounded-none">
          <div className="flex-1 overflow-hidden">
            <WorkspaceSidePanel boardId={boardId} currentBoard={currentBoard} onlineUsers={onlineUsers} />
          </div>
        </aside>
      )}

      {/* Task Details Right-Side Slide-Over Drawer */}
      <TaskDetailsDrawer
        taskId={taskId}
        boardId={boardId}
        isOpen={Boolean(taskId)}
        onClose={() => navigate(`/boards/${boardId}`)}
      />

    </div>
  )
}

export default BoardsScreen
