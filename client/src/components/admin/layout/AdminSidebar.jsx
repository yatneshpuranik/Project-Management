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
    { path: '/admin/analytics', label: 'Analytics', icon: HiOutlineChartBar },
    { path: '/admin/security', label: 'Security Center', icon: HiOutlineLockClosed },
    { path: '/admin/role-management', label: 'Role Management', icon: HiOutlineShieldCheck },
    { path: '/admin/system-health', label: 'System Health', icon: HiOutlineStatusOnline },
    { path: '/admin/access-control', label: 'Access Control', icon: HiOutlineShieldCheck },
    { path: '/admin/settings', label: 'Settings', icon: HiOutlineCog },
  ];

  return (
    <aside className="w-72 bg-slate-950 border-r border-white/10 p-4 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Console Directory</p>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => 
                    `w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left border ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-500 border-blue-500/20' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border-transparent'
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
      </div>

      <div className="space-y-4">
        {/* Profile Card Header */}
        <AdminProfileCard />
        
        {/* System Footer Info */}
        <div className="pt-4 border-t border-white/5">
          <div className="rounded-xl bg-slate-900/40 p-3 border border-white/5 text-[10px] text-slate-500 font-semibold space-y-1">
            <p className="flex items-center gap-1.5"><HiOutlineTerminal className="h-3.5 w-3.5 text-blue-500" /> API Port: 8000</p>
            <p className="flex items-center gap-1.5"><HiOutlineDatabase className="h-3.5 w-3.5 text-blue-500" /> DB Connected: practice_db</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
