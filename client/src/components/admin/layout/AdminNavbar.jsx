import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineViewBoards,
  HiOutlineLogout,
  HiOutlineUser,
  HiOutlineSearch
} from 'react-icons/hi';
import { toast } from '../../../../utils/toast';
import axiosInstance from '../../../../utils/axiosInstance';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@admin.com';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

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
    
    if (selected.type === 'user') {
      navigate(`/admin/users?userId=${selected.data._id}`);
    } else if (selected.type === 'workspace') {
      navigate(`/admin/workspaces?boardId=${selected.data._id}`);
    } else if (selected.type === 'task') {
      navigate(`/admin/tasks?q=${encodeURIComponent(selected.data.title)}`);
    } else if (selected.type === 'channel') {
      navigate(`/admin/workspaces?boardId=${selected.data.boardId}`);
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
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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

        {/* Center: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xs mx-6 relative" ref={searchRef}>
          <div className="premium-search-container w-full flex items-center relative z-10 pointer-events-auto">
            <HiOutlineSearch className="h-4 w-4 text-slate-400 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search workspaces, tasks, users..."
              className="premium-search-input text-xs flex-1 bg-transparent text-white border-none outline-none cursor-text"
            />
          </div>

          {/* Search dropdown menu */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl max-h-[350px] overflow-y-auto custom-scrollbar">
              {searching ? (
                <div className="text-slate-455 text-center py-4 text-[11px] flex items-center justify-center gap-2">
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
