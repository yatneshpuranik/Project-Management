import { NavLink } from 'react-router-dom';
import { 
  HiOutlineSparkles, 
  HiOutlineUser, 
  HiOutlineFolder, 
  HiOutlineChartBar, 
  HiOutlineMailOpen, 
  HiOutlineLockClosed, 
  HiOutlineClock, 
  HiOutlineShieldCheck, 
  HiOutlineStatusOnline, 
  HiOutlineCog,
  HiOutlineTerminal,
  HiOutlineDatabase
} from 'react-icons/hi';
import AdminProfileCard from './AdminProfileCard';

const AdminSidebar = () => {
  const sidebarItems = [
    { path: '/admin', label: 'Overview', icon: HiOutlineSparkles, end: true },
    { path: '/admin/users', label: 'Users', icon: HiOutlineUser },
    { path: '/admin/workspaces', label: 'Workspaces', icon: HiOutlineFolder },
    { path: '/admin/tasks', label: 'Tasks', icon: HiOutlineChartBar },
    { path: '/admin/invites', label: 'Invites', icon: HiOutlineMailOpen },
    { path: '/admin/analytics', label: 'Platform Analytics', icon: HiOutlineChartBar },
    { path: '/admin/security', label: 'Security Center', icon: HiOutlineLockClosed },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: HiOutlineClock },
    { path: '/admin/role-management', label: 'Role Management', icon: HiOutlineShieldCheck },
    { path: '/admin/system-health', label: 'System Health', icon: HiOutlineStatusOnline },
    { path: '/admin/settings', label: 'Settings', icon: HiOutlineCog },
  ];

  return (
    <aside className="w-64 bg-slate-900/40 border-r border-white/10 p-5 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 px-3 mb-3">CONSOLE DIRECTORY</p>
        <nav className="space-y-1.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => 
                  `w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition text-left ${
                    isActive 
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        {/* Profile Card Header */}
        <AdminProfileCard />
        
        {/* System Footer Info */}
        <div className="pt-4 border-t border-white/5 text-[10px] text-slate-600 font-semibold space-y-1">
          <p className="flex items-center gap-1"><HiOutlineTerminal className="h-3.5 w-3.5" /> API Port: 8000</p>
          <p className="flex items-center gap-1"><HiOutlineDatabase className="h-3.5 w-3.5" /> DB Connected: practice_db</p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
