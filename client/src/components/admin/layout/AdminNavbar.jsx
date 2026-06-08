import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineShieldCheck, 
  HiOutlineLogout, 
  HiOutlineBell, 
  HiOutlineUser
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
    <header className="h-[73px] border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30 font-sans">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin')}>
        <HiOutlineShieldCheck className="h-6 w-6 text-cyan-400" />
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
            Admin Panel <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase">{userRole}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Platform Administration Shell</p>
        </div>
      </div>

      {/* Topbar Actions */}
      <div className="flex items-center gap-4 text-xs font-semibold">
        {/* Notifications Icon & Drawer */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="text-slate-400 hover:text-white transition relative p-2 rounded-xl bg-slate-950 border border-white/10"
          >
            <HiOutlineBell className="h-5 w-5" />
            {activeUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-cyan-400 rounded-full border border-slate-950" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 z-50 w-96 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
              <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
                <p className="text-xs font-bold text-white uppercase tracking-wider">🔔 Notification Center</p>
                {activeUnreadCount > 0 && (
                  <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
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
                      className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/25 transition cursor-pointer hover:bg-slate-900"
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
            className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-slate-900 transition"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-bold">Admin Panel : {currentUserName.replace(/\s+(User|Admin)$/i, '')}</span>
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
              <div className="border-t border-white/10 my-1" />
              <div className="px-1 py-2 font-sans">
                <p className="text-sm font-bold text-white leading-tight">{currentUserName}</p>
                <p className="text-[10px] text-cyan-400 font-bold tracking-wider mt-1">{userRole}</p>
                <p className="text-xs text-slate-400 mt-1.5 truncate">{currentUserEmail}</p>
              </div>
              <div className="my-2 border-t border-white/10" />
              <div className="space-y-1 font-sans">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-350 hover:text-white hover:bg-white/5 rounded-xl transition text-left"
                >
                  <HiOutlineUser className="h-4.5 w-4.5 text-slate-400" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-455 hover:text-white hover:bg-rose-500/10 rounded-xl transition text-left"
                >
                  <HiOutlineLogout className="h-4.5 w-4.5 text-rose-455" />
                  <span>Sign Out</span>
                </button>
              </div>
              <div className="border-t border-white/10 my-1" />
            </div>
          )}
        </div>

        {/* Header Sign Out button */}
        <button
          onClick={handleSignOut}
          className="text-slate-400 hover:text-rose-400 transition p-2 rounded-xl bg-slate-950 border border-white/10"
          title="Sign Out Platform"
        >
          <HiOutlineLogout className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default AdminNavbar;
