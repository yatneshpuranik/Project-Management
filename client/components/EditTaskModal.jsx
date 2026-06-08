import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteTask, updateTask } from '../redux/taskSlice';
import { HiOutlineX, HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi';
import { toast } from '../utils/toast';
import socket from '../utils/socket';

const EditTaskModal = ({ isOpen, onClose, task, boardId }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const currentBoard = useSelector((state) => state.boards.currentBoard);
  const currentUserId = user?._id || localStorage.getItem('userId');
  const isOwner =
    currentBoard &&
    (currentBoard.createdBy?._id === currentUserId || currentBoard.createdBy === currentUserId);
  const members = currentBoard?.members || [];

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'Low');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [status, setStatus] = useState(task.status || 'Todo');
  const [progress, setProgress] = useState(task.progress || 0);
  const [assignedTo, setAssignedTo] = useState(
    task.assignedTo?._id || task.assignedTo || ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync form state when the task opens
  useEffect(() => {
    if (!isOpen || !task) return;

    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'Low');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setStatus(task.status || 'Todo');
    setProgress(task.progress || 0);
    setAssignedTo(task.assignedTo?._id || task.assignedTo || '');
  }, [isOpen, task]);

  const handleSubmitUpdates = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!isOwner) {
      toast.error('Only the workspace owner can edit this task.');
      return;
    }

    setIsUpdating(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        status,
        progress: parseInt(progress, 10),
        assignedTo: assignedTo || undefined,
      };

      const resultAction = await dispatch(updateTask({ taskId: task._id, data }));
      if (updateTask.fulfilled.match(resultAction)) {
        toast.success('Task updated successfully');
        onClose();
      }
    } catch (err) {
      console.error('Update task failed:', err);
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task?._id) return;
    if (!window.confirm(`Delete task "${task.title}" permanently?`)) return;

    if (!isOwner) {
      toast.error('Only the workspace owner can delete tasks.');
      return;
    }

    setIsDeleting(true);
    try {
      const resultAction = await dispatch(deleteTask(task._id));
      if (deleteTask.fulfilled.match(resultAction)) {
        socket.emit('task-deleted', { boardId, taskId: task._id });
        toast.success('Task deleted');
        onClose();
      }
    } catch (err) {
      console.error('Delete task failed:', err);
      toast.error('Could not delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const getAssignedName = () => {
    const aUser = members.find((m) => m._id === assignedTo);
    return aUser ? aUser.name : 'Unassigned';
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-5xl h-[85vh] rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900 flex-shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-400 font-semibold">Card Details</p>
            <h3 className="mt-1 text-lg font-bold text-white truncate max-w-md">Edit Task</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content - Split layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Left Panel: Task Detail Form */}
          <form
            onSubmit={handleSubmitUpdates}
            className="w-full lg:w-1/2 p-6 overflow-y-auto space-y-5 border-r border-white/10 border-b lg:border-b-0"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Task Title *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/60"
                  required
                  disabled={!isOwner}
                />
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Board Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                  disabled={!isOwner}
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </label>
            </div>

            <label className="block text-xs">
              <span className="text-slate-300 font-medium mb-1.5 block">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/60 resize-none"
                disabled={!isOwner}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Priority</span>
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                    disabled={!isOwner}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                  disabled={!isOwner}
                />
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Assignee</span>
                {isOwner ? (
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-300 italic font-semibold">
                    {getAssignedName()}
                  </div>
                )}
              </label>
            </div>

            {/* Progress Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Task Completion Progress</span>
                <span className="text-sky-400">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="25"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-bold px-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={!isOwner || isDeleting}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlineTrash className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Task'}
                </span>
              </button>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isOwner || isUpdating}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  <HiOutlineCheck className="h-4 w-4" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>

          <div className="w-full lg:w-1/2 p-6 overflow-y-auto">
            <div className="h-full rounded-[32px] border border-white/10 bg-slate-950/50 p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-400 font-semibold">Task Summary</p>
                <h4 className="mt-3 text-xl font-semibold text-white">{task.title}</h4>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {task.description || 'No description available for this task.'}
                </p>

                <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Status</p>
                    <p className="mt-2 text-sm font-semibold text-white">{task.status}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Priority</p>
                    <p className="mt-2 text-sm font-semibold text-white">{task.priority}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Due Date</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {dueDate || 'No deadline'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Assigned To</p>
                    <p className="mt-2 text-sm font-semibold text-white">{getAssignedName()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Owner Actions</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-slate-950/70 p-4 border border-white/10 text-sm text-slate-300">
                    <p className="font-semibold text-slate-100">Assign User</p>
                    <p className="mt-2 text-[11px] text-slate-400">Only the workspace owner can assign tasks.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-4 border border-white/10 text-sm text-slate-300">
                    <p className="font-semibold text-slate-100">Change Deadline</p>
                    <p className="mt-2 text-[11px] text-slate-400">Owner-controlled deadline updates keep deliverables aligned.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-4 border border-white/10 text-sm text-slate-300">
                    <p className="font-semibold text-slate-100">Delete Task</p>
                    <p className="mt-2 text-[11px] text-slate-400">Owner-only action to remove the task from the board.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default EditTaskModal;
