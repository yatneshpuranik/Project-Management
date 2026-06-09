import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { HiOutlineChatAlt, HiOutlinePaperAirplane } from 'react-icons/hi';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/boards');
      }
    }
  }, [user, navigate]);

  // Mouse Parallax System
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 80, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 22 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  // Parallax transforms for different depths
  const bgGlowX1 = useTransform(springX, (value) => value * 25);
  const bgGlowY1 = useTransform(springY, (value) => value * 25);
  const bgGlowX2 = useTransform(springX, (value) => value * -15);
  const bgGlowY2 = useTransform(springY, (value) => value * -15);

  const card1X = useTransform(springX, (value) => value * 12);
  const card1Y = useTransform(springY, (value) => value * 12);
  const card2X = useTransform(springX, (value) => value * -16);
  const card2Y = useTransform(springY, (value) => value * -16);
  const card3X = useTransform(springX, (value) => value * 18);
  const card3Y = useTransform(springY, (value) => value * 18);
  const card4X = useTransform(springX, (value) => value * -10);
  const card4Y = useTransform(springY, (value) => value * -10);
  const card5X = useTransform(springX, (value) => value * 14);
  const card5Y = useTransform(springY, (value) => value * 14);

  // Floating Loop Variants (asynchronous speeds and timings)
  const floatY1 = {
    animate: { y: [0, -10, 0] },
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
  };
  const floatY2 = {
    animate: { y: [0, 14, 0] },
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' }
  };
  const floatY3 = {
    animate: { y: [0, -12, 0] },
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
  };
  const floatY4 = {
    animate: { y: [0, 8, 0] },
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }
  };
  const floatY5 = {
    animate: { y: [0, -7, 0] },
    transition: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }
  };

  // Staggered Load Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 90, damping: 18 }
    }
  };

  const rightVisualVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 70, damping: 20, delay: 0.4 }
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen text-white relative overflow-hidden flex flex-col justify-center select-none"
      style={{
        backgroundColor: '#070B14',
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }}
    >
      {/* Background Glow Blobs */}
      <motion.div
        style={{ x: bgGlowX1, y: bgGlowY1 }}
        className="absolute top-[10%] left-[15%] w-[450px] h-[450px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none z-0"
      />
      <motion.div
        style={{ x: bgGlowX2, y: bgGlowY2 }}
        className="absolute bottom-[15%] right-[10%] w-[550px] h-[550px] rounded-full bg-violet-600/10 blur-[160px] pointer-events-none z-0"
      />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

          {/* Left Hero Typography */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.p
              variants={textVariants}
              className="inline-flex rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.34em] text-sky-200"
            >
              Agile collaboration
            </motion.p>

            <motion.h1
              variants={textVariants}
              className="text-5xl font-bold tracking-tight text-white sm:text-6xl bg-clip-text bg-gradient-to-r from-white via-white to-slate-400"
            >
              Build smarter boards and move work faster.
            </motion.h1>

            <motion.p
              variants={textVariants}
              className="max-w-2xl text-lg leading-8 text-slate-300"
            >
              Sign in to access your live kanban workspace, manage tasks in real time, and collaborate with your team on a polished project dashboard.
            </motion.p>

            <motion.div
              variants={textVariants}
              className="flex flex-col gap-4 sm:flex-row pt-2"
            >
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, y: -2, boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200"
              >
                Login to continue
              </motion.button>
              <motion.button
                onClick={() => navigate('/boards')}
                whileHover={{ scale: 1.03, y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-slate-100 transition-all duration-200"
              >
                Explore boards
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Hero Visual Animation composition */}
          <motion.div
            variants={rightVisualVariants}
            initial="hidden"
            animate="visible"
            className="relative h-[480px] w-full flex items-center justify-center lg:h-[520px]"
          >
            {/* 1. Workspace Created Card */}
            <motion.div
              style={{ x: card1X, y: card1Y }}
              className="absolute left-[-2%] top-[8%] z-10 w-64 cursor-pointer"
            >
              <motion.div
                variants={floatY1}
                animate="animate"
                whileHover={{ scale: 1.03, y: -4, borderColor: 'rgba(56, 189, 248, 0.35)' }}
                className="bg-[#111827]/80 backdrop-blur-md border border-white/8 rounded-2xl p-4 shadow-xl shadow-slate-950/40 transition-colors duration-200"
              >
                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-sky-400">Workspace Created</span>
                <h4 className="text-xs font-bold text-slate-100 mt-1">🚀 Mobile App Development</h4>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-slate-400">Created by yatneshpuranik@gmail.com</span>
                </div>
              </motion.div>
            </motion.div>

            {/* 2. Task Assigned Card */}
            <motion.div
              style={{ x: card2X, y: card2Y }}
              className="absolute right-[-2%] top-[18%] z-20 w-64 cursor-pointer"
            >
              <motion.div
                variants={floatY2}
                animate="animate"
                whileHover={{ scale: 1.03, y: -4, borderColor: 'rgba(56, 189, 248, 0.35)' }}
                className="bg-[#151D31]/85 backdrop-blur-md border border-sky-500/15 rounded-2xl p-4 shadow-2xl shadow-slate-950/50 transition-colors duration-200"
              >
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-[#EF4444] border border-rose-500/20 uppercase tracking-wider">High</span>
                  <span className="text-[9px] font-bold text-slate-400">In Progress</span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 mt-2">Refactor Global Search</h4>
                <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2 text-[9px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-4.5 w-4.5 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-[7px] font-extrabold text-sky-400">Y</span>
                    <span>Yatnesh</span>
                  </div>
                  <span className="text-[#14F195] font-bold">100% Progress</span>
                </div>
              </motion.div>
            </motion.div>

            {/* 3. Comment Added Card */}
            <motion.div
              style={{ x: card3X, y: card3Y }}
              className="absolute left-[5%] bottom-[16%] z-30 w-[250px] cursor-pointer"
            >
              <motion.div
                variants={floatY3}
                animate="animate"
                whileHover={{ scale: 1.03, y: -4, borderColor: 'rgba(139, 92, 246, 0.35)' }}
                className="bg-[#111827]/85 backdrop-blur-md border border-white/8 rounded-2xl p-4 shadow-xl shadow-slate-950/40 transition-colors duration-200"
              >
                <div className="flex items-center gap-1">
                  <HiOutlineChatAlt className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-violet-400">Comment Added</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed italic">"Great job on database indexing! Sockets are online."</p>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-[8px] text-slate-500 font-semibold">
                  <span>yp@gmail.com</span>
                  <span className="text-emerald-400">Seen by teammates</span>
                </div>
              </motion.div>
            </motion.div>

            {/* 4. Notification Card */}
            <motion.div
              style={{ x: card4X, y: card4Y }}
              className="absolute right-[2%] bottom-[12%] z-15 w-64 cursor-pointer"
            >
              <motion.div
                variants={floatY4}
                animate="animate"
                whileHover={{ scale: 1.03, y: -4, borderColor: 'rgba(20, 241, 149, 0.35)' }}
                className="bg-[#151D31]/85 backdrop-blur-md border border-white/8 rounded-2xl p-4 shadow-xl shadow-slate-950/45 transition-colors duration-200"
              >
                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#14F195]">Notification</span>
                <div className="flex items-start gap-2.5 mt-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[#14F195] border border-emerald-500/25 text-[10px]">✓</div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-100">Invitation Accepted</p>
                    <p className="text-[9px] text-slate-400"> yatnesh joined the board</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* 5. Teammate Active Card */}
            <motion.div
              style={{ x: card5X, y: card5Y }}
              className="absolute left-[30%] top-[34%] z-25 w-52 cursor-pointer"
            >
              <motion.div
                variants={floatY5}
                animate="animate"
                whileHover={{ scale: 1.03, y: -4, borderColor: 'rgba(56, 189, 248, 0.35)' }}
                className="bg-[#111827]/90 backdrop-blur-md border border-sky-500/15 rounded-2xl p-3.5 shadow-xl shadow-slate-950/45 flex items-center gap-3 transition-colors duration-200"
              >
                <div className="relative flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center text-[10px] font-extrabold text-white">
                    A
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#14F195] ring-2 ring-slate-950" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-100">Agent</h4>
                  <p className="text-[8px] text-[#14F195] font-semibold mt-0.5 tracking-wider uppercase">Active Live</p>
                </div>
              </motion.div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;
