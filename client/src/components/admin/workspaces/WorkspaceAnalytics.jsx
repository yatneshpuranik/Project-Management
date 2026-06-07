const WorkspaceAnalytics = ({ stats }) => {
  return (
    <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-4">
      <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Workspace Telemetry</h3>
      <div className="space-y-3.5 text-xs text-slate-300">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Total Collaboration Boards</span>
          <strong className="text-indigo-400 text-sm">{stats?.totalWorkspaces || 0}</strong>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Average Tasks per Board</span>
          <strong className="text-slate-300 text-sm">
            {stats?.totalWorkspaces ? Math.round(stats.totalTasks / stats.totalWorkspaces) : 0}
          </strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Global Task Pool Size</span>
          <strong className="text-amber-400 text-sm">{stats?.totalTasks || 0}</strong>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceAnalytics;
