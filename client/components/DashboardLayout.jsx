import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { motion } from 'framer-motion';
import Footer from './Footer';

const DashboardLayout = ({ isSidebarOpen, closeSidebar }) => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  if (isAdminPath) {
    return (
      <div className="flex flex-1 w-full overflow-hidden relative">
        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-950 h-screen w-full">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 w-full overflow-hidden relative">
      {/* Backdrop for mobile/tablet drawer */}
      {isSidebarOpen && (
        <div 
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}

      {/* Left Sidebar */}
      <aside 
        className={`
          fixed top-[73px] bottom-0 left-0 z-40 w-72 border-r border-white/6 bg-slate-950/45 backdrop-blur-xl p-4 transition-transform duration-300 ease-in-out md:static md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-[calc(100vh-73px)]
        `}
      >
        <Sidebar onLinkClick={closeSidebar} />
      </aside>

      {/* Main Panel */}
      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-950/40 h-[calc(100vh-73px)]">
        <div className="flex-1 w-full p-4 md:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 w-full"
          >
            <Outlet />
          </motion.div>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default DashboardLayout;
