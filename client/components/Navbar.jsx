import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axiosInstance from '../utils/axiosInstance';
import { setUser } from '../redux/userSlice.js';
import { fetchTasksByBoard } from '../redux/taskSlice.js';
import { fetchBoards } from '../redux/boardSlice.js';
import socket from '../utils/socket.js';
import { HiOutlineBell, HiOutlineViewBoards, HiOutlineMenu, HiOutlineUser, HiOutlineCog, HiOutlineLockClosed, HiOutlineLogout, HiOutlineSearch } from 'react-icons/hi';
import { toast } from '../utils/toast.js';

const Navbar = ({ toggleSidebar }) => {
  const [activeBoardName, setActiveBoardName] = useState('My Workspace');
  const { user } = useSelector((state) => state.user);
  const { currentBoard } = useSelector((state) => state.boards);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [userName, setUserName] = useState('Guest');
  const [notifications, setNotifications] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' or 'feed'
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Global Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await axiosInstance.get(`/search/global?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInboxNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications');
      setUserNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching inbox notifications:', err);
    }
  };

  useEffect(() => {
    const currentBoardName = localStorage.getItem('activeBoardName');
    const storedName = localStorage.getItem('userName');
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (currentBoardName) setActiveBoardName(currentBoardName);
    if (storedName) setUserName(storedName);
  }, []);

  useEffect(() => {
    if (!user) return;

    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    fetchInboxNotifications();

    const handleInviteSent = (data) => {
      const currentUserId = localStorage.getItem('userId') || user._id;
      if (data.recipientId === currentUserId) {
        setUserNotifications((prev) => [data.notification, ...prev]);
        toast.info(data.notification.message || 'You received a new task invitation!');
      }
    };

    const handleTaskAssigned = (data) => {
      toast.success(
        `You have been assigned a task: "${data.taskTitle}" by ${data.assignedBy}. Deadline: ${
          data.deadline ? new Date(data.deadline).toLocaleDateString() : 'None'
        }`
      );
      if (data.notification) {
        setUserNotifications((prev) => [data.notification, ...prev]);
      }
    };

    const handleTaskUnassigned = (data) => {
      toast.info(`Task assignment removed: "${data.taskTitle}"`);
    };

    const handleMemberAdded = (data) => {
      const currentUserId = localStorage.getItem('userId') || user._id;
      dispatch(fetchBoards());
      if (data.member._id === currentUserId) {
        toast.success(`You have been added to the workspace: "${data.board.title}"`);
      } else {
        toast.info(`${data.member.name} joined the workspace: "${data.board.title}"`);
      }
    };

    const handleInviteRejected = (data) => {
      const currentUserId = localStorage.getItem('userId') || user._id;
      if (data.notification.recipient === currentUserId) {
        fetchInboxNotifications();
        toast.warning(`${data.inviteeName} rejected your invitation to join workspace: "${data.notification.boardTitle}"`);
      }
    };

    socket.on('invitationSent', handleInviteSent);
    socket.on('taskAssigned', handleTaskAssigned);
    socket.on('taskUnassigned', handleTaskUnassigned);
    socket.on('memberAdded', handleMemberAdded);
    socket.on('memberInviteRejected', handleInviteRejected);

    return () => {
      socket.off('invitationSent', handleInviteSent);
      socket.off('taskAssigned', handleTaskAssigned);
      socket.off('taskUnassigned', handleTaskUnassigned);
      socket.off('memberAdded', handleMemberAdded);
      socket.off('memberInviteRejected', handleInviteRejected);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  useEffect(() => {
    if (!currentBoard?._id) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setNotifications([]);
      return;
    }
    const fetchActivities = async () => {
      try {
        const response = await axiosInstance.get(`/activity/board/${currentBoard._id}`);
        const activities = response.data.activities || [];
        const items = activities.map((act) => ({
          title: act.type,
          message: act.message,
          createdAt: act.createdAt,
        }));
        setNotifications(items);
      } catch (err) {
        console.error('Error fetching activities:', err);
      }
    };
    fetchActivities();

    const handleActivityCreated = (data) => {
      const { activity } = data;
      if (activity && activity.boardId === currentBoard._id) {
        setNotifications((prev) => [
          {
            title: activity.type,
            message: activity.message,
            createdAt: activity.createdAt,
          },
          ...prev,
        ]);
      }
    };

    socket.on('activity-created', handleActivityCreated);

    return () => {
      socket.off('activity-created', handleActivityCreated);
    };
  }, [currentBoard?._id]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleRespondInvitation = async (notificationId, action, taskId, boardId) => {
    try {
      const response = await axiosInstance.post(`/notifications/${notificationId}/respond`, { action });
      setUserNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, status: action === 'accept' ? 'accepted' : 'rejected' } : notif
        )
      );

      const eventName = action === 'accept' ? 'invitationAccepted' : 'invitationRejected';
      socket.emit(eventName, {
        boardId,
        taskId,
        notification: response.data.notification,
      });

      if (currentBoard?._id === boardId) {
        dispatch(fetchTasksByBoard(boardId));
      }
      
      // Reload boards list
      dispatch(fetchBoards());

      toast.success(`Invitation successfully ${action}ed!`);
    } catch (err) {
      console.error('Error responding to invitation:', err);
      toast.error(err.response?.data?.message || 'Failed to respond to invitation');
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/user/logout');
    } catch {
      // ignore
    }
    // Clear client state
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    dispatch(setUser(null));
    navigate('/login');
  };

  const pendingCount = userNotifications.filter((n) => n.status === 'pending').length;
  const totalUnreadCount = userNotifications.filter((n) => n.status === 'pending' || n.status === 'unread').length;

  const handleNotificationClick = async (notif) => {
    setIsNotificationsOpen(false);

    // Mark as read if unread on the backend
    if (notif.status === 'unread') {
      try {
        await axiosInstance.post(`/notifications/${notif._id}/read`);
        setUserNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, status: 'read' } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate to page
    if (notif.taskId && notif.boardId) {
      navigate(`/boards/${notif.boardId}/tasks/${notif.taskId}`);
    } else if (notif.boardId) {
      navigate(`/boards/${notif.boardId}`);
    } else if (notif.type === 'role_change') {
      navigate('/profile');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-xl shadow-black/20 h-[73px] flex items-center">
      <div className="w-full flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        
        {/* Left Side: Hamburger (Mobile) + Brand */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:bg-slate-800 md:hidden"
              aria-label="Toggle Sidebar"
            >
              <HiOutlineMenu className="h-5 w-5" />
            </button>
          )}
          
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition">
              <HiOutlineViewBoards className="h-5 w-5" />
            </div>
            {user ? (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                <h1 className="text-sm font-semibold text-white leading-none mt-1">{activeBoardName}</h1>
                {currentBoard && (
                  <p className="text-[9px] text-sky-400 font-semibold mt-1">
                    Owner: {currentBoard.createdBy?.name || 'Unknown'}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">Platform</p>
                <h1 className="text-sm font-semibold text-white leading-none mt-1">Kanban Board</h1>
              </div>
            )}
          </Link>
        </div>

        {/* Global Search Bar */}
        {user && (
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative" ref={searchRef}>
            <div className="w-full flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-sky-500 transition">
              <HiOutlineSearch className="h-4 w-4 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search workspaces, tasks, channels..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-650 w-full"
              />
            </div>

            {/* Search Dropdown Overlay */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 w-full rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl max-h-96 overflow-y-auto custom-scrollbar text-xs text-left">
              {searching ? (
                <div className="text-slate-500 text-center py-4">Searching platform...</div>
              ) : searchResults && (Object.values(searchResults).some(arr => Array.isArray(arr) && arr.length > 0)) ? (
                <div className="space-y-4">
                  {/* Users Section */}
                  {searchResults.users?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Users</p>
                      {searchResults.users.map(u => (
                        <div key={u._id} className="p-2 rounded-xl bg-slate-900/40 border border-white/5 flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-[9px]">
                            {u.name?.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-slate-200 truncate font-semibold">{u.name}</span>
                          <span className="text-slate-500 truncate text-[10px] ml-auto">{u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Workspaces Section */}
                  {searchResults.workspaces?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Workspaces</p>
                      {searchResults.workspaces.map(w => (
                        <div
                          key={w._id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/boards/${w._id}`);
                          }}
                          className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:border-sky-500/35 transition cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-slate-200 truncate font-semibold">{w.title}</span>
                          <span className="text-slate-500 text-[10px]">Owner: {w.createdBy?.name || 'Workspace Owner'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tasks Section */}
                  {searchResults.tasks?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Tasks</p>
                      {searchResults.tasks.map(t => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/boards/${t.boardId._id || t.boardId}/tasks/${t._id}`);
                          }}
                          className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:border-sky-500/35 transition cursor-pointer flex flex-col gap-0.5"
                        >
                          <span className="text-slate-200 truncate font-semibold">{t.title}</span>
                          <span className="text-slate-500 text-[9px]">Workspace: {t.boardId?.title || 'Main Workspace'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Channels Section */}
                  {searchResults.channels?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Channels</p>
                      {searchResults.channels.map((ch, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/boards/${ch.boardId}?channel=${ch.channelName}`);
                          }}
                          className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:border-sky-500/35 transition cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-slate-200 truncate font-semibold">#{ch.channelName}</span>
                          <span className="text-slate-500 text-[10px]">{ch.workspaceTitle}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-550 text-center py-4">No results matching "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="relative" ref={notificationRef}>
            <button
              id="notification-bell"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationsOpen(!isNotificationsOpen);
                if (!isNotificationsOpen) {
                  fetchInboxNotifications();
                }
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
            >
              <HiOutlineBell className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-bold text-slate-950 animate-pulse">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div
                id="notification-dropdown"
                className="absolute right-0 mt-2 z-50 w-85 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl"
              >
                {/* Tabs header */}
                <div className="flex border-b border-white/5 pb-2 mb-3 justify-around">
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`pb-1 text-xs font-semibold transition ${
                      activeTab === 'inbox' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Inbox ({pendingCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('feed')}
                    className={`pb-1 text-xs font-semibold transition ${
                      activeTab === 'feed' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Feed ({notifications.length})
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3.5 custom-scrollbar">
                  {activeTab === 'inbox' ? (
                    userNotifications.length > 0 ? (
                      userNotifications.map((notif) => {
                        const isPendingInvite = (notif.type === 'task_invite' || notif.type === 'board_invite') && notif.status === 'pending';
                        return (
                          <div
                            key={notif._id}
                            onClick={() => handleNotificationClick(notif)}
                            className="rounded-xl bg-slate-950/60 p-3 border border-white/5 text-xs text-slate-300 leading-normal cursor-pointer hover:bg-slate-900 hover:border-white/10 transition"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <p className="font-semibold text-white">
                                {notif.type === 'task_assign'
                                  ? 'Task Assignment'
                                  : notif.type === 'board_invite'
                                    ? 'Workspace Invitation'
                                    : notif.type === 'task_invite'
                                      ? 'Task Invitation'
                                      : notif.type === 'mention'
                                        ? 'Comment Mention'
                                        : notif.type === 'task_completed'
                                          ? 'Task Completed'
                                          : notif.type === 'ownership_transfer'
                                            ? 'Ownership Transfer'
                                            : notif.type === 'role_change'
                                              ? 'Role Change'
                                              : 'Notification'}
                              </p>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                notif.type === 'task_assign'
                                  ? 'bg-sky-500/10 text-sky-400'
                                  : notif.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : notif.status === 'accepted'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {notif.type === 'task_assign' ? 'Assigned' : notif.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {notif.type === 'task_assign'
                                ? 'You have been assigned to:'
                                : notif.type === 'board_invite'
                                  ? 'Workspace invitation details:'
                                  : notif.type === 'task_invite'
                                    ? 'You have been invited to collaborate on:'
                                    : notif.type === 'mention'
                                      ? 'You were mentioned in:'
                                      : notif.type === 'task_completed'
                                        ? 'A task was completed:'
                                        : 'Notification details:'}
                            </p>
                            <p className="text-[11px] font-bold text-white mt-0.5 italic">
                              "{notif.type === 'board_invite'
                                ? notif.boardTitle || notif.message
                                : notif.type === 'task_assign' || notif.type === 'task_invite' || notif.type === 'task_completed'
                                  ? notif.taskTitle || notif.message
                                  : notif.message}"
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              {notif.type === 'task_assign' ? 'Assigned By:' : 'Sender:'} <span className="font-medium text-slate-300">{notif.senderName}</span>
                            </p>

                            {isPendingInvite && (
                              <div className="flex gap-2 mt-3 pt-2 border-t border-white/5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRespondInvitation(notif._id, 'accept', notif.taskId, notif.boardId);
                                  }}
                                  className="flex-1 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[10px] transition cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRespondInvitation(notif._id, 'reject', notif.taskId, notif.boardId);
                                  }}
                                  className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-[10px] transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center py-6">No notifications</p>
                    )
                  ) : (
                    notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-slate-950/40 p-2.5 border border-white/5 text-xs text-slate-300 leading-normal"
                        >
                          <p className="font-semibold text-white">{notif.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{notif.message}</p>
                          <span className="text-[8px] text-slate-500 block mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center py-6">
                        {currentBoard?._id ? 'No recent activities' : 'Select a board to view activities'}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
          )}
          
          {user ? (
            (() => {
              const cleanName = (user?.name || userName || 'User').replace(/\s+(User|Admin)$/i, '');
              return (
                <div className="relative" ref={profileRef}>
                  <div 
                    className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-1.5 transition hover:bg-slate-800" 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-bold">
                      {cleanName.charAt(0) || 'U'}
                    </span>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-white">{cleanName}</p>
                    </div>
                  </div>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
                      <div className="px-1 py-2">
                        <p className="text-sm font-bold text-white leading-tight">{cleanName}</p>
                        <p className="text-xs text-slate-400 mt-1 truncate">{user?.email || localStorage.getItem('userEmail') || ''}</p>
                      </div>
                      <div className="my-2 border-t border-white/10" />
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate('/profile');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition text-left"
                        >
                          <HiOutlineUser className="h-4.5 w-4.5 text-slate-400" />
                          <span>Profile</span>
                        </button>
                        <div className="my-2 border-t border-white/10" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-xl transition text-left"
                        >
                          <HiOutlineLogout className="h-4.5 w-4.5 text-rose-400" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 inline-flex"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
