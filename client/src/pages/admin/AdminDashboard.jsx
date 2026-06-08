import { useEffect, useState } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import OverviewStats from '../../components/admin/overview/OverviewStats';
import OverviewCharts from '../../components/admin/overview/OverviewCharts';
import PlatformMetrics from '../../components/admin/overview/PlatformMetrics';
import RecentActivity from '../../components/admin/overview/RecentActivity';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [securitySummary, setSecuritySummary] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, healthRes, secRes] = await Promise.all([
        axiosInstance.get('/admin/stats'),
        axiosInstance.get('/admin/system-health'),
        axiosInstance.get('/admin/security/summary')
      ]);
      setStats(statsRes.data.stats);
      setSystemHealth(healthRes.data.health);
      setSecuritySummary(secRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initialize administrative panels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <div className="rounded-3xl bg-slate-900 border border-white/10 px-8 py-6 text-xl font-bold shadow-2xl flex flex-col items-center gap-3">
          <span className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          Loading overview data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white">Platform Health Overview</h2>
        <p className="text-xs text-slate-400">Platform statistics aggregated across all databases.</p>
      </div>

      <OverviewStats stats={stats} systemHealth={systemHealth} />

      <div className="grid gap-6 md:grid-cols-2">
        <OverviewCharts growth={stats?.growth || []} />
        <PlatformMetrics systemHealth={systemHealth} />
      </div>

      {securitySummary && (
        <RecentActivity activities={securitySummary.recentAdminActions || []} />
      )}
    </div>
  );
};

export default AdminDashboard;
