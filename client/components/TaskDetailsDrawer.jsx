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
  HiOutlineShieldCheck
} from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import { updateTask, deleteTask, joinTask, leaveTask } from '../redux/taskSlice';
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

  // Load task details
  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, commentsRes, activityRes] = await Promise.all([
        axiosInstance.get(`/tasks/${taskId}`),
        axiosInstance.get(`/tasks/${taskId}/comments`),
        axiosInstance.get(`/activity/board/${boardId}`),
      ]);

      const taskData = taskRes.data.task;
      setTask(taskData);
      setComments(commentsRes.data.comments || []);
      
      const relatedActivities = (activityRes.data.activities || []).filter(
        act => act.taskId === taskId
      );
      setActivities(relatedActivities);

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
        setComments((prev) => [...prev, data.comment]);
      }
    };

    const onTaskUpdated = (data) => {
      if (data.task?._id === taskId) {
        // Refresh local state if updated by someone else
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

    socket.on('comment-added', onCommentAdded);
    socket.on('commentAdded', onCommentAdded);
    socket.on('task-updated', onTaskUpdated);
    socket.on('activity-created', onActivityCreated);

    return () => {
      socket.off('comment-added', onCommentAdded);
      socket.off('commentAdded', onCommentAdded);
      socket.off('task-updated', onTaskUpdated);
      socket.off('activity-created', onActivityCreated);
    };
  }, [isOpen, taskId]);

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
      setComments((prev) => [...prev, response.data.comment]);
      setCommentText('');
      socket.emit('comment-added', {
        boardId,
        taskId,
        comment: response.data.comment,
      });
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
                    onChange={(e) => setProgress(e.target.value)}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
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
                    comments.map((comment) => (
                      <div key={comment._id} className="bg-slate-900 border border-white/5 p-3 rounded-xl text-xs leading-normal">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-semibold">
                          <span className="text-slate-300">{comment.userName || comment.user?.name || 'Teammate'}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-200">{comment.text}</p>
                      </div>
                    ))
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
