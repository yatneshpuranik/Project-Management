import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineX,
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineChatAlt,
  HiOutlineClipboardList,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlinePencil
} from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import { updateTask, deleteTask, joinTask, leaveTask, fetchTasksByBoard } from '../redux/taskSlice';
import socket from '../utils/socket';
import { toast } from '../utils/toast';

const TaskDetailsDrawer = ({ taskId, boardId, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentBoard } = useSelector((state) => state.boards);
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'You';

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Low');
  const [status, setStatus] = useState('Todo');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [openContribution, setOpenContribution] = useState(false);

  const isOwner = useMemo(() => {
    if (!currentBoard) return false;
    const ownerId = currentBoard.createdBy?._id || currentBoard.createdBy;
    return ownerId === currentUserId;
  }, [currentBoard, currentUserId]);

  const ownerName = useMemo(() => {
    if (!currentBoard) return 'Unknown';
    return currentBoard.createdBy?.name || 'Workspace Owner';
  }, [currentBoard]);

  const boardMembers = useMemo(() => {
    if (!currentBoard) return [];
    const members = currentBoard.members || [];
    const creator = currentBoard.createdBy;
    const all = [creator, ...members].filter(Boolean);
    
    // De-duplicate
    const seen = new Set();
    const unique = [];
    all.forEach(u => {
      const uId = u._id || u;
      if (uId && !seen.has(uId)) {
        seen.add(uId);
        unique.push(u);
      }
    });
    return unique;
  }, [currentBoard]);

  const { tasks: allTasks } = useSelector((state) => state.tasks);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const subtasks = useMemo(() => {
    return allTasks.filter((t) => {
      const parentId = t.parentTaskId?._id || t.parentTaskId;
      const currentId = task?._id || taskId;
      return parentId === currentId;
    });
  }, [allTasks, taskId, task]);

  // Load task details
  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, commentsRes, activityRes] = await Promise.all([
        axiosInstance.get(`/tasks/${taskId}`),
        axiosInstance.get(`/tasks/${taskId}/comments`),
        axiosInstance.get(`/activity/task/${taskId}`),
      ]);

      const taskData = taskRes.data.task;
      setTask(taskData);
      setComments(commentsRes.data.comments || []);
      setActivities(activityRes.data.activities || []);

      // Initialize form fields
      setTitle(taskData.title || '');
      setDescription(taskData.description || '');
      setPriority(taskData.priority || 'Low');
      setStatus(taskData.status || 'Todo');
      setProgress(taskData.progress || 0);
      setDueDate(taskData.deadline || taskData.dueDate ? new Date(taskData.deadline || taskData.dueDate).toISOString().split('T')[0] : '');
      setAssignedTo(taskData.assignedTo?._id || taskData.assignedTo || '');
      setOpenContribution(taskData.openContribution || false);
    } catch (err) {
      console.error('Failed to fetch task details in drawer:', err);
      toast.error('Could not load task details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskId]);

  // Handle Socket Events inside drawer
  useEffect(() => {
    if (!isOpen || !taskId) return;

    const onCommentAdded = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment?._id)) return prev;
          return [...prev, data.comment];
        });
      }
    };

    const onTaskUpdated = (data) => {
      if (data.task?._id === taskId) {
        setTask(data.task);
        setTitle(data.task.title || '');
        setDescription(data.task.description || '');
        setPriority(data.task.priority || 'Low');
        setStatus(data.task.status || 'Todo');
        setProgress(data.task.progress || 0);
        setDueDate(data.task.deadline || data.task.dueDate ? new Date(data.task.deadline || data.task.dueDate).toISOString().split('T')[0] : '');
        setAssignedTo(data.task.assignedTo?._id || data.task.assignedTo || '');
        setOpenContribution(data.task.openContribution || false);
      }
    };

    const onActivityCreated = (data) => {
      if (data.activity?.taskId === taskId) {
        setActivities((prev) => [data.activity, ...prev]);
      }
    };

    const onCommentUpdated = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) =>
          prev.map((c) => (c._id === data.comment._id ? data.comment : c))
        );
      }
    };

    const onCommentDeleted = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    };

    socket.on('comment-added', onCommentAdded);
    socket.on('commentAdded', onCommentAdded);
    socket.on('comment-updated', onCommentUpdated);
    socket.on('commentUpdated', onCommentUpdated);
    socket.on('comment-deleted', onCommentDeleted);
    socket.on('commentDeleted', onCommentDeleted);
    socket.on('task-updated', onTaskUpdated);
    socket.on('activity-created', onActivityCreated);

    return () => {
      socket.off('comment-added', onCommentAdded);
      socket.off('commentAdded', onCommentAdded);
      socket.off('comment-updated', onCommentUpdated);
      socket.off('commentUpdated', onCommentUpdated);
      socket.off('comment-deleted', onCommentDeleted);
      socket.off('commentDeleted', onCommentDeleted);
      socket.off('task-updated', onTaskUpdated);
      socket.off('activity-created', onActivityCreated);
    };
  }, [isOpen, taskId]);

  // Checklist Actions
  const handleToggleChecklistItem = async (itemId, currentCompleted) => {
    try {
      const response = await axiosInstance.put(`/tasks/${taskId}/checklist/${itemId}`, {
        completed: !currentCompleted
      });
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setProgress(updatedTask.progress);
      
      // Update task list in Redux
      dispatch(fetchTasksByBoard(boardId));

      socket.emit('task-updated', { boardId, task: updatedTask });
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      toast.error('Failed to update checklist item');
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      const response = await axiosInstance.delete(`/tasks/${taskId}/checklist/${itemId}`);
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setProgress(updatedTask.progress);
      
      // Update task list in Redux
      dispatch(fetchTasksByBoard(boardId));

      socket.emit('task-updated', { boardId, task: updatedTask });
      toast.success('Checklist item deleted');
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      toast.error('Failed to delete checklist item');
    }
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/checklist`, {
        text: newChecklistText.trim()
      });
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setProgress(updatedTask.progress);
      setNewChecklistText('');
      
      // Update task list in Redux
      dispatch(fetchTasksByBoard(boardId));

      socket.emit('task-updated', { boardId, task: updatedTask });
      toast.success('Checklist item added');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
      toast.error('Failed to add checklist item');
    }
  };

  // Subtask Actions
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const subtaskData = {
        title: newSubtaskTitle.trim(),
        boardId,
        parentTaskId: taskId,
        priority: 'Low',
        status: 'Todo',
      };
      const response = await axiosInstance.post('/tasks', subtaskData);
      const newSub = response.data.task;
      setNewSubtaskTitle('');
      
      dispatch(fetchTasksByBoard(boardId));

      socket.emit('task-created', { boardId, task: newSub });
      toast.success('Subtask created successfully');
    } catch (err) {
      console.error('Failed to create subtask:', err);
      toast.error('Failed to create subtask');
    }
  };

  const handleNavigateToTask = (targetTaskId) => {
    navigate(`/boards/${boardId}/tasks/${targetTaskId}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        status,
        progress: Number(progress),
      };

      if (isOwner) {
        data.priority = priority;
        data.deadline = dueDate || undefined;
        data.dueDate = dueDate || undefined;
        data.assignedTo = assignedTo || undefined;
        data.openContribution = openContribution;
      }

      const resultAction = await dispatch(updateTask({ taskId, data }));
      if (updateTask.fulfilled.match(resultAction)) {
        toast.success('Task updated successfully');
        setTask(resultAction.payload);
        socket.emit('task-updated', { boardId, task: resultAction.payload });
        // Emit activity
        socket.emit('activity-created', {
          boardId,
          activity: {
            boardId,
            taskId,
            type: 'Task Updated',
            message: `${currentUserName} updated task: "${title.trim()}"`
          }
        });
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${title}" permanently?`)) return;
    setDeleting(true);
    try {
      const resultAction = await dispatch(deleteTask(taskId));
      if (deleteTask.fulfilled.match(resultAction)) {
        socket.emit('task-deleted', { boardId, taskId });
        toast.success('Task deleted');
        onClose();
        navigate(`/boards/${boardId}`);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/comments`, {
        text: commentText.trim(),
      });
      setComments((prev) => {
        if (prev.some((c) => c._id === response.data.comment?._id)) return prev;
        return [...prev, response.data.comment];
      });
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to post comment');
    }
  };

  const handleJoin = async () => {
    try {
      const resultAction = await dispatch(joinTask(taskId));
      if (joinTask.fulfilled.match(resultAction)) {
        toast.success('You joined the task collaborators!');
        setTask(resultAction.payload);
      } else {
        toast.error(resultAction.payload || 'Failed to join task');
      }
    } catch (err) {
      console.error('Join task error:', err);
    }
  };

  const handleLeave = async () => {
    try {
      const resultAction = await dispatch(leaveTask(taskId));
      if (leaveTask.fulfilled.match(resultAction)) {
        toast.success('You left the task collaborators.');
        setTask(resultAction.payload);
      } else {
        toast.error(resultAction.payload || 'Failed to leave task');
      }
    } catch (err) {
      console.error('Leave task error:', err);
    }
  };

  const handleClaimTask = async () => {
    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/claim`);
      toast.success('Task claimed successfully!');
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setAssignedTo(updatedTask.assignedTo?._id || updatedTask.assignedTo || '');
      dispatch(fetchTasksByBoard(boardId));
      socket.emit('task-updated', { boardId, task: updatedTask });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim task');
    }
  };

  const handleReleaseTask = async () => {
    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/release`);
      toast.success('Task released.');
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setAssignedTo('');
      dispatch(fetchTasksByBoard(boardId));
      socket.emit('task-updated', { boardId, task: updatedTask });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release task');
    }
  };

  const handleTakeOwnership = async () => {
    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/take-ownership`);
      toast.success('You have taken ownership of this task!');
      const updatedTask = response.data.task;
      setTask(updatedTask);
      setAssignedTo(updatedTask.assignedTo?._id || updatedTask.assignedTo || '');
      dispatch(fetchTasksByBoard(boardId));
      socket.emit('task-updated', { boardId, task: updatedTask });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to take ownership');
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      const response = await axiosInstance.put(`/tasks/${taskId}/comments/${commentId}`, {
        text: editingCommentText.trim()
      });
      setComments((prev) => prev.map((c) => c._id === commentId ? response.data.comment : c));
      setEditingCommentId(null);
      setEditingCommentText('');
      toast.success('Comment updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment permanently?')) return;
    try {
      await axiosInstance.delete(`/tasks/${taskId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const getAssignedName = () => {
    const matched = boardMembers.find(m => (m._id || m) === assignedTo);
    return matched ? matched.name : 'Unassigned';
  };

  const isUserCollaborator = useMemo(() => {
    if (!task || !task.collaborators) return false;
    return task.collaborators.some(c => (c._id || c) === currentUserId);
  }, [task, currentUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex pl-10 sm:pl-16">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
      />

      {/* Slide-over panel */}
      <div className="w-screen max-w-xl h-full flex flex-col bg-slate-900 border-l border-white/10 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/80 backdrop-blur flex-shrink-0">
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">
              <HiOutlineShieldCheck className="h-3.5 w-3.5" /> Workspace Owner: {ownerName}
            </span>
            <h3 className="mt-1 text-base font-bold text-white">Task Details Drawer</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              Loading task details...
            </div>
          ) : (
            <>
              {/* Form Block */}
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isOwner}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-white outline-none transition ${
                      isOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500' : 'border-white/5 bg-slate-950/30 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isOwner}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-white outline-none transition resize-none ${
                      isOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500' : 'border-white/5 bg-slate-950/30 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-sky-500"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      disabled={!isOwner}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-white outline-none ${
                        isOwner ? 'border-white/10 bg-slate-950 focus:border-sky-500' : 'border-white/5 bg-slate-950/30 cursor-not-allowed'
                      }`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-sky-400">{progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="25"
                    value={progress}
                    disabled={Boolean(task?.checklist && task.checklist.length > 0)}
                    onChange={(e) => setProgress(e.target.value)}
                    className={`w-full h-1.5 bg-slate-950 rounded-lg appearance-none accent-sky-500 ${
                      task?.checklist && task.checklist.length > 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  />
                  {task?.checklist && task.checklist.length > 0 && (
                    <p className="text-[10px] text-slate-500 italic mt-1">
                      Progress is managed automatically by checklist completion.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Assignee</label>
                    {isOwner ? (
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-sky-500"
                      >
                        <option value="">Unassigned</option>
                        {boardMembers.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-300 flex items-center gap-2">
                        <HiOutlineUser className="h-4 w-4 text-sky-400" />
                        <span>{getAssignedName()}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Deadline</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={!isOwner}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-white outline-none ${
                        isOwner ? 'border-white/10 bg-slate-950 focus:border-sky-500' : 'border-white/5 bg-slate-950/30 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {/* Open Contribution Toggle for Owner */}
                {isOwner && (
                  <div className="flex items-center gap-3 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
                    <input
                      type="checkbox"
                      id="openContributionCheckbox"
                      checked={openContribution}
                      onChange={(e) => setOpenContribution(e.target.checked)}
                      className="rounded border-white/10 bg-slate-950 text-sky-500 focus:ring-sky-500 h-4.5 w-4.5"
                    />
                    <label htmlFor="openContributionCheckbox" className="text-xs text-slate-300 font-semibold cursor-pointer">
                      Enable Open Contribution Mode (workspace members can join)
                    </label>
                  </div>
                )}

                {/* Open Contribution Actions Panel */}
                {task?.openContribution && (
                  <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Open Contributor Actions</p>
                    <p className="text-slate-400 text-[10.5px]">This task is open for contributions. Members can claim, release, or take ownership of this task.</p>
                    <div className="flex gap-2 mt-1">
                      {!assignedTo && (
                        <button
                          type="button"
                          onClick={handleClaimTask}
                          className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition"
                        >
                          Claim Task
                        </button>
                      )}
                      {assignedTo && assignedTo !== currentUserId && (
                        <button
                          type="button"
                          onClick={handleTakeOwnership}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
                        >
                          Take Ownership
                        </button>
                      )}
                      {assignedTo === currentUserId && (
                        <button
                          type="button"
                          onClick={handleReleaseTask}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition"
                        >
                          Release Task
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <HiOutlineCheck className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-2.5 transition"
                      title="Delete Task"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>

              {/* Checklist Section */}
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlineClipboardList className="h-4 w-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Checklist</h4>
                  </div>
                  <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                    {task?.checklist?.length || 0} items
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Checklist Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Checklist items list */}
                <div className="space-y-2">
                  {task?.checklist && task.checklist.length > 0 ? (
                    task.checklist.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 group/chk">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklistItem(item._id, item.completed)}
                            className="rounded border-white/10 bg-slate-950 text-sky-500 focus:ring-sky-500 h-4 w-4 cursor-pointer"
                          />
                          <span className={`text-xs text-slate-300 truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
                            {item.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item._id)}
                          className="opacity-0 group-hover/chk:opacity-100 p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition"
                          title="Delete Checklist Item"
                        >
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No checklist items added yet.</p>
                  )}
                </div>

                {/* Add Checklist Item input */}
                <div className="flex gap-2 pt-1">
                  <input
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add a checklist item..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddChecklistItem(e);
                      }
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    disabled={!newChecklistText.trim()}
                    className="rounded-xl bg-slate-100 hover:bg-white text-slate-950 px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Subtasks Section */}
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Inline subtask icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-sky-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75a3 3 0 003-3v-3.75a3 3 0 00-3-3h-3.75M6 6.75H12M6 12h6m-6 5.25h6" />
                    </svg>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Subtasks</h4>
                  </div>
                  <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                    {subtasks.length} subtasks
                  </span>
                </div>

                {/* Parent Task indicator if this is a subtask */}
                {task?.parentTaskId && (
                  <div className="p-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Parent Task</span>
                    <button
                      type="button"
                      onClick={() => handleNavigateToTask(task.parentTaskId._id || task.parentTaskId)}
                      className="text-sky-400 hover:underline font-semibold truncate max-w-[200px]"
                    >
                      {task.parentTaskId.title || 'View Parent Task'}
                    </button>
                  </div>
                )}

                {/* Subtasks List */}
                <div className="space-y-2">
                  {subtasks.length > 0 ? (
                    subtasks.map((sub) => (
                      <div
                        key={sub._id}
                        onClick={() => handleNavigateToTask(sub._id)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-slate-800 hover:bg-slate-900 cursor-pointer transition text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-slate-200 truncate">{sub.title}</p>
                          <div className="flex gap-2 text-[10px] text-slate-500">
                            <span>{sub.status}</span>
                            <span>•</span>
                            <span className="text-sky-400">{sub.progress}%</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {sub.assignedTo && (
                            <span className="rounded-full bg-slate-800 text-[9px] px-1.5 py-0.5 text-slate-400 font-semibold">
                              {sub.assignedTo.name?.split(' ')[0]}
                            </span>
                          )}
                          <HiOutlineChevronRight className="h-4.5 w-4.5 text-slate-500" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No subtasks added yet.</p>
                  )}
                </div>

                {/* Add Subtask Form */}
                <div className="flex gap-2 pt-1">
                  <input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="New subtask title..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtask(e);
                      }
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="rounded-xl bg-slate-100 hover:bg-white text-slate-950 px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </section>

              {/* Collaborators (Open Contributor Mode Panel) */}
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlineUsers className="h-4 w-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Collaborators</h4>
                  </div>
                  {task?.openContribution && (
                    <span className="rounded bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-bold text-sky-400">
                      Open Contribution
                    </span>
                  )}
                </div>

                {/* Collaborators list */}
                <div className="flex flex-wrap gap-2">
                  {task?.collaborators && task.collaborators.length > 0 ? (
                    task.collaborators.map((c) => (
                      <span key={c._id || c} className="inline-flex items-center gap-1 bg-slate-900 border border-white/5 rounded-full px-2.5 py-1 text-xs text-white">
                        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                        {c.name || 'Collaborator'}
                      </span>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No contributors joined yet.</p>
                  )}
                </div>

                {/* Member action button */}
                {task?.openContribution && (
                  <div className="pt-2 border-t border-white/5">
                    {isUserCollaborator ? (
                      <button
                        type="button"
                        onClick={handleLeave}
                        className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition"
                      >
                        [Leave Task]
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleJoin}
                        className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-xl text-xs font-bold transition"
                      >
                        [Join Task]
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Activity Timeline */}
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <HiOutlineClipboardList className="h-4 w-4 text-sky-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Activity</h4>
                </div>

                <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <div key={act._id} className="text-[11px] bg-slate-900 border border-white/5 p-2.5 rounded-lg leading-relaxed text-slate-300">
                        <p>{act.message}</p>
                        <span className="text-[9px] text-slate-500 block mt-1">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No activities recorded.</p>
                  )}
                </div>
              </section>

              {/* Comments Section */}
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <HiOutlineChatAlt className="h-4 w-4 text-sky-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Comments</h4>
                </div>

                <div className="space-y-3.5 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                  {comments.length > 0 ? (
                    comments.map((comment) => {
                      const isCommentOwner = (comment.userId?._id || comment.userId || '').toString() === currentUserId;
                      const canDeleteComment = isCommentOwner || isOwner;
                      const isEditingThisComment = editingCommentId === comment._id;

                      return (
                        <div key={comment._id} className="bg-slate-900 border border-white/5 p-3 rounded-xl text-xs leading-normal">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-semibold">
                            <span className="text-slate-300">{comment.userName || comment.user?.name || 'Teammate'}</span>
                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {isEditingThisComment ? (
                            <div className="space-y-2 pt-1">
                              <input
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditComment(comment._id)}
                                  className="px-2.5 py-1 bg-cyan-500 text-slate-950 rounded font-bold text-[10px]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-slate-200 flex-1 break-words">{comment.text}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isCommentOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(comment._id);
                                      setEditingCommentText(comment.text);
                                    }}
                                    className="text-slate-500 hover:text-white transition p-0.5"
                                    title="Edit Comment"
                                  >
                                    <HiOutlinePencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-slate-500 hover:text-rose-400 transition p-0.5"
                                    title="Delete Comment"
                                  >
                                    <HiOutlineTrash className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No comments yet. Post the first comment!</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="rounded-xl bg-slate-100 hover:bg-white text-slate-950 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              </section>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default TaskDetailsDrawer;
