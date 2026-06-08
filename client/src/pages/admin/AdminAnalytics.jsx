import { useEffect, useState } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from '../../../utils/toast';
import AnalyticsDashboard from '../../components/admin/analytics/AnalyticsDashboard';

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosInstance.get('/admin/stats');
        setStats(res.data.stats);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load analytics statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <span className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mr-3" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsDashboard stats={stats} />
    </div>
  );
};

export default AdminAnalytics;
