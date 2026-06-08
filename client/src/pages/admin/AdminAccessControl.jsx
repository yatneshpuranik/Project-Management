import { useEffect, useState } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from '../../../utils/toast.js';
import { HiOutlineShieldCheck, HiOutlineCheck } from 'react-icons/hi';

const AdminAccessControl = () => {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  const fetchPermissions = async () => {
    try {
      const res = await axiosInstance.get('/admin/permissions');
      setPermissions(res.data.permissions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load permissions matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleTogglePermission = async (role, permissionName, currentValue) => {
    try {
      const matchedRole = permissions.find((p) => p.role === role);
      if (!matchedRole) return;

      const updated = {
        ...matchedRole,
        [permissionName]: !currentValue,
      };

      // Exclude _id and __v for clean payload
      const { _id, __v, createdAt, updatedAt, ...payload } = updated;

      const res = await axiosInstance.put(`/admin/permissions/${role}`, payload);

      if (res.data.success) {
        toast.success(`Updated "${permissionName}" permission for role ${role}`);
        setPermissions((prev) =>
          prev.map((p) => (p.role === role ? res.data.permission : p))
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update permission');
    }
  };

  const permissionKeys = [
    { key: 'canInvite', label: 'Invite Members' },
    { key: 'canRemoveMember', label: 'Remove Members' },
    { key: 'canTransferOwnership', label: 'Transfer Ownership' },
    { key: 'canManageChannels', label: 'Manage Channels' },
    { key: 'canDeleteWorkspace', label: 'Delete Workspace' },
    { key: 'canArchiveWorkspace', label: 'Archive Workspace' },
    { key: 'canAssignTasks', label: 'Assign Tasks' },
    { key: 'canMoveTasks', label: 'Move Tasks' },
    { key: 'canModerateComments', label: 'Moderate Comments' },
    { key: 'canManagePermissions', label: 'Manage Permissions' },
  ];

  const rolesList = ['ADMIN', 'WORKSPACE_OWNER', 'WORKSPACE_MEMBER', 'USER'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100 font-sans">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-3" />
        Loading access control matrix...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HiOutlineShieldCheck className="h-6 w-6 text-cyan-400" /> Platform Access Control Matrix
        </h2>
        <p className="text-xs text-slate-400">
          Configure dynamic action authorization rules across all platform roles. Admins can inspect and modify matrix settings.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400 uppercase tracking-wider font-bold">
                <th className="p-4 min-w-[150px]">System Role</th>
                {permissionKeys.map((p) => (
                  <th key={p.key} className="p-4 text-center min-w-[140px]" title={p.label}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-950/20">
              {rolesList.map((role) => {
                const rolePerm = permissions.find((p) => p.role === role) || {};
                const isPrimaryAdmin = role === 'ADMIN';

                return (
                  <tr
                    key={role}
                    className="hover:bg-slate-900/35 transition-colors duration-150"
                  >
                    <td className="p-4 font-bold text-white">
                      <div className="flex flex-col">
                        <span>{role.replace('_', ' ')}</span>
                        {isPrimaryAdmin && (
                          <span className="text-[9px] text-cyan-400 font-bold uppercase mt-0.5">
                            Default Bypass
                          </span>
                        )}
                      </div>
                    </td>
                    {permissionKeys.map((p) => {
                      const hasPerm = !!rolePerm[p.key];
                      return (
                        <td key={p.key} className="p-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={isPrimaryAdmin} // Primary Admin always bypasses all checks, keep read-only checked
                              onChange={() =>
                                handleTogglePermission(role, p.key, hasPerm)
                              }
                              className={`h-5 w-5 rounded border-white/15 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 transition cursor-pointer ${
                                isPrimaryAdmin ? 'cursor-not-allowed opacity-50' : ''
                              }`}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Warning</h3>
        <p className="text-[11px] text-slate-400 leading-normal">
          Modifying the permission matrix affects workspace capabilities in real time. Standard roles will immediately gain or lose access to specific workspace actions.
          Workspace Owner permissions dictate maximum actions within their owned boundaries. Workspace Members inherit actions enabled above.
        </p>
      </div>
    </div>
  );
};

export default AdminAccessControl;
