import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineShieldCheck, 
  HiOutlineSearch, 
  HiOutlineLogout, 
  HiOutlineBell, 
  HiOutlineUser, 
  HiOutlineCog, 
  HiOutlineLockClosed 
} from 'react-icons/hi';
import { toast } from '../../../../utils/toast';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@admin.com';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    toast.success('Logged out successfully.');
    window.location.href = '/login';
  };

  return (
    <header className="h-[73px] border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin')}>
        <HiOutlineShieldCheck className="h-6 w-6 text-cyan-400" />
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
            Admin Panel <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase">{userRole}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Platform Administration Shell</p>
        </div>
      </div>

      {/* Topbar Global Search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 w-80">
        <HiOutlineSearch className="h-4 w-4 text-slate-500" />
        <input
          onChange={(e) => {
            const query = e.target.value;
            // Navigate to users or workspaces or overview with search query
            if (query.trim()) {
              navigate(`/admin/users?q=${encodeURIComponent(query)}`);
            }
          }}
          placeholder="Search users/workspaces..."
          className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-600 w-full"
        />
      </div>

      {/* Topbar Actions */}
      <div className="flex items-center gap-4 text-xs font-semibold">
        {/* Notifications Icon Placeholder */}
        <button className="text-slate-400 hover:text-white transition relative">
          <HiOutlineBell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-cyan-500 rounded-full border border-slate-900" />
        </button>

        {/* User Identity Profile Card & Dropdown */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-900 transition"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">{currentUserName}</span>
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl text-left">
              <div className="px-1 py-2">
                <p className="text-sm font-bold text-white leading-tight">{currentUserName}</p>
                <p className="text-xs text-slate-400 mt-1 truncate">{currentUserEmail}</p>
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
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition text-left"
                >
                  <HiOutlineCog className="h-4.5 w-4.5 text-slate-400" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin/security');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition text-left"
                >
                  <HiOutlineLockClosed className="h-4.5 w-4.5 text-slate-400" />
                  <span>Security</span>
                </button>
                <div className="my-2 border-t border-white/10" />
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleSignOut();
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
      </div>
    </header>
  );
};

export default AdminNavbar;
