const SystemHealth = ({ systemHealth }) => {
  return (
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
              <p className="flex justify-between">
                <span>API Gateway Uptime:</span>
                <strong className="text-slate-200">{systemHealth.uptime}</strong>
              </p>
              <p className="flex justify-between">
                <span>Uploads Storage Footprint:</span>
                <strong className="text-slate-200">{systemHealth.storageUsage}</strong>
              </p>
              <p className="flex justify-between">
                <span>RSS Allocated Memory:</span>
                <strong className="text-slate-200">{systemHealth.memoryUsage?.rss}</strong>
              </p>
              <p className="flex justify-between">
                <span>Heap Total Memory:</span>
                <strong className="text-slate-200">{systemHealth.memoryUsage?.heapTotal}</strong>
              </p>
              <p className="flex justify-between">
                <span>Heap Used Memory:</span>
                <strong className="text-slate-200">{systemHealth.memoryUsage?.heapUsed}</strong>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">API Diagnostics</h3>
            <div className="space-y-2 text-xs">
              <p className="flex justify-between">
                <span>DB Node Status:</span>
                <strong className="text-emerald-400">{systemHealth.database}</strong>
              </p>
              <p className="flex justify-between">
                <span>Sockets Server Pool:</span>
                <strong className="text-emerald-400">{systemHealth.socketStatus}</strong>
              </p>
              <p className="flex justify-between">
                <span>Active Socket Connections:</span>
                <strong className="text-slate-200">{systemHealth.activeSocketConnections}</strong>
              </p>
              <p className="flex justify-between">
                <span>CPU User Time:</span>
                <strong className="text-slate-200">{systemHealth.cpuUsage?.user}</strong>
              </p>
              <p className="flex justify-between">
                <span>CPU System Time:</span>
                <strong className="text-slate-200">{systemHealth.cpuUsage?.system}</strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 italic text-xs">Awaiting diagnostics report...</div>
      )}
    </div>
  );
};

export default SystemHealth;
