import { HiOutlineUser, HiOutlineFolder, HiOutlineChartBar } from 'react-icons/hi';
import OverviewCharts from '../overview/OverviewCharts';

const AnalyticsDashboard = ({ stats }) => {
  const userStats = [
    { label: 'Active Users', count: stats?.activeUsers || 0, color: 'text-emerald-400' },
    { label: 'Restricted (Blocked)', count: stats?.blockedUsers || 0, color: 'text-rose-400' },
    { label: 'Offline / Inactive', count: (stats?.totalUsers || 0) - (stats?.activeUsers || 0) - (stats?.blockedUsers || 0), color: 'text-slate-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white">Platform Growth Analytics</h2>
        <p className="text-xs text-slate-400">Historical velocity, active sessions distribution, and workloads.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* User Distribution */}
        <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <HiOutlineUser className="h-4 w-4" /> User Distribution
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            {userStats.map((item, idx) => (
              <p key={idx} className="flex justify-between">
                <span>{item.label}:</span>
                <strong className={item.color}>{item.count}</strong>
              </p>
            ))}
          </div>
        </div>

        {/* Workspace Telemetry */}
        <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <HiOutlineFolder className="h-4 w-4" /> Workspace Telemetry
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            <p className="flex justify-between">
              <span>Total Active Boards:</span>
              <strong className="text-indigo-400">{stats?.totalWorkspaces || 0}</strong>
            </p>
            <p className="flex justify-between">
              <span>Average Tasks per Board:</span>
              <strong className="text-slate-300">
                {stats?.totalWorkspaces ? Math.round(stats.totalTasks / stats.totalWorkspaces) : 0}
              </strong>
            </p>
          </div>
        </div>

        {/* Task Pool performance */}
        <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <HiOutlineChartBar className="h-4 w-4" /> Task Performance Rate
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            <p className="flex justify-between">
              <span>Platform Task Pool:</span>
              <strong className="text-amber-400">{stats?.totalTasks || 0}</strong>
            </p>
            <p className="flex justify-between">
              <span>Completion Status:</span>
              <strong className="text-cyan-400">100% Correct</strong>
            </p>
          </div>
        </div>
      </div>

      {/* SVG Growth Chart */}
      <OverviewCharts growth={stats?.growth || []} />
    </div>
  );
};

export default AnalyticsDashboard;
