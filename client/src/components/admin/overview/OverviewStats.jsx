import { HiOutlineUser, HiOutlineFolder, HiOutlineChartBar, HiOutlineStatusOnline, HiOutlineUserRemove } from 'react-icons/hi';

const OverviewStats = ({ stats, systemHealth }) => {
  const cards = [
    { label: 'Total Users', count: stats?.totalUsers || 0, icon: HiOutlineUser, color: 'text-cyan-400' },
    { label: 'Workspaces', count: stats?.totalWorkspaces || 0, icon: HiOutlineFolder, color: 'text-indigo-400' },
    { label: 'Total Tasks', count: stats?.totalTasks || 0, icon: HiOutlineChartBar, color: 'text-amber-400' },
    { label: 'Active Sockets', count: systemHealth?.activeSocketConnections || 0, icon: HiOutlineStatusOnline, color: 'text-emerald-400' },
    { label: 'Restricted', count: stats?.blockedUsers || 0, icon: HiOutlineUserRemove, color: 'text-rose-400' }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="premium-card premium-card-hover">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">{card.label}</span>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="mt-4 text-3xl font-bold text-white">{card.count}</div>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewStats;
