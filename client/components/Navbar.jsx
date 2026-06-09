import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axiosInstance from '../utils/axiosInstance';
import { setUser } from '../redux/userSlice.js';
import { fetchTasksByBoard } from '../redux/taskSlice.js';
import { fetchBoards, fetchBoardById } from '../redux/boardSlice.js';
import socket from '../utils/socket.js';
import { HiOutlineBell, HiOutlineViewBoards, HiOutlineMenu, HiOutlineUser, HiOutlineCog, HiOutlineLockClosed, HiOutlineLogout, HiOutlineSearch, HiOutlineTrash } from 'react-icons/hi';
import { toast } from '../utils/toast.js';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '../utils/motion.js';

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

  const [selectedIndex, setSelectedIndex] = useState(0);

  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    const list = [];
    if (searchResults.users) {
      searchResults.users.forEach(u => list.push({ type: 'user', data: u }));
    }
    if (searchResults.workspaces) {
      searchResults.workspaces.forEach(w => list.push({ type: 'workspace', data: w }));
    }
    if (searchResults.tasks) {
      searchResults.tasks.forEach(t => list.push({ type: 'task', data: t }));
    }
    if (searchResults.channels) {
      searchResults.channels.forEach(ch => list.push({ type: 'channel', data: ch }));
    }
    return list;
  }, [searchResults]);

  const handleSelectFlatResult = (selected) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    setSearchResults(null);
    
    if (selected.type === 'workspace') {
      navigate(`/boards/${selected.data._id}`);
    } else if (selected.type === 'task') {
      navigate(`/boards/${selected.data.boardId?._id || selected.data.boardId}/tasks/${selected.data._id}`);
    } else if (selected.type === 'channel') {
      navigate(`/boards/${selected.data.boardId}?channel=${selected.data.channelName}`);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
      }
      if (isSearchFocused && flatResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % flatResults.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = flatResults[selectedIndex];
          if (selected) {
            handleSelectFlatResult(selected);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, flatResults, selectedIndex]);

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
          _id: act._id,
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
            _id: activity._id,
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

  const pendingCount = userNotifications.length;
  const totalUnreadCount = userNotifications.length;

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

    // Load correct workspace context dynamically
    if (notif.boardId) {
      dispatch(fetchBoardById(notif.boardId));
      dispatch(fetchTasksByBoard(notif.boardId));
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
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-white leading-none">WorkSync</p>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        {user && (
          <div className="hidden md:flex flex-1 max-w-xs mx-6 relative" ref={searchRef}>
            <div className="premium-search-container w-full flex items-center relative">
              <HiOutlineSearch className="h-4 w-4 text-slate-400 flex-shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search workspaces, tasks, channels..."
                className="premium-search-input text-xs flex-1 bg-transparent text-white border-none outline-none"
              />
            </div>

            {/* Inline search results dropdown panel */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl max-h-[350px] overflow-y-auto custom-scrollbar">
                {searching ? (
                  <div className="text-slate-450 text-center py-4 text-[11px] flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-sky-400 border-t-transparent animate-spin" />
                    Searching...
                  </div>
                ) : flatResults.length > 0 ? (
                  <div className="space-y-1">
                    {flatResults.map((item, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectFlatResult(item)}
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition gap-2 ${
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.06)]'
                              : 'border-transparent bg-slate-950/30 hover:border-white/10 hover:bg-slate-950/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.type === 'user' && (
                              <span className="h-5 w-5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                                U
                              </span>
                            )}
                            {item.type === 'workspace' && (
                              <span className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                                W
                              </span>
                            )}
                            {item.type === 'task' && (
                              <span className="h-5 w-5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                                T
                              </span>
                            )}
                            {item.type === 'channel' && (
                              <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                                #
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">
                                {item.type === 'user' ? item.data.name : item.type === 'workspace' ? item.data.title : item.type === 'task' ? item.data.title : `#${item.data.channelName}`}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.type === 'user' ? item.data.email : item.type === 'workspace' ? `Workspace by ${item.data.createdBy?.name || 'Owner'}` : item.type === 'task' ? `Workspace: ${item.data.boardId?.title || 'Active Board'}` : `Workspace: ${item.data.workspaceTitle}`}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${
                            isSelected ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-slate-505 text-center py-4 text-[11px] italic">
                    No results matching "{searchQuery}"
                  </div>
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
                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#14F195] text-[8.5px] font-bold text-slate-950 animate-pulse shadow-[0_0_8px_rgba(20,241,149,0.5)]">
                    {pendingCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    id="notification-dropdown"
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 z-50 w-85 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl"
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

                    {/* Delete All Action */}
                    {activeTab === 'inbox' && userNotifications.length > 0 && (
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete all notifications?')) {
                              try {
                                await axiosInstance.delete('/notifications');
                                setUserNotifications([]);
                                toast.success('All notifications deleted');
                              } catch (err) {
                                console.error(err);
                                toast.error('Failed to delete all notifications');
                              }
                            }
                          }}
                          className="text-[10px] font-bold text-rose-405 hover:text-rose-300 transition cursor-pointer flex items-center gap-1"
                        >
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                          Delete All
                        </button>
                      </div>
                    )}

                    <div className="max-h-72 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
                      <AnimatePresence initial={false}>
                        {activeTab === 'inbox' ? (
                          userNotifications.length > 0 ? (
                            userNotifications.map((notif) => {
                              const isPendingInvite = (notif.type === 'task_invite' || notif.type === 'board_invite') && notif.status === 'pending';
                              return (
                                <motion.div
                                  layout
                                  key={notif._id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.18 }}
                                  onClick={() => handleNotificationClick(notif)}
                                  className="rounded-xl bg-slate-950/60 p-3 border border-white/5 text-xs text-slate-300 leading-normal cursor-pointer hover:bg-slate-905 hover:border-white/10 transition"
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
                                  {notif.boardTitle && (
                                    <p className="text-[10px] text-sky-400 font-semibold mt-1">
                                      Workspace: <span className="text-white">{notif.boardTitle}</span>
                                    </p>
                                  )}
                                  <p className="text-[9px] text-slate-500 mt-1">
                                    {notif.type === 'task_assign' ? 'Assigned By:' : 'Sender:'} <span className="font-medium text-slate-300">{notif.senderName}</span>
                                  </p>

                                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/5">
                                    {isPendingInvite && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRespondInvitation(notif._id, 'accept', notif.taskId, notif.boardId);
                                          }}
                                          className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRespondInvitation(notif._id, 'reject', notif.taskId, notif.boardId);
                                          }}
                                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] transition cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    {notif.status === 'pending' && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await axiosInstance.post(`/notifications/${notif._id}/read`);
                                            setUserNotifications((prev) =>
                                              prev.map((n) => (n._id === notif._id ? { ...n, status: 'handled' } : n))
                                            );
                                            toast.success('Marked request as handled');
                                          } catch (err) {
                                            console.error(err);
                                            toast.error('Failed to mark handled');
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] transition cursor-pointer"
                                      >
                                        Mark handled
                                      </button>
                                    )}
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await axiosInstance.delete(`/notifications/${notif._id}`);
                                          setUserNotifications((prev) => prev.filter((n) => n._id !== notif._id));
                                          toast.success('Notification deleted');
                                        } catch (err) {
                                          console.error(err);
                                          toast.error('Failed to delete notification');
                                        }
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white transition cursor-pointer ml-auto flex items-center justify-center border border-rose-500/15"
                                      title="Delete Notification"
                                    >
                                      <HiOutlineTrash className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })
                          ) : (
                            <p className="text-[10px] text-slate-500 text-center py-6">No notifications</p>
                          )
                        ) : (
                          notifications.length > 0 ? (
                            notifications.map((notif, idx) => (
                              <motion.div
                                layout
                                key={notif._id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.18 }}
                                className="rounded-xl bg-slate-950/40 p-2.5 border border-white/5 text-xs text-slate-300 leading-normal"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-white">{notif.title}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{notif.message}</p>
                                    <span className="text-[8px] text-slate-550 block mt-1">
                                      {new Date(notif.createdAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotifications((prev) => prev.filter((_, i) => i !== idx));
                                      toast.success('Notification deleted');
                                    }}
                                    className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white font-bold text-[9px] transition cursor-pointer flex-shrink-0"
                                  >
                                    Delete Notification
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500 text-center py-6">
                              {currentBoard?._id ? 'No recent activities' : 'Select a board to view activities'}
                            </p>
                          )
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`}
                      alt={cleanName}
                      className="h-7 w-7 rounded-full object-cover border border-white/10"
                    />
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
