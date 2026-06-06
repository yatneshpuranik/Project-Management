import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = ({ isSidebarOpen, closeSidebar }) => {
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
          fixed top-[73px] bottom-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950 p-4 transition-transform duration-300 ease-in-out md:static md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-[calc(100vh-73px)]
        `}
      >
        <Sidebar onLinkClick={closeSidebar} />
      </aside>

      {/* Main Panel */}
      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-950/40 h-[calc(100vh-73px)]">
        <div className="flex-1 w-full p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
