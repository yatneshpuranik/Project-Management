import { useEffect, useState } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import SecurityCenter from '../../components/admin/security/SecurityCenter';
import AuditLogs from '../../components/admin/security/AuditLogs';
import SystemHealth from '../../components/admin/security/SystemHealth';
import { HiOutlineShieldCheck, HiOutlineCheckCircle } from 'react-icons/hi';

const AdminSecurity = ({ view = 'security' }) => {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securitySummary, setSecuritySummary] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      if (view === 'security') {
        const res = await axiosInstance.get('/admin/security/summary');
        setSecuritySummary(res.data);
      } else if (view === 'audit') {
        const res = await axiosInstance.get('/admin/audit-logs');
        setAuditLogs(res.data.auditLogs || []);
      } else if (view === 'health') {
        const res = await axiosInstance.get('/admin/system-health');
        setSystemHealth(res.data.health);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [view]);

  // Periodic polling for health check view
  useEffect(() => {
    let interval;
    if (view === 'health') {
      interval = setInterval(async () => {
        try {
          const res = await axiosInstance.get('/admin/system-health');
          setSystemHealth(res.data.health);
        } catch (e) {
          console.error(e);
        }
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-3" />
        Loading security modules...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === 'security' && (
        <SecurityCenter securitySummary={securitySummary} />
      )}

      {view === 'audit' && (
        <AuditLogs auditLogs={auditLogs} />
      )}

      {view === 'health' && (
        <SystemHealth systemHealth={systemHealth} />
      )}

      {view === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HiOutlineShieldCheck className="h-6 w-6 text-cyan-400" /> Privileged Role Hierarchy
            </h2>
            <p className="text-xs text-slate-400">View role credentials. Platform administrator accounts cannot be blocked or deleted.</p>
          </div>

          <div className="bg-slate-900/30 border border-white/10 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Policies</h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                <span><strong>ADMIN</strong>: platform administrator. Moderator rights to manage workspaces, tasks, and users role updates.</span>
              </div>
              <div className="flex items-center gap-2">
                <HiOutlineCheckCircle className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                <span><strong>USER</strong>: platform user. A user can be a Workspace Owner or Workspace Member at the workspace level.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurity;
