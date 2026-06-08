import { HiOutlineLockClosed } from 'react-icons/hi';

const SecurityCenter = ({ securitySummary }) => {
  const cards = [
    { label: 'Blocked Accounts', count: securitySummary?.summary?.blockedUsersCount, color: 'text-rose-400' },
    { label: 'Failed Logins', count: securitySummary?.summary?.failedLoginsCount, color: 'text-amber-400' },
    { label: 'Role Changes', count: securitySummary?.summary?.roleChangesCount, color: 'text-sky-400' },
    { label: 'Ownership Transfers', count: securitySummary?.summary?.ownershipTransfersCount, color: 'text-indigo-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">Security Center</h2>
        <p className="text-xs text-slate-400">Real-time threat monitoring feed and account lockout reviews.</p>
      </div>

      {/* Summary blocks */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((sec, idx) => (
          <div key={idx} className="premium-card premium-card-hover p-4">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">{sec.label}</span>
            <span className={`text-2xl font-bold mt-2 block ${sec.color}`}>{sec.count || 0}</span>
          </div>
        ))}
      </div>

      {/* Recent Actions Feed */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
          <HiOutlineLockClosed className="h-4 w-4 text-blue-500" /> Recent Administrative Actions
        </h3>
        <div className="space-y-2">
          {securitySummary?.recentAdminActions && securitySummary.recentAdminActions.length > 0 ? (
            securitySummary.recentAdminActions.map(action => (
              <div key={action._id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <strong className="text-white">{action.action}</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    Details: {action.details} (Actor: {action.actorName})
                  </p>
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
  );
};

export default SecurityCenter;
