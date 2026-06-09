import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineViewBoards,
  HiOutlineLogout,
  HiOutlineUser,
  HiOutlineSearch
} from 'react-icons/hi';
import { toast } from '../../../../utils/toast';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@admin.com';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    <header className="sticky top-0 z-50 border-b border-white/6 bg-slate-950/95 backdrop-blur-xl shadow-xl shadow-black/20 h-[73px] flex items-center">
      <div className="w-full flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 hover:scale-105 transition">
            <HiOutlineViewBoards className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white leading-none">WORKSYNC</p>
          </div>
        </div>

        {/* Center: Search Visual Placeholder (to match User Navbar structure) */}
        <div className="hidden md:flex flex-1 max-w-xs mx-6 relative">
          <div className="premium-search-container w-full relative z-10 pointer-events-auto">
            <HiOutlineSearch className="h-4 w-4 text-slate-400 flex-shrink-0 mr-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admin shell..."
              className="premium-search-input text-xs relative z-20 pointer-events-auto cursor-text"
            />
            <span className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-slate-950 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 ml-2 pointer-events-none">
              <kbd className="font-sans">⌘</kbd>
              <kbd className="font-sans">K</kbd>
            </span>
          </div>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* User Identity Profile Card & Dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-1.5 transition hover:bg-slate-800"
            >
              <img
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/profile');
                }}
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`}
                alt={currentUserName}
                className="h-7 w-7 rounded-full object-cover border border-white/10 hover:scale-105 transition"
              />
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
