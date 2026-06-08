const AuditLogs = ({ auditLogs = [] }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">Platform Audit Logs</h2>
        <p className="text-xs text-slate-400">Comprehensive trace audit logs matching user creation, deletion, and settings updates.</p>
      </div>

      <div className="premium-card p-0 overflow-hidden">
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
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-white/5">
                  <td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-4 font-bold text-blue-500">{log.action}</td>
                  <td className="p-4">{log.actorName}</td>
                  <td className="p-4">{log.targetName || '-'}</td>
                  <td className="p-4 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                  <td className="p-4">{log.ipAddress || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500 italic">
                  No audit logs recorded on the platform.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
