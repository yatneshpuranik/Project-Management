import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { HiOutlineUser, HiOutlineFolder, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineUserRemove, HiOutlineTrash, HiOutlineSparkles, HiOutlineStatusOnline } from 'react-icons/hi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeSection, setActiveSection] = useState('stats'); // 'stats', 'users', 'workspaces'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search states
  const [userQuery, setUserQuery] = useState('');
  const [workspaceQuery, setWorkspaceQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, workspacesRes] = await Promise.all([
        axiosInstance.get('/admin/stats'),
        axiosInstance.get('/admin/users'),
        axiosInstance.get('/admin/workspaces')
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setWorkspaces(workspacesRes.data.workspaces || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleBlockUser = async (userId, userName) => {
    const reason = window.prompt(`Enter block reason for ${userName}:`, 'Violating workspace policy');
    if (reason === null) return;
    try {
      await axiosInstance.post(`/user/block/${userId}`, { reason });
      alert('User blocked successfully.');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to unblock this user?')) return;
    try {
      await axiosInstance.post(`/user/unblock/${userId}`);
      alert('User unblocked successfully.');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete user ${userName}? This will remove them from all workspaces and unassign all their tasks.`)) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      alert('User deleted permanently.');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteWorkspace = async (boardId, boardTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete workspace "${boardTitle}" and all its tasks? This action cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/admin/workspaces/${boardId}`);
      alert('Workspace deleted permanently.');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-3xl bg-slate-950/80 px-8 py-6 text-xl font-semibold shadow-2xl shadow-slate-950/40">
          Loading Admin Control Console...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-3xl bg-rose-950/80 px-8 py-6 text-xl font-semibold text-rose-400 shadow-2xl shadow-slate-950/40">
          Error: {error}
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredWorkspaces = workspaces.filter(w => 
    w.title?.toLowerCase().includes(workspaceQuery.toLowerCase()) || 
    w.createdBy?.name?.toLowerCase().includes(workspaceQuery.toLowerCase())
  );

  // SVG growth line chart calculations
  let maxCount = 1;
  let growthPoints = [];
  let growthLabels = [];
  if (stats?.growth && stats.growth.length > 0) {
    maxCount = Math.max(...stats.growth.map(g => g.count), 1);
    growthPoints = stats.growth.map((g, idx) => `${40 + idx * 70},${150 - (g.count / maxCount) * 110}`);
    growthLabels = stats.growth.map((g, idx) => ({ label: g.dayLabel, x: 40 + idx * 70 }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Admin Control Panel</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Platform Administration</h1>
          <p className="mt-1 text-xs text-slate-400">
            Moderate users, monitor workspaces, track server stats, and manage global platform growth.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1 self-start md:self-auto">
          <button 
            onClick={() => setActiveSection('stats')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'stats' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Stats
          </button>
          <button 
            onClick={() => setActiveSection('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'users' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveSection('workspaces')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'workspaces' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Workspaces
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            <HiOutlineUser className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">{stats?.totalUsers || 0}</div>
          <p className="mt-1 text-[10px] text-slate-500">Registered accounts</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Workspaces</span>
            <HiOutlineFolder className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">{stats?.totalWorkspaces || 0}</div>
          <p className="mt-1 text-[10px] text-slate-500">Active project boards</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Tasks</span>
            <HiOutlineChartBar className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">{stats?.totalTasks || 0}</div>
          <p className="mt-1 text-[10px] text-slate-500">Across all workspaces</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Users</span>
            <HiOutlineStatusOnline className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">{stats?.activeUsers || 0}</div>
          <p className="mt-1 text-[10px] text-slate-500">Online, Away, or Busy now</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Blocked</span>
            <HiOutlineUserRemove className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">{stats?.blockedUsers || 0}</div>
          <p className="mt-1 text-[10px] text-slate-500">Accounts restricted</p>
        </div>
      </div>

      {/* Main Section Content */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm min-h-[40vh]">
        {activeSection === 'stats' && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Growth Chart */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Platform Growth</h3>
                <p className="text-[10px] text-slate-400">New registered users in the last 7 days.</p>
              </div>

              <div className="h-52 w-full bg-slate-950/40 rounded-xl p-3 border border-white/5 relative">
                <svg viewBox="0 0 500 170" className="w-full h-full text-slate-700">
                  {/* Grid Lines */}
                  <line x1="40" y1="150" x2="460" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="40" y1="40" x2="460" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                  {/* Growth Line */}
                  {growthPoints.length > 0 && (
                    <>
                      <path
                        d={`M ${growthPoints.join(' L ')}`}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {stats.growth.map((g, idx) => (
                        <circle
                          key={idx}
                          cx={40 + idx * 70}
                          cy={150 - (g.count / maxCount) * 110}
                          r="4.5"
                          className="fill-sky-400 stroke-slate-950 stroke-2"
                        />
                      ))}
                    </>
                  )}

                  {/* Labels */}
                  {growthLabels.map((l, idx) => (
                    <text
                      key={idx}
                      x={l.x}
                      y="165"
                      textAnchor="middle"
                      className="fill-slate-500 text-[8px] font-bold"
                    >
                      {l.label}
                    </text>
                  ))}
                  <text x="30" y="44" textAnchor="end" className="fill-slate-500 text-[8px] font-bold">{maxCount}</text>
                  <text x="30" y="154" textAnchor="end" className="fill-slate-500 text-[8px] font-bold">0</text>
                </svg>
              </div>
            </div>

            {/* Platform Quick Links & Health */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">System Diagnostics</h3>
                <p className="text-[10px] text-slate-400">Database and connection health statistics.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Server status</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-400">Healthy</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Database</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-200">MongoDB Connected</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Socket.io connection</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-200">Active Pool</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Admin credentials</span>
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-bold text-sky-400">Privileged Account</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeSection === 'users' && (
          <div className="space-y-4">
            
            {/* Search inputs */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Registered Users</h3>
                <p className="text-[10px] text-slate-400">Search, promote, block, or permanently delete accounts.</p>
              </div>
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full sm:w-80 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
              />
            </div>

            {/* User card list */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <article key={user._id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex flex-col justify-between min-h-[160px] text-xs">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm">{user.name}</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] uppercase ${user.role === 'ADMIN' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : user.role === 'OWNER' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>
                              {user.role}
                            </span>
                            {user.isBlocked && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[8px] uppercase">Blocked</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{user.email}</p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold flex items-center justify-center">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      
                      {user.isBlocked && user.reason && (
                        <p className="mt-2 text-rose-400 italic text-[10px] bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                          Block Reason: "{user.reason}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500">Presence: <strong className="text-slate-400">{user.presenceStatus || 'Offline'}</strong></span>
                      <div className="flex gap-1.5">
                        {user.email !== 'yatnesh@admin.com' && (
                          <>
                            {user.isBlocked ? (
                              <button 
                                onClick={() => handleUnblockUser(user._id)}
                                className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/25 rounded-lg text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold transition text-[10px] cursor-pointer"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleBlockUser(user._id, user.name)}
                                className="px-2 py-1 bg-rose-500/15 border border-rose-500/25 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white font-bold transition text-[10px] cursor-pointer"
                              >
                                Block
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              className="px-2 py-1 bg-red-600/15 border border-red-500/25 rounded-lg text-red-400 hover:bg-red-600 hover:text-white font-bold transition text-[10px] cursor-pointer"
                            >
                              <HiOutlineTrash className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-slate-500">No matching users found.</div>
              )}
            </div>

          </div>
        )}

        {activeSection === 'workspaces' && (
          <div className="space-y-4">
            
            {/* Search inputs */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">All Platform Workspaces</h3>
                <p className="text-[10px] text-slate-400">Monitor projects and delete inactive workspaces globally.</p>
              </div>
              <input
                value={workspaceQuery}
                onChange={(e) => setWorkspaceQuery(e.target.value)}
                placeholder="Search workspaces by title or owner..."
                className="w-full sm:w-80 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
              />
            </div>

            {/* Workspace lists */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.length > 0 ? (
                filteredWorkspaces.map((ws) => (
                  <article key={ws._id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex flex-col justify-between min-h-[160px] text-xs">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate max-w-[150px]">{ws.title}</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] uppercase ${ws.visibility === 'public' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                              {ws.visibility || 'private'}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-1 line-clamp-2 leading-relaxed">
                            {ws.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center">
                          <HiOutlineFolder className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-[10px] text-slate-500">Owner: <strong className="text-slate-300">{ws.createdBy?.name || 'Unknown'}</strong></p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Members: <strong className="text-slate-300">{ws.members?.length || 0}</strong></p>
                      </div>
                      <button 
                        onClick={() => handleDeleteWorkspace(ws._id, ws.title)}
                        className="px-2.5 py-1.5 bg-red-600/15 border border-red-500/25 rounded-xl text-red-400 hover:bg-red-600 hover:text-white font-bold transition text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <HiOutlineTrash className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-slate-500">No matching workspaces found.</div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
