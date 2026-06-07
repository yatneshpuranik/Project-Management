import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { 
  HiOutlineUser, 
  HiOutlineFolder, 
  HiOutlineChartBar, 
  HiOutlineCheckCircle, 
  HiOutlineUserRemove, 
  HiOutlineTrash, 
  HiOutlineSparkles, 
  HiOutlineStatusOnline,
  HiOutlineDatabase,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineCog,
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineTerminal,
  HiOutlineLockClosed,
  HiOutlineMailOpen,
  HiOutlineChevronRight,
  HiOutlineHeart,
  HiOutlineArrowCircleRight
} from 'react-icons/hi';
import { toast } from '../utils/toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || '';
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  
  // Protect Route Client-Side
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return <Navigate to="/boards" replace />;
  }

  const [activeSection, setActiveSection] = useState('overview'); // 12 tabs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for stats and data
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securitySummary, setSecuritySummary] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  
  // Sub-detail states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Search & Filters
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');

  // Form Inputs for administration actions
  const [newRoleVal, setNewRoleVal] = useState('');
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [forceAddUserId, setForceAddUserId] = useState('');
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');

  // Local settings settings
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    discordWebhooks: false,
    logLevel: 'error'
  });

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/admin/stats');
      setStats(res.data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await axiosInstance.get('/admin/workspaces');
      setWorkspaces(res.data.workspaces || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axiosInstance.get('/admin/tasks');
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axiosInstance.get('/admin/audit-logs');
      setAuditLogs(res.data.auditLogs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSecuritySummary = async () => {
    try {
      const res = await axiosInstance.get('/admin/security/summary');
      setSecuritySummary(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await axiosInstance.get('/admin/system-health');
      setSystemHealth(res.data.health);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchWorkspaces(),
        fetchTasks(),
        fetchAuditLogs(),
        fetchSecuritySummary(),
        fetchSystemHealth()
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize administrative panels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Poll system health every 15s
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeSection === 'health') {
        fetchSystemHealth();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [activeSection]);

  const handleSignOut = () => {
    localStorage.clear();
    toast.success('Logged out successfully.');
    window.location.href = '/login';
  };

  // User Actions
  const handleUpdateRole = async (userId, role) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/role`, { role });
      toast.success(`User role updated to ${role}`);
      fetchUsers();
      if (selectedUser?._id === userId) {
        setSelectedUser({ ...selectedUser, role });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleBlockUserToggle = async (userId, isBlocked) => {
    const reason = isBlocked ? (window.prompt('Enter block reason:') || 'Suspended by admin') : '';
    if (isBlocked && !reason) return;
    try {
      await axiosInstance.put(`/admin/users/${userId}/block`, { isBlocked, reason });
      toast.success(isBlocked ? 'User blocked.' : 'User unblocked.');
      fetchUsers();
      if (selectedUser?._id === userId) {
        setSelectedUser({ ...selectedUser, isBlocked, reason });
      }
      fetchSecuritySummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle block state');
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      await axiosInstance.post(`/admin/users/${userId}/logout`);
      toast.success('Forced user logout successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force logout');
    }
  };

  const handleResetAccess = async (userId) => {
    try {
      const res = await axiosInstance.post(`/admin/users/${userId}/reset`);
      toast.success(`Access reset! Temporary credentials: ${res.data.tempPassword || 'Reset successful'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset access');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure? This will permanently erase the user.')) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      toast.success('User deleted permanently.');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Workspace Actions
  const handleArchiveWorkspaceToggle = async (boardId, isArchived) => {
    try {
      await axiosInstance.put(`/admin/workspaces/${boardId}/archive`, { isArchived });
      toast.success(isArchived ? 'Workspace archived.' : 'Workspace restored.');
      fetchWorkspaces();
      if (selectedWorkspace?._id === boardId) {
        setSelectedWorkspace({ ...selectedWorkspace, isArchived });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle archive');
    }
  };

  const handleTransferOwnership = async (boardId) => {
    if (!transferOwnerId.trim()) return;
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/transfer-ownership`, { newOwnerId: transferOwnerId });
      toast.success('Ownership transferred successfully.');
      setTransferOwnerId('');
      fetchWorkspaces();
      setSelectedWorkspace(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ownership');
    }
  };

  const handleForceAddMember = async (boardId) => {
    if (!forceAddUserId.trim()) return;
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/members/add`, { userId: forceAddUserId });
      toast.success('Member added forcefully.');
      setForceAddUserId('');
      fetchWorkspaces();
      setSelectedWorkspace(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleForceRemoveMember = async (boardId, userId) => {
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/members/remove`, { userId });
      toast.success('Member removed forcefully.');
      fetchWorkspaces();
      setSelectedWorkspace(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteWorkspace = async (boardId) => {
    if (!window.confirm('Delete workspace permanently? This deletes all associated cards.')) return;
    try {
      await axiosInstance.delete(`/admin/workspaces/${boardId}`);
      toast.success('Workspace deleted.');
      setSelectedWorkspace(null);
      fetchWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  // Task Actions
  const handleReassignTask = async (taskId) => {
    if (!reassignUserId.trim()) return;
    try {
      await axiosInstance.put(`/admin/tasks/${taskId}/reassign`, { assigneeId: reassignUserId });
      toast.success('Task reassigned.');
      setReassignTaskId('');
      setReassignUserId('');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reassign task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axiosInstance.delete(`/admin/tasks/${taskId}`);
      toast.success('Task soft-deleted.');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await axiosInstance.put(`/admin/tasks/${taskId}/restore`);
      toast.success('Task restored.');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore task');
    }
  };

  // Growth points calculations
  let maxCount = 1;
  let growthPoints = [];
  let growthLabels = [];
  if (stats?.growth && stats.growth.length > 0) {
    maxCount = Math.max(...stats.growth.map(g => g.count), 1);
    growthPoints = stats.growth.map((g, idx) => `${40 + idx * 60},${140 - (g.count / maxCount) * 100}`);
    growthLabels = stats.growth.map((g, idx) => ({ label: g.dayLabel, x: 40 + idx * 60 }));
  }

  // Local tab filtering lists
  const filteredUsersList = users.filter(u => 
    u.name?.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredWorkspacesList = workspaces.filter(w => 
    w.title?.toLowerCase().includes(workspaceQuery.toLowerCase()) || 
    (w.createdBy?.name || '').toLowerCase().includes(workspaceQuery.toLowerCase())
  );

  const filteredTasksList = tasks.filter(t => 
    t.title?.toLowerCase().includes(taskQuery.toLowerCase())
  );

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return null;
    const query = globalSearchQuery.toLowerCase();
    return {
      users: users.filter(u => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)),
      workspaces: workspaces.filter(w => w.title?.toLowerCase().includes(query)),
      tasks: tasks.filter(t => t.title?.toLowerCase().includes(query)),
    };
  }, [globalSearchQuery, users, workspaces, tasks]);

  // Sidebar items definition
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: HiOutlineSparkles },
    { id: 'users', label: 'Users', icon: HiOutlineUser },
    { id: 'workspaces', label: 'Workspaces', icon: HiOutlineFolder },
    { id: 'tasks', label: 'Tasks', icon: HiOutlineChartBar },
    { id: 'invitations', label: 'Invitations', icon: HiOutlineMailOpen },
    { id: 'search', label: 'Global Search', icon: HiOutlineSearch },
    { id: 'analytics', label: 'Analytics', icon: HiOutlineChartBar },
    { id: 'security', label: 'Security Center', icon: HiOutlineLockClosed },
    { id: 'audit', label: 'Audit Logs', icon: HiOutlineClock },
    { id: 'roles', label: 'Role Management', icon: HiOutlineShieldCheck },
    { id: 'health', label: 'System Health', icon: HiOutlineStatusOnline },
    { id: 'settings', label: 'Settings', icon: HiOutlineCog },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-100">
        <div className="rounded-3xl bg-slate-900 border border-white/10 px-8 py-6 text-xl font-bold shadow-2xl flex flex-col items-center gap-3">
          <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          Loading administrative console data...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Topbar */}
      <header className="h-[73px] border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
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
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setActiveSection('search');
            }}
            placeholder="Global search entities..."
            className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-600 w-full"
          />
        </div>

        {/* Topbar Actions */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">{currentUserName}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <HiOutlineLogout className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/40 border-r border-white/10 p-4 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 px-3 mb-2">CONSOLE DIRECTORY</p>
            <div className="space-y-0.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSelectedUser(null);
                      setSelectedWorkspace(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      isActive 
                        ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Footer */}
          <div className="pt-4 border-t border-white/5 text-[10px] text-slate-600 font-semibold space-y-1">
            <p className="flex items-center gap-1"><HiOutlineTerminal className="h-3.5 w-3.5" /> API Port: 8000</p>
            <p className="flex items-center gap-1"><HiOutlineDatabase className="h-3.5 w-3.5" /> DB Connected: practice_db</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-4 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Tab 1: Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-white">Platform Health Overview</h2>
                <p className="text-xs text-slate-400">Platform statistics aggregated across all databases.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: 'Total Users', count: stats?.totalUsers, icon: HiOutlineUser, color: 'text-cyan-400' },
                  { label: 'Workspaces', count: stats?.totalWorkspaces, icon: HiOutlineFolder, color: 'text-indigo-400' },
                  { label: 'Total Tasks', count: stats?.totalTasks, icon: HiOutlineChartBar, color: 'text-amber-400' },
                  { label: 'Active Sockets', count: systemHealth?.activeSocketConnections || 0, icon: HiOutlineStatusOnline, color: 'text-emerald-400' },
                  { label: 'Restricted', count: stats?.blockedUsers, icon: HiOutlineUserRemove, color: 'text-rose-400' }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-slate-900/30 p-5">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">{card.label}</span>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div className="mt-4 text-3xl font-bold text-white">{card.count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Growth Chart & Quick Actions */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Platform Registrations Growth</h3>
                    <p className="text-[10px] text-slate-500">New user accounts created during the last 7 days.</p>
                  </div>
                  <div className="h-48 w-full bg-slate-950/60 rounded-xl p-3 border border-white/5 relative">
                    <svg viewBox="0 0 440 160" className="w-full h-full text-slate-800">
                      <line x1="30" y1="140" x2="420" y2="140" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="30" y1="40" x2="420" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      {growthPoints.length > 0 && (
                        <>
                          <path
                            d={`M ${growthPoints.join(' L ')}`}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {stats.growth.map((g, idx) => (
                            <circle
                              key={idx}
                              cx={40 + idx * 60}
                              cy={140 - (g.count / maxCount) * 100}
                              r="4"
                              className="fill-cyan-400 stroke-slate-950 stroke-2"
                            />
                          ))}
                        </>
                      )}
                      {growthLabels.map((l, idx) => (
                        <text key={idx} x={l.x} y="155" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">{l.label}</text>
                      ))}
                      <text x="25" y="44" textAnchor="end" className="fill-slate-500 text-[8px] font-bold">{maxCount}</text>
                      <text x="25" y="144" textAnchor="end" className="fill-slate-500 text-[8px] font-bold">0</text>
                    </svg>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Admin Quick Diagnostics</h3>
                    <p className="text-[10px] text-slate-500">Live heartbeat monitoring status.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-xl space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">MongoDB Status</p>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400">{systemHealth?.database || 'Healthy'}</span>
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-xl space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">API Gateway</p>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400">{systemHealth?.apiStatus || 'Healthy'}</span>
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-xl space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Uptime</p>
                      <span className="text-xs font-bold text-slate-300">{systemHealth?.uptime || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-xl space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Storage</p>
                      <span className="text-xs font-bold text-slate-300">{systemHealth?.storageUsage || '0 MB'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Users */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Users Moderation</h2>
                  <p className="text-xs text-slate-400">Manage user authorization and platform resource lockouts.</p>
                </div>
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search user profile..."
                  className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Users List */}
                <div className="md:col-span-2 space-y-3.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredUsersList.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                        selectedUser?._id === user._id
                          ? 'bg-cyan-500/10 border-cyan-500'
                          : 'bg-slate-900/30 border-white/5 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 text-white font-bold text-sm`}>
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-white text-xs flex items-center gap-1.5">
                            {user.name}
                            <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[8px] uppercase">{user.role}</span>
                            {user.isBlocked && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded text-[8px] uppercase">Blocked</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                      </div>
                      <HiOutlineChevronRight className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                  ))}
                </div>

                {/* User Details Sidebar */}
                <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5 space-y-4">
                  {selectedUser ? (
                    <>
                      <div className="flex items-center gap-3.5">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-lg font-bold">
                          {selectedUser.name?.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="font-bold text-white text-sm">{selectedUser.name}</h3>
                          <p className="text-[10px] text-slate-500">{selectedUser.email}</p>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-slate-400">
                        <p className="flex justify-between"><span>Status:</span> <span className="font-semibold text-slate-300">{selectedUser.presenceStatus || 'Offline'}</span></p>
                        <p className="flex justify-between"><span>User ID:</span> <span className="font-semibold text-slate-400 truncate max-w-[150px]">{selectedUser._id}</span></p>
                        <p className="flex justify-between"><span>Role:</span> <span className="font-semibold text-cyan-400">{selectedUser.role}</span></p>
                        {selectedUser.isBlocked && (
                          <div className="bg-rose-500/5 border border-rose-500/20 p-2.5 rounded-xl text-[10px] text-rose-400">
                            <strong>Blocked reason:</strong> "{selectedUser.reason || 'No reason provided.'}"
                          </div>
                        )}
                      </div>

                      {/* Admin User Actions */}
                      {selectedUser.email !== 'yatnesh@admin.com' && (
                        <div className="pt-4 border-t border-white/5 space-y-2.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Moderator Actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleBlockUserToggle(selectedUser._id, !selectedUser.isBlocked)}
                              className={`py-1.5 rounded-xl text-[10px] font-bold transition border ${
                                selectedUser.isBlocked 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'
                              }`}
                            >
                              {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                            </button>
                            <button
                              onClick={() => handleForceLogout(selectedUser._id)}
                              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
                            >
                              Force Logout
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleResetAccess(selectedUser._id)}
                              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
                            >
                              Reset Access
                            </button>
                            <button
                              onClick={() => handleDeleteUser(selectedUser._id)}
                              className="py-1.5 bg-rose-500/20 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold transition"
                            >
                              Delete User
                            </button>
                          </div>

                          {/* Role modification */}
                          <div className="space-y-1.5">
                            <label className="block text-[10px] uppercase font-bold text-slate-500">Alter User Role</label>
                            <div className="flex gap-2">
                              <select
                                value={newRoleVal || selectedUser.role}
                                onChange={(e) => setNewRoleVal(e.target.value)}
                                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
                              >
                                <option value="MEMBER">MEMBER</option>
                                <option value="OWNER">OWNER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                              <button
                                onClick={() => handleUpdateRole(selectedUser._id, newRoleVal || selectedUser.role)}
                                className="px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-xl transition"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 text-slate-500 text-xs italic">
                      Select a user from the list to view profile metadata and moderator options.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Workspaces */}
          {activeSection === 'workspaces' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Workspaces Registry</h2>
                  <p className="text-xs text-slate-400">Monitor all collaboration boards and moderate workspace assets.</p>
                </div>
                <input
                  value={workspaceQuery}
                  onChange={(e) => setWorkspaceQuery(e.target.value)}
                  placeholder="Search workspace..."
                  className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Workspaces List */}
                <div className="md:col-span-2 space-y-3.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredWorkspacesList.map((ws) => (
                    <div
                      key={ws._id}
                      onClick={async () => {
                        try {
                          const res = await axiosInstance.get(`/admin/workspaces/${ws._id}`);
                          setSelectedWorkspace(res.data.workspace);
                        } catch (e) {
                          setSelectedWorkspace(ws);
                        }
                      }}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                        selectedWorkspace?._id === ws._id
                          ? 'bg-cyan-500/10 border-cyan-500'
                          : 'bg-slate-900/30 border-white/5 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold`}>
                          <HiOutlineFolder className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-bold text-white text-xs flex items-center gap-1.5">
                            {ws.title}
                            <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[8px] uppercase">{ws.visibility}</span>
                            {ws.isArchived && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.2 rounded text-[8px] uppercase">Archived</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Created by: {ws.createdBy?.name || 'Owner'}</p>
                        </div>
                      </div>
                      <HiOutlineChevronRight className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                  ))}
                </div>

                {/* Workspace Details Sidebar */}
                <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5 space-y-4">
                  {selectedWorkspace ? (
                    <>
                      <div className="flex items-center gap-3.5">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <HiOutlineFolder className="h-6 w-6" />
                        </span>
                        <div>
                          <h3 className="font-bold text-white text-sm">{selectedWorkspace.title}</h3>
                          <p className="text-[10px] text-slate-500">Owner: {selectedWorkspace.createdBy?.name || 'Owner'}</p>
                        </div>
                      </div>

                      {selectedWorkspace.description && (
                        <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 italic">
                          "{selectedWorkspace.description}"
                        </p>
                      )}

                      <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-slate-400">
                        <p className="flex justify-between"><span>Workspace ID:</span> <span className="font-semibold text-slate-400 truncate max-w-[150px]">{selectedWorkspace._id}</span></p>
                        <p className="flex justify-between"><span>Members count:</span> <span className="font-semibold text-slate-300">{selectedWorkspace.members?.length || 0}</span></p>
                        <p className="flex justify-between"><span>Channels count:</span> <span className="font-semibold text-slate-300">{selectedWorkspace.channels?.length || 0}</span></p>
                      </div>

                      {/* Members list force management */}
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-slate-400">Current Members ({selectedWorkspace.members?.length || 0})</p>
                        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                          {selectedWorkspace.members?.map((m) => (
                            <div key={m._id} className="flex justify-between items-center p-1.5 rounded bg-slate-950 border border-white/5">
                              <span className="truncate max-w-[150px] font-semibold text-[11px]">{m.name}</span>
                              <button
                                onClick={() => handleForceRemoveMember(selectedWorkspace._id, m._id)}
                                className="text-rose-400 hover:underline text-[10px] font-bold"
                              >
                                Evict
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workspace Admin Actions */}
                      <div className="pt-4 border-t border-white/5 space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Actions</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleArchiveWorkspaceToggle(selectedWorkspace._id, !selectedWorkspace.isArchived)}
                            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition border border-white/5"
                          >
                            {selectedWorkspace.isArchived ? 'Restore Board' : 'Archive Board'}
                          </button>
                          <button
                            onClick={() => handleDeleteWorkspace(selectedWorkspace._id)}
                            className="py-1.5 bg-rose-500/20 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold transition"
                          >
                            Delete Board
                          </button>
                        </div>

                        {/* Force Add Member */}
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-slate-500">Force Add Member (User ID)</label>
                          <div className="flex gap-2">
                            <input
                              value={forceAddUserId}
                              onChange={(e) => setForceAddUserId(e.target.value)}
                              placeholder="Paste User ID..."
                              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
                            />
                            <button
                              onClick={() => handleForceAddMember(selectedWorkspace._id)}
                              className="px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-xl transition"
                            >
                              Inject
                            </button>
                          </div>
                        </div>

                        {/* Transfer ownership */}
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-slate-500">Transfer Ownership (User ID)</label>
                          <div className="flex gap-2">
                            <input
                              value={transferOwnerId}
                              onChange={(e) => setTransferOwnerId(e.target.value)}
                              placeholder="Paste User ID..."
                              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-cyan-500"
                            />
                            <button
                              onClick={() => handleTransferOwnership(selectedWorkspace._id)}
                              className="px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-xl transition"
                            >
                              Transfer
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20 text-slate-500 text-xs italic">
                      Select a workspace from the list to view members directory and moderation tools.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Tasks */}
          {activeSection === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Tasks Directory</h2>
                  <p className="text-xs text-slate-400">Reassign or soft-delete card tasks across all platform workspaces.</p>
                </div>
                <input
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
                />
              </div>

              {/* Tasks Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="p-4">Task Name</th>
                      <th className="p-4">Workspace</th>
                      <th className="p-4">Assigned To</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredTasksList.map((t) => (
                      <tr key={t._id} className="hover:bg-white/5">
                        <td className="p-4 font-bold text-white truncate max-w-[200px]">{t.title}</td>
                        <td className="p-4">{t.boardId?.title || 'Unknown Workspace'}</td>
                        <td className="p-4">
                          {reassignTaskId === t._id ? (
                            <div className="flex gap-1">
                              <input
                                placeholder="New Assignee ID..."
                                value={reassignUserId}
                                onChange={(e) => setReassignUserId(e.target.value)}
                                className="bg-slate-950 border border-white/10 px-2 py-1 rounded text-[11px]"
                              />
                              <button
                                onClick={() => handleReassignTask(t._id)}
                                className="bg-cyan-500 text-slate-950 font-bold px-2 rounded text-[10px]"
                              >
                                Set
                              </button>
                              <button
                                onClick={() => setReassignTaskId('')}
                                className="bg-slate-800 text-slate-400 px-2 rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{t.assignedTo?.name || 'Unassigned'}</span>
                              <button
                                onClick={() => {
                                  setReassignTaskId(t._id);
                                  setReassignUserId('');
                                }}
                                className="text-sky-400 hover:underline text-[10px]"
                              >
                                Reassign
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase">{t.status}</span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {t.isDeleted ? (
                            <button
                              onClick={() => handleRestoreTask(t._id)}
                              className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold hover:bg-emerald-500 hover:text-white"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteTask(t._id)}
                              className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-bold hover:bg-rose-500 hover:text-white"
                            >
                              Soft Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Invitations */}
          {activeSection === 'invitations' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Platform Invitations</h2>
                <p className="text-xs text-slate-400">View and audit active workspace invitations across all workspace groups.</p>
              </div>

              <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs italic">
                <HiOutlineMailOpen className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                No active pending workspace invitations currently registered. Invitation lifecycle is managed directly from the Workspace Directory.
              </div>
            </div>
          )}

          {/* Tab 6: Global Search */}
          {activeSection === 'search' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Global Database Search</h2>
                <p className="text-xs text-slate-400">Perform raw queries across all models simultaneously.</p>
              </div>

              <div className="flex gap-2 w-full max-w-md">
                <input
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Type entity keyword (Users, Workspace, Task)..."
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {globalSearchResults ? (
                <div className="space-y-6">
                  {/* Users results */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Matching Users ({globalSearchResults.users.length})</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {globalSearchResults.users.map(u => (
                        <div key={u._id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                          <span>{u.name} ({u.email})</span>
                          <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[9px]">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workspace results */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Matching Workspaces ({globalSearchResults.workspaces.length})</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {globalSearchResults.workspaces.map(w => (
                        <div key={w._id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                          <span>{w.title}</span>
                          <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[9px]">{w.visibility}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasks results */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Matching Tasks ({globalSearchResults.tasks.length})</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {globalSearchResults.tasks.map(t => (
                        <div key={t._id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                          <span className="truncate max-w-[200px]">{t.title}</span>
                          <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[9px] uppercase">{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Enter search keywords above to display matched database objects.</p>
              )}
            </div>
          )}

          {/* Tab 7: Analytics */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Platform Growth Analytics</h2>
                <p className="text-xs text-slate-400">Historical velocity, active sessions distribution, and workloads.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">User Distribution</h3>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="flex justify-between"><span>Active (Online/Away/Busy):</span> <strong className="text-emerald-400">{stats?.activeUsers}</strong></p>
                    <p className="flex justify-between"><span>Restricted (Blocked):</span> <strong className="text-rose-400">{stats?.blockedUsers}</strong></p>
                    <p className="flex justify-between"><span>Offline (Inactive):</span> <strong className="text-slate-400">{(stats?.totalUsers || 0) - (stats?.activeUsers || 0) - (stats?.blockedUsers || 0)}</strong></p>
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Workspace Telemetry</h3>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="flex justify-between"><span>Total Active boards:</span> <strong className="text-indigo-400">{stats?.totalWorkspaces}</strong></p>
                    <p className="flex justify-between"><span>Average Tasks per Board:</span> <strong className="text-slate-300">{stats?.totalWorkspaces ? Math.round(stats.totalTasks / stats.totalWorkspaces) : 0}</strong></p>
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Task Performance Rate</h3>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="flex justify-between"><span>Platform Task pool:</span> <strong className="text-amber-400">{stats?.totalTasks}</strong></p>
                    <p className="flex justify-between"><span>Completion status:</span> <strong className="text-cyan-400">100% Correct</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: Security Center */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Security Center</h2>
                <p className="text-xs text-slate-400">Real-time threat monitoring feed and account lockout reviews.</p>
              </div>

              {/* Summary blocks */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Blocked Accounts', count: securitySummary?.summary?.blockedUsersCount, color: 'text-rose-400' },
                  { label: 'Failed Logins', count: securitySummary?.summary?.failedLoginsCount, color: 'text-amber-400' },
                  { label: 'Role Changes', count: securitySummary?.summary?.roleChangesCount, color: 'text-sky-400' },
                  { label: 'Ownership Transfers', count: securitySummary?.summary?.ownershipTransfersCount, color: 'text-indigo-400' }
                ].map((sec, idx) => (
                  <div key={idx} className="bg-slate-900/30 border border-white/10 p-4 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">{sec.label}</span>
                    <span className={`text-2xl font-bold mt-2 block ${sec.color}`}>{sec.count || 0}</span>
                  </div>
                ))}
              </div>

              {/* Recent Actions Feed */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Recent Administrative Actions</h3>
                <div className="space-y-2">
                  {securitySummary?.recentAdminActions && securitySummary.recentAdminActions.length > 0 ? (
                    securitySummary.recentAdminActions.map(action => (
                      <div key={action._id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <strong className="text-white">{action.action}</strong>
                          <p className="text-slate-500 text-[10px] mt-0.5">Details: {action.details} (Actor: {action.actorName})</p>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(action.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No admin actions recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 9: Audit Logs */}
          {activeSection === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Platform Audit Logs</h2>
                <p className="text-xs text-slate-400">Comprehensive trace audit logs matching user creation, deletion, and settings updates.</p>
              </div>

              {/* Logs table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Target</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/5">
                        <td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-4 font-bold text-cyan-400">{log.action}</td>
                        <td className="p-4">{log.actorName}</td>
                        <td className="p-4">{log.targetName || '-'}</td>
                        <td className="p-4 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                        <td className="p-4">{log.ipAddress || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 10: Role Management */}
          {activeSection === 'roles' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Privileged Role Hierarchy</h2>
                <p className="text-xs text-slate-400">View role credentials. Super admin accounts cannot be blocks or deleted.</p>
              </div>

              <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Policies</h3>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400" />
                    <span><strong>SUPER_ADMIN</strong>: full root level privileges, email locked to <code>yatnesh@admin.com</code>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400" />
                    <span><strong>ADMIN</strong>: moderator rights to manage workspaces, tasks, and users role updates.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400" />
                    <span><strong>OWNER</strong>: board owner, can assign members and delete local workspace boards.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400" />
                    <span><strong>MEMBER</strong>: collaborative contributor. Can join public boards or request private access.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 11: System Health */}
          {activeSection === 'health' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Live System Health telemetry</h2>
                <p className="text-xs text-slate-400">Real-time health diagnostics, storage footprints, and uptime reports.</p>
              </div>

              {systemHealth ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Physical Hardware Footprints</h3>
                    <div className="space-y-2 text-xs">
                      <p className="flex justify-between"><span>API Gateway Uptime:</span> <strong className="text-slate-200">{systemHealth.uptime}</strong></p>
                      <p className="flex justify-between"><span>Uploads Storage Footprint:</span> <strong className="text-slate-200">{systemHealth.storageUsage}</strong></p>
                      <p className="flex justify-between"><span>RSS Allocated Memory:</span> <strong className="text-slate-200">{systemHealth.memoryUsage?.rss}</strong></p>
                      <p className="flex justify-between"><span>Heap Total Memory:</span> <strong className="text-slate-200">{systemHealth.memoryUsage?.heapTotal}</strong></p>
                      <p className="flex justify-between"><span>Heap Used Memory:</span> <strong className="text-slate-200">{systemHealth.memoryUsage?.heapUsed}</strong></p>
                    </div>
                  </div>

                  <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">API Diagnostics</h3>
                    <div className="space-y-2 text-xs">
                      <p className="flex justify-between"><span>DB Node Status:</span> <strong className="text-emerald-400">{systemHealth.database}</strong></p>
                      <p className="flex justify-between"><span>Sockets Server Pool:</span> <strong className="text-emerald-400">{systemHealth.socketStatus}</strong></p>
                      <p className="flex justify-between"><span>Active Socket Connections:</span> <strong className="text-slate-200">{systemHealth.activeSocketConnections}</strong></p>
                      <p className="flex justify-between"><span>CPU User Time:</span> <strong className="text-slate-200">{systemHealth.cpuUsage?.user}</strong></p>
                      <p className="flex justify-between"><span>CPU System Time:</span> <strong className="text-slate-200">{systemHealth.cpuUsage?.system}</strong></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic text-xs">Awaiting diagnostics report...</div>
              )}
            </div>
          )}

          {/* Tab 12: Settings */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Platform System Settings</h2>
                <p className="text-xs text-slate-400">Configure global registration features and central administration behaviors.</p>
              </div>

              <div className="bg-slate-900/30 border border-white/10 p-6 rounded-2xl space-y-5 max-w-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-sm text-slate-200">Maintenance Mode</strong>
                    <p className="text-[10px] text-slate-500">Redirect users to system offline page during deployments.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => {
                      setSettings({ ...settings, maintenanceMode: e.target.checked });
                      toast.success('Maintenance mode setting saved locally.');
                    }}
                    className="rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <strong className="text-sm text-slate-200">Allow New Registrations</strong>
                    <p className="text-[10px] text-slate-500">Block or allow sign-up screen operations globally.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.registrationEnabled}
                    onChange={(e) => {
                      setSettings({ ...settings, registrationEnabled: e.target.checked });
                      toast.success('Registration config saved.');
                    }}
                    className="rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <strong className="text-sm text-slate-200">Centralized Logger level</strong>
                    <p className="text-[10px] text-slate-500">Configure default API logging noise suppression level.</p>
                  </div>
                  <select
                    value={settings.logLevel}
                    onChange={(e) => {
                      setSettings({ ...settings, logLevel: e.target.value });
                      toast.success(`Logger level configured to: ${e.target.value}`);
                    }}
                    className="bg-slate-950 border border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-white focus:border-cyan-500"
                  >
                    <option value="silent">silent</option>
                    <option value="error">error</option>
                    <option value="warn">warn</option>
                    <option value="info">info</option>
                    <option value="debug">debug</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
};

export default AdminDashboard;
