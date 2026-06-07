import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from '../../../utils/toast';
import UsersTable from '../../components/admin/users/UsersTable';
import UserDetailsModal from '../../components/admin/users/UserDetailsModal';

const AdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const userQuery = searchParams.get('q') || '';

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId, role) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/role`, { role });
      toast.success(`User role updated to ${role}`);
      fetchUsers();
      if (selectedUser?._id === userId) {
        setSelectedUser((prev) => ({ ...prev, role }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleBlockUserToggle = async (userId, isBlocked) => {
    const reason = isBlocked ? (window.prompt('Enter block reason:') || 'Suspended by admin') : '';
    if (isBlocked && !reason) return;
    try {
      await axiosInstance.put(`/admin/users/${userId}/block`, { isBlocked, reason });
      toast.success(isBlocked ? 'User blocked.' : 'User unblocked.');
      fetchUsers();
      if (selectedUser?._id === userId) {
        setSelectedUser((prev) => ({ ...prev, isBlocked, reason }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle block state');
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      await axiosInstance.post(`/admin/users/${userId}/logout`);
      toast.success('Forced user logout successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force logout');
    }
  };

  const handleResetAccess = async (userId) => {
    try {
      const res = await axiosInstance.post(`/admin/users/${userId}/reset`);
      toast.success(`Access reset! Temporary credentials: ${res.data.tempPassword || 'Reset successful'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset access');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure? This will permanently erase the user.')) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      toast.success('User deleted permanently.');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsersList = users.filter((u) => 
    u.name?.toLowerCase().includes(userQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-3" />
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Users Moderation</h2>
          <p className="text-xs text-slate-400">Manage user authorization and platform resource lockouts.</p>
        </div>
        <input
          value={userQuery}
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          placeholder="Search user profile..."
          className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <UsersTable
            users={filteredUsersList}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
        </div>

        <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5">
          <UserDetailsModal
            selectedUser={selectedUser}
            onBlockToggle={handleBlockUserToggle}
            onForceLogout={handleForceLogout}
            onResetAccess={handleResetAccess}
            onDeleteUser={handleDeleteUser}
            onUpdateRole={handleUpdateRole}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
