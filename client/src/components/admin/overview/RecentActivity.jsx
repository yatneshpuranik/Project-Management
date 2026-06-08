const RecentActivity = ({ activities = [] }) => {
  return (
    <div className="premium-card premium-card-hover space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Recent Platform Activity</h3>
        <p className="text-[10px] text-slate-500">Live feed of administrative actions and security logs.</p>
      </div>
      <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
        {activities && activities.length > 0 ? (
          activities.map((act) => (
            <div key={act._id} className="p-3 bg-slate-950 border border-white/5 rounded-xl text-xs flex justify-between items-center gap-2">
              <div className="min-w-0">
                <strong className="text-white block truncate">{act.action}</strong>
                <p className="text-slate-500 text-[10px] mt-0.5 truncate">
                  {act.details} (Actor: {act.actorName || 'System'})
                </p>
              </div>
              <span className="text-[9px] text-slate-500 whitespace-nowrap">
                {new Date(act.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-xs text-slate-600 italic">
            No recent activity recorded.
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
