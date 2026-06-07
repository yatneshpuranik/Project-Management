import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { toast } from '../../../utils/toast';
import TaskTable from '../../components/admin/tasks/TaskTable';
import TaskDetailsModal from '../../components/admin/tasks/TaskDetailsModal';

const AdminTasks = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const taskQuery = searchParams.get('q') || '';

  const fetchTasks = async () => {
    try {
      const res = await axiosInstance.get('/admin/tasks');
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleReassignTask = async (taskId, assigneeId) => {
    try {
      await axiosInstance.put(`/admin/tasks/${taskId}/reassign`, { assigneeId });
      toast.success('Task reassigned.');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reassign task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axiosInstance.delete(`/admin/tasks/${taskId}`);
      toast.success('Task soft-deleted.');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await axiosInstance.put(`/admin/tasks/${taskId}/restore`);
      toast.success('Task restored.');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore task');
    }
  };

  const filteredTasksList = tasks.filter((t) => 
    t.title?.toLowerCase().includes(taskQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-100">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-3" />
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Tasks Directory</h2>
          <p className="text-xs text-slate-400">Reassign or soft-delete card tasks across all platform workspaces.</p>
        </div>
        <input
          value={taskQuery}
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          placeholder="Search tasks..."
          className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 w-72"
        />
      </div>

      <div className="bg-slate-900/10 rounded-2xl">
        <TaskTable
          tasks={filteredTasksList}
          onReassignTask={handleReassignTask}
          onDeleteTask={handleDeleteTask}
          onRestoreTask={handleRestoreTask}
        />
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default AdminTasks;
