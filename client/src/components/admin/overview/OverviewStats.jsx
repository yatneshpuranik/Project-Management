import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineFolder, HiOutlineChartBar, HiOutlineStatusOnline, HiOutlineUserRemove } from 'react-icons/hi';

const OverviewStats = ({ stats, systemHealth }) => {
  const navigate = useNavigate();
  const cards = [
    { label: 'Total Users', count: stats?.totalUsers || 0, icon: HiOutlineUser, color: 'text-cyan-450', path: '/admin/users' },
    { label: 'Workspaces', count: stats?.totalWorkspaces || 0, icon: HiOutlineFolder, color: 'text-[#8B5CF6]', path: '/admin/workspaces' },
    { label: 'Total Tasks', count: stats?.totalTasks || 0, icon: HiOutlineChartBar, color: 'text-[#F59E0B]', path: '/admin/tasks' },
    { label: 'Active Sockets', count: systemHealth?.activeSocketConnections || 0, icon: HiOutlineStatusOnline, color: 'text-[#14F195]', path: '/admin/system-health' },
    { label: 'Restricted', count: stats?.blockedUsers || 0, icon: HiOutlineUserRemove, color: 'text-[#EF4444]', path: '/admin/users?filter=restricted' }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => navigate(card.path)}
            className="premium-card premium-card-hover cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{card.label}</span>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="mt-4 text-3xl font-extrabold text-white tracking-tight">{card.count}</div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default OverviewStats;
