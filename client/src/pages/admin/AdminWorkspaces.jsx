import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from '../../../utils/toast';
import WorkspaceTable from '../../components/admin/workspaces/WorkspaceTable';
import WorkspaceDetailsModal from '../../components/admin/workspaces/WorkspaceDetailsModal';

const AdminWorkspaces = () => {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceQuery = searchParams.get('q') || '';

  const fetchWorkspaces = async () => {
    try {
      const res = await axiosInstance.get('/admin/workspaces');
      const list = res.data.workspaces || [];
      setWorkspaces(list);

      const activeBoardId = searchParams.get('boardId');
      if (activeBoardId && list.length > 0) {
        const matched = list.find((w) => w._id === activeBoardId);
        if (matched) {
          const detailRes = await axiosInstance.get(`/admin/workspaces/${activeBoardId}`);
          setSelectedWorkspace({
            ...detailRes.data.workspace,
            tasks: detailRes.data.tasks || [],
          });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load workspaces list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [searchParams]);

  const handleSelectWorkspace = async (workspace) => {
    try {
      const res = await axiosInstance.get(`/admin/workspaces/${workspace._id}`);
      setSelectedWorkspace({
        ...res.data.workspace,
        tasks: res.data.tasks || [],
      });
    } catch (e) {
      console.error(e);
      setSelectedWorkspace(workspace);
    }
  };

  const handleArchiveWorkspaceToggle = async (boardId, isArchived) => {
    try {
      await axiosInstance.put(`/admin/workspaces/${boardId}/archive`, { isArchived });
      toast.success(isArchived ? 'Workspace archived.' : 'Workspace restored.');
      fetchWorkspaces();
      if (selectedWorkspace?._id === boardId) {
        setSelectedWorkspace((prev) => ({ ...prev, isArchived }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle archive');
    }
  };

  const handleTransferOwnership = async (boardId, newOwnerId) => {
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/transfer-ownership`, { newOwnerId });
      toast.success('Ownership transferred successfully.');
      fetchWorkspaces();
      setSelectedWorkspace(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ownership');
    }
  };

  const handleForceAddMember = async (boardId, userId) => {
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/members/add`, { userId });
      toast.success('Member added forcefully.');
      fetchWorkspaces();
      // Reload workspace details
      const res = await axiosInstance.get(`/admin/workspaces/${boardId}`);
      setSelectedWorkspace(res.data.workspace);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleForceRemoveMember = async (boardId, userId) => {
    try {
      await axiosInstance.post(`/admin/workspaces/${boardId}/members/remove`, { userId });
      toast.success('Member removed forcefully.');
      fetchWorkspaces();
      // Reload workspace details
      const res = await axiosInstance.get(`/admin/workspaces/${boardId}`);
      setSelectedWorkspace(res.data.workspace);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteWorkspace = async (boardId) => {
    if (!window.confirm('Delete workspace permanently? This deletes all associated cards.')) return;
    try {
      await axiosInstance.delete(`/admin/workspaces/${boardId}`);
      toast.success('Workspace deleted.');
      setSelectedWorkspace(null);
      fetchWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const filteredWorkspacesList = workspaces.filter((w) => 
    w.title?.toLowerCase().includes(workspaceQuery.toLowerCase()) || 
    (w.createdBy?.name || '').toLowerCase().includes(workspaceQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-3" />
        Loading workspaces...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Workspaces Registry</h2>
          <p className="text-xs text-slate-400">Monitor all collaboration boards and moderate workspace assets.</p>
        </div>
        <input
          value={workspaceQuery}
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          placeholder="Search workspace..."
          className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <WorkspaceTable
            workspaces={filteredWorkspacesList}
            selectedWorkspace={selectedWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
          />
        </div>

        <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5">
          <WorkspaceDetailsModal
            selectedWorkspace={selectedWorkspace}
            onArchiveToggle={handleArchiveWorkspaceToggle}
            onDeleteWorkspace={handleDeleteWorkspace}
            onForceAddMember={handleForceAddMember}
            onForceRemoveMember={handleForceRemoveMember}
            onTransferOwnership={handleTransferOwnership}
            onRefreshWorkspace={handleSelectWorkspace}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminWorkspaces;
