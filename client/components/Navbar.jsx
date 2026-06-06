import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axiosInstance from '../utils/axiosInstance'
import { setUser } from '../redux/userSlice.js'
import { HiOutlineBell, HiOutlineSun, HiOutlineMoon, HiOutlineViewBoards, HiOutlineMenu } from 'react-icons/hi';

const Navbar = ({ darkMode, setDarkMode, toggleSidebar }) => {
  const [activeBoardName, setActiveBoardName] = useState('My Workspace');
  const [onlineCount, setOnlineCount] = useState(0);
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [userName, setUserName] = useState('Guest');

  useEffect(() => {
    const currentBoard = localStorage.getItem('activeBoardName')
    const currentCount = Number(localStorage.getItem('onlineCount') || 0)
    const storedName = localStorage.getItem('userName')
    if (currentBoard) setActiveBoardName(currentBoard)
    if (storedName) setUserName(storedName)
    setOnlineCount(currentCount)
  }, [])

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/user/logout')
    } catch (e) {
      // ignore
    }
    // Clear client state
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    dispatch(setUser(null))
    navigate('/login')
  }

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
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">Workspace</p>
              <h1 className="text-sm font-semibold text-white leading-none mt-1">{activeBoardName}</h1>
            </div>
          </Link>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:bg-slate-800">
            <HiOutlineBell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-slate-950">{onlineCount}</span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
          >
            {darkMode ? <HiOutlineSun className="h-5 w-5" /> : <HiOutlineMoon className="h-5 w-5" />}
          </button>
          
          {user ? (
            <>
              <div 
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-1.5 transition hover:bg-slate-800" 
                onClick={() => navigate('/profile')}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-bold">
                  {(user?.name || userName)?.charAt(0) || 'U'}
                </span>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white">{user?.name || userName || 'User'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 md:inline-flex"
              >
                Sign out
              </button>
            </>
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
