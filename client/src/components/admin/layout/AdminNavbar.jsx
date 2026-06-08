import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineShieldCheck,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineUser,
  HiOutlineSearch
} from 'react-icons/hi';
import axiosInstance from '../../../../utils/axiosInstance';
import socket from '../../../../utils/socket';
import { toast } from '../../../../utils/toast';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@admin.com';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showOlder, setShowOlder] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const fetchNotifications = async (older = false) => {
    try {
      const res = await axiosInstance.get(`/notifications?includeOlder=${older}`);
      setNotifications(res.data.notifications || []);
      setShowOlder(older);
    } catch (err) {
      console.error('Failed to fetch admin notifications:', err);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchNotifications(false);

    const handleRealtimeNotif = (data) => {
      const currentUserId = localStorage.getItem('userId');
      if (data.recipientId === currentUserId) {
        setNotifications((prev) => [data.notification, ...prev]);
        toast.info(data.notification.message || 'You received a new notification!');
      }
    };

    socket.on('invitationSent', handleRealtimeNotif);
    return () => {
      socket.off('invitationSent', handleRealtimeNotif);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    toast.success('Logged out successfully.');
    window.location.href = '/login';
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      case 'board_invite': return 'Workspace Invitation';
      case 'task_invite': return 'Task Invitation';
      case 'task_assign': return 'Task Assigned';
      case 'task_reassign': return 'Task Reassigned';
      case 'mention': return 'Comment Mention';
      case 'member_removed': return 'Member Removed';
      case 'task_completed': return 'Task Completed';
      case 'ownership_transfer': return 'Ownership Transfer';
      case 'role_change': return 'System Role Changed';
      case 'workspace_deleted': return 'Workspace Deleted';
      case 'workspace_archived': return 'Workspace Archived';
      case 'permission_changed': return 'Permissions Updated';
      case 'user_blocked': return 'User Account Blocked';
      default: return 'Platform Notification';
    }
  };

  const handleNotificationClick = (notif) => {
    setIsNotificationsOpen(false);

    // Notification click navigation rules
    if (notif.type === 'permission_changed' || notif.type === 'role_change') {
      navigate('/admin/access-control');
    } else if (notif.type === 'user_blocked' || notif.type === 'user_promoted') {
      const uId = notif.sender?._id || notif.sender;
      navigate(`/admin/users?userId=${uId}`);
    } else if (notif.taskId && notif.boardId) {
      navigate(`/admin/workspaces?boardId=${notif.boardId}&taskId=${notif.taskId}`);
    } else if (notif.boardId) {
      navigate(`/admin/workspaces?boardId=${notif.boardId}`);
    } else {
      navigate('/admin');
    }
  };

  const activeUnreadCount = notifications.filter(n => n.status === 'unread' || n.status === 'pending').length;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-xl shadow-black/20 h-[73px] flex items-center">
      <div className="w-full flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 hover:scale-105 transition">
            <HiOutlineShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              Admin Panel : {currentUserName.split(' ')[0]}
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Platform Administration Shell</p>
          </div>
        </div>

        {/* Center: Search Visual Placeholder (to match User Navbar structure) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <div className="w-full flex items-center justify-between bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2 transition opacity-60">
            <div className="flex items-center gap-2">
              <HiOutlineSearch className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Search admin shell...</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-slate-950 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
              <kbd className="font-sans">⌘</kbd>
              <kbd className="font-sans">K</kbd>
            </span>
          </div>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Icon & Drawer */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
            >
              <HiOutlineBell className="h-5 w-5" />
              {activeUnreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-bold text-slate-950 animate-pulse">
                  {activeUnreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 z-50 w-96 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
                <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">🔔 Notification Center</p>
                  {activeUnreadCount > 0 && (
                    <span className="text-[9px] font-bold bg-blue-600/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded">
                      {activeUnreadCount} Unread
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/20 transition cursor-pointer hover:bg-slate-900"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-white leading-normal truncate max-w-[170px]">
                            {getNotificationTitle(notif.type)}
                          </p>
                          <span className="text-[8px] text-slate-500 font-semibold">{getRelativeTime(notif.createdAt)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500 text-center py-8 italic">No notifications in the last 24 hours.</p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => fetchNotifications(!showOlder)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
                  >
                    {showOlder ? 'Show Recent Only' : 'Load Older Notifications'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Identity Profile Card & Dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-1.5 transition hover:bg-slate-800"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-bold">
                {currentUserName.charAt(0).toUpperCase()}
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white">{currentUserName.replace(/\s+(User|Admin)$/i, '')}</p>
              </div>
            </div>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
                <div className="px-1 py-2">
                  <p className="text-sm font-bold text-white leading-tight">{currentUserName.replace(/\s+(User|Admin)$/i, '')}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{currentUserEmail}</p>
                </div>
                <div className="my-2 border-t border-white/10" />
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition text-left"
                  >
                    <HiOutlineUser className="h-4 w-4 text-slate-400" />
                    <span>Profile</span>
                  </button>
                  <div className="my-2 border-t border-white/10" />
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-xl transition text-left"
                  >
                    <HiOutlineLogout className="h-4 w-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
