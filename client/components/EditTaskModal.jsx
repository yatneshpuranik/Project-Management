import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../redux/taskSlice';
import socket from '../utils/socket';
import { HiOutlineX, HiOutlineCheck } from 'react-icons/hi';

const EditTaskModal = ({ isOpen, onClose, task, boardId }) => {
  const dispatch = useDispatch();
  const currentBoard = useSelector((state) => state.boards.currentBoard);
  const members = currentBoard?.members || [];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Low',
    dueDate: '',
    status: 'Todo',
    assignedTo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Low',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        status: task.status || 'Todo',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }
    setIsSubmitting(true);

    try {
      const resultAction = await dispatch(
        updateTask({
          taskId: task._id,
          data: {
            ...formData,
            assignedTo: formData.assignedTo || null,
          },
        })
      );

      if (updateTask.fulfilled.match(resultAction)) {
        socket.emit('task-updated', {
          boardId,
          task: resultAction.payload,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-slate-900">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-400 font-semibold">Modify Task</p>
            <h3 className="mt-1 text-xl font-bold text-white">Update task details</h3>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 bg-slate-900/95">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-300 font-medium mb-2 block">Title *</span>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Task title"
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300 font-medium mb-2 block">Status</span>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-300 font-medium mb-2 block">Description</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Provide a detailed description of this task..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 resize-none"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-300 font-medium mb-2 block">Priority</span>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/60"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-300 font-medium mb-2 block">Due Date</span>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/60"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300 font-medium mb-2 block">Assignee</span>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/60"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlineCheck className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
