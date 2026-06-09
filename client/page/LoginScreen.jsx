import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice.js';
import axiosInstance from '../utils/axiosInstance.js';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight, HiOutlineViewBoards } from 'react-icons/hi';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

const LoginScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isRegister && (!name.trim() || !email.trim() || !password.trim())) {
      setError('All fields are required for registration.');
      setLoading(false);
      return;
    }

    if (!isRegister && (!email.trim() || !password.trim())) {
      setError('Email/Username and password are required.');
      setLoading(false);
      return;
    }

    const payload = isRegister ? { name, email, password } : { email, password };

    try {
      const result = await axiosInstance.post(
        `/user/${isRegister ? 'register' : 'login'}`,
        payload
      );

      if (isRegister) {
        setSuccess('Registration successful! Logging you in...');
        setTimeout(() => {
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('userId', result.data.user._id);
          localStorage.setItem('userName', result.data.user.name);
          localStorage.setItem('userEmail', result.data.user.email);
          const role = result.data.user.role || 'USER';
          localStorage.setItem('userRole', role);
          dispatch(setUser(result.data.user));
          if (role === 'ADMIN') {
            navigate('/admin');
          } else {
            navigate('/boards');
          }
        }, 1200);
      } else {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('userId', result.data.user._id);
        localStorage.setItem('userName', result.data.user.name);
        localStorage.setItem('userEmail', result.data.user.email);
        const role = result.data.user.role || 'USER';
        localStorage.setItem('userRole', role);
        dispatch(setUser(result.data.user));
        if (role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/boards');
        }
      }
    } catch (err) {
      console.error('Auth request failed:', err);
      const networkMessage =
        err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')
          ? 'Network Error: Unable to reach the authentication server. Check backend status and your connection.'
          : err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')
            ? 'Backend Offline: Unable to connect to the server. Please start the backend and try again.'
            : null;
      const statusMessage = err.response
        ? err.response.status === 401
          ? err.response.data?.message || 'Invalid Credentials: Email/username or password is incorrect.'
          : err.response.status === 404
            ? 'Server Error: Authentication endpoint not found.'
            : err.response.status >= 500
              ? 'Server Error: An error occurred on the backend. Please try again later.'
              : err.response.data?.message
        : null;

      setError(networkMessage || statusMessage || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Mouse Parallax System
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 85, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 85, damping: 20 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  // Parallax offsets for elements (very subtle, max 8px for card, 24px for glow)
  const glowX1 = useTransform(springX, (value) => value * 24);
  const glowY1 = useTransform(springY, (value) => value * 24);
  const glowX2 = useTransform(springX, (value) => value * -20);
  const glowY2 = useTransform(springY, (value) => value * -20);
  const cardX = useTransform(springX, (value) => value * 8);
  const cardY = useTransform(springY, (value) => value * 8);

  // Stagger entry animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-16 overflow-hidden select-none"
      style={{
        backgroundColor: '#050816',
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }}
    >
      {/* Background radial glow blobs using Design System colors */}
      <motion.div 
        style={{ x: glowX1, y: glowY1 }}
        className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#38BDF8]/5 blur-[120px] pointer-events-none z-0"
      />
      <motion.div 
        style={{ x: glowX2, y: glowY2 }}
        className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#0B1220]/80 blur-[100px] pointer-events-none z-0"
      />

      {/* Main Glassmorphic Card */}
      <div 
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        className="w-full max-w-lg rounded-[32px] bg-[#111827]/80 p-8 backdrop-blur-xl shadow-2xl shadow-slate-950/50 z-10"
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="text-center mb-8 flex flex-col items-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.04, 1],
                boxShadow: [
                  '0 10px 15px -3px rgba(56, 189, 248, 0.15)',
                  '0 15px 25px -5px rgba(56, 189, 248, 0.3)',
                  '0 10px 15px -3px rgba(56, 189, 248, 0.15)'
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B1220] border border-[rgba(255,255,255,0.08)] text-[#38BDF8]"
            >
              <HiOutlineViewBoards className="h-8 w-8 text-[#38BDF8]" />
            </motion.div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#F8FAFC]">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              {isRegister
                ? 'Join our workspace to collaborate on tasks in real-time.'
                : 'Sign in to access your collaborative boards.'}
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              >
                {success}
              </motion.div>
            )}

            {/* Inputs Container */}
            <div className="space-y-4">
              <AnimatePresence initial={false} mode="popLayout">
                {isRegister && (
                  <motion.div
                    key="name-input"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    className="relative overflow-hidden"
                  >
                    <span className="absolute inset-y-0 left-4 flex items-center text-[#94A3B8] z-10">
                      <HiOutlineUser className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#38BDF8]/80 focus:ring-4 focus:ring-[#38BDF8]/10 focus:bg-slate-950/90"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants} className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-[#94A3B8] z-10">
                  <HiOutlineMail className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder={isRegister ? 'Email Address' : 'Email or Username'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#38BDF8]/80 focus:ring-4 focus:ring-[#38BDF8]/10 focus:bg-slate-950/90"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-[#94A3B8] z-10">
                  <HiOutlineLockClosed className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#38BDF8]/80 focus:ring-4 focus:ring-[#38BDF8]/10 focus:bg-slate-950/90"
                />
              </motion.div>
            </div>

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.025, y: -1.5, boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.25)' }}
                whileTap={{ scale: 0.985 }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#38BDF8] py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/10 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                    <HiOutlineArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Toggle Mode */}
          <motion.div variants={itemVariants} className="mt-6 text-center text-sm text-[#94A3B8]">
            {isRegister ? 'Already have an account?' : 'New to WorkSync?'}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setSuccess(null);
              }}
              className="ml-2 font-semibold text-[#38BDF8] hover:text-sky-300 focus:outline-none transition-colors"
            >
              {isRegister ? 'Sign In' : 'Register here'}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;
