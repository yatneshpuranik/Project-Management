import { useState } from 'react';
import axiosInstance from '../../../../utils/axiosInstance';
import { HiOutlineLockClosed, HiOutlineX } from 'react-icons/hi';

const SecurityCenter = ({ securitySummary }) => {
  const [activeMetric, setActiveMetric] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cards = [
    { label: 'Blocked Accounts', count: securitySummary?.summary?.blockedUsersCount, color: 'text-rose-400' },
    { label: 'Failed Logins', count: securitySummary?.summary?.failedLoginsCount, color: 'text-amber-400' },
    { label: 'Role Changes', count: securitySummary?.summary?.roleChangesCount, color: 'text-sky-400' },
    { label: 'Ownership Transfers', count: securitySummary?.summary?.ownershipTransfersCount, color: 'text-indigo-400' }
  ];

  const handleCardClick = async (label) => {
    setActiveMetric(label);
    setModalLoading(true);
    setIsModalOpen(true);
    setModalData([]);
    try {
      if (label === 'Blocked Accounts') {
        const res = await axiosInstance.get('/admin/users');
        const blockedUsers = (res.data.users || []).filter(u => u.isBlocked);
        setModalData(blockedUsers);
      } else {
        const res = await axiosInstance.get('/admin/audit-logs');
        const logs = res.data.auditLogs || [];
        if (label === 'Failed Logins') {
          setModalData(logs.filter(l => l.action === 'Failed Login'));
        } else if (label === 'Role Changes') {
          setModalData(logs.filter(l => l.action === 'Role Changed' || l.action === 'Permissions Changed' || l.action === 'Role Change'));
        } else if (label === 'Ownership Transfers') {
          setModalData(logs.filter(l => l.action === 'Ownership Transfer'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch metric details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">Security Center</h2>
        <p className="text-xs text-slate-400">Real-time threat monitoring feed and account lockout reviews.</p>
      </div>

      {/* Summary blocks */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((sec, idx) => (
          <div 
            key={idx} 
            onClick={() => handleCardClick(sec.label)}
            className="premium-card premium-card-hover p-4 cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition"
          >
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

      {/* Center Modal with Background Blur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-sky-400 font-bold">Security Monitor</span>
                <h3 className="text-base font-bold text-white mt-0.5">{activeMetric} Details</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
                  <span className="h-4.5 w-4.5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mr-2" />
                  Fetching records...
                </div>
              ) : modalData.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  No records found for {activeMetric}.
                </div>
              ) : (
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 font-bold">
                      {activeMetric === 'Blocked Accounts' ? (
                        <>
                          <th className="pb-2">User</th>
                          <th className="pb-2">Role</th>
                          <th className="pb-2">Blocked Date</th>
                          <th className="pb-2">Reason</th>
                        </>
                      ) : activeMetric === 'Failed Logins' ? (
                        <>
                          <th className="pb-2">IP Address</th>
                          <th className="pb-2">Target Account</th>
                          <th className="pb-2">Attempt Date</th>
                          <th className="pb-2">Failure Details</th>
                        </>
                      ) : (
                        <>
                          <th className="pb-2">Actor</th>
                          <th className="pb-2">Target</th>
                          <th className="pb-2">Action Date</th>
                          <th className="pb-2">Details</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((row) => (
                      <tr key={row._id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        {activeMetric === 'Blocked Accounts' ? (
                          <>
                            <td className="py-3 pr-2">
                              <div className="font-semibold text-slate-100">{row.name}</div>
                              <div className="text-[10px] text-slate-500">{row.email}</div>
                            </td>
                            <td className="py-3 text-slate-300">{row.role}</td>
                            <td className="py-3 text-slate-400">
                              {row.blockedAt ? new Date(row.blockedAt).toLocaleDateString() : 'Unknown'}
                            </td>
                            <td className="py-3 text-rose-300 font-medium italic">{row.reason || 'None provided'}</td>
                          </>
                        ) : activeMetric === 'Failed Logins' ? (
                          <>
                            <td className="py-3 text-slate-300 font-mono">{row.ipAddress || '::1'}</td>
                            <td className="py-3 text-slate-100 font-semibold">{row.actorName}</td>
                            <td className="py-3 text-slate-450">
                              {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 text-amber-300">{row.details}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 text-slate-100 font-semibold">{row.actorName}</td>
                            <td className="py-3 text-slate-300">{row.targetName || 'N/A'}</td>
                            <td className="py-3 text-slate-450">
                              {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 text-slate-200">{row.details}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end border-t border-white/10 px-6 py-4 bg-slate-900/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenter;
