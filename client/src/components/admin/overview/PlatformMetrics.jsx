const PlatformMetrics = ({ systemHealth }) => {
  return (
    <div className="premium-card premium-card-hover space-y-4">
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
  );
};

export default PlatformMetrics;
