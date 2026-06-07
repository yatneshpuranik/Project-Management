import { useNavigate } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineSearch, HiOutlineLogout, HiOutlineBell } from 'react-icons/hi';
import { toast } from '../../../../utils/toast';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const currentUserName = localStorage.getItem('userName') || 'Admin';

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

        {/* User Identity Profile Card */}
        <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer" onClick={() => navigate('/admin/settings')}>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400">{currentUserName}</span>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <HiOutlineLogout className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default AdminNavbar;
