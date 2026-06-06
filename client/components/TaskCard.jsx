import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteTask } from '../redux/taskSlice';
import EditTaskModal from './EditTaskModal';
import socket from '../utils/socket';
import { HiOutlineCalendar, HiOutlineChat, HiOutlineTrash, HiOutlineUserCircle } from 'react-icons/hi';

const TaskCard = ({ task, boardId, status }) => {
  const dispatch = useDispatch();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => {
    const stored = localStorage.getItem(`unread_chat_${task._id}`);
    return stored ? parseInt(stored, 10) : 0;
  });

  const currentBoard = useSelector((state) => state.boards.currentBoard);
  const currentUserId = localStorage.getItem('userId');
  const isOwner =
    currentBoard &&
    (currentBoard.createdBy?._id === currentUserId || currentBoard.createdBy === currentUserId);

  useEffect(() => {
    const handleBoardMessage = (data) => {
      if (data.taskId === task._id && !isEditOpen) {
        setUnreadCount((prev) => {
          const next = prev + 1;
          localStorage.setItem(`unread_chat_${task._id}`, next.toString());
          return next;
        });
      }
    };

    socket.on('boardChatMessageSent', handleBoardMessage);
    return () => {
      socket.off('boardChatMessageSent', handleBoardMessage);
    };
  }, [task._id, isEditOpen]);

  const handleDragStart = (e) => {
    e.dataTransfer.setData(
      'taskData',
      JSON.stringify({ taskId: task._id, fromStatus: status })
    );
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      try {
        const resultAction = await dispatch(deleteTask(task._id));
        if (deleteTask.fulfilled.match(resultAction)) {
          socket.emit('task-deleted', { boardId, taskId: task._id });
        }
      } catch (err) {
        console.error('Delete task failed:', err);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
      case 'Medium':
        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'Low':
      default:
        return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
    }
  };

  // Due Date styling
  const getDueStyle = (dueDate) => {
    if (!dueDate) return { text: '', className: '' };
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isDone = status === 'Done';

    if (diff < 0) {
      return {
        text: `${Math.abs(diff)}d overdue`,
        className: isDone ? 'text-slate-500 bg-slate-900/40' : 'text-rose-400 bg-rose-500/10 font-bold border border-rose-500/10',
      };
    }
    if (diff === 0) {
      return {
        text: 'Due Today',
        className: isDone ? 'text-slate-500 bg-slate-900/40' : 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/10',
      };
    }
    if (diff === 1) {
      return {
        text: 'Tomorrow',
        className: isDone ? 'text-slate-500 bg-slate-900/40' : 'text-sky-400 bg-sky-500/10 border border-sky-500/10',
      };
    }
    return {
      text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      className: 'text-slate-400 bg-slate-900/40 border border-white/5',
    };
  };

  const dueInfo = getDueStyle(task.dueDate);

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => {
          setUnreadCount(0);
          localStorage.removeItem(`unread_chat_${task._id}`);
          setIsEditOpen(true);
        }}
        className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-slate-900/40 p-4 hover:border-slate-700/60 hover:bg-slate-900/60 cursor-grab active:cursor-grabbing transition shadow-sm hover:shadow-md"
      >
        <div className="space-y-3">
          {/* Badge Row */}
          <div className="flex items-center justify-between">
            <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="hidden group-hover:block rounded p-1 text-slate-500 hover:bg-white/5 hover:text-rose-400 transition"
                title="Delete Task"
              >
                <HiOutlineTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Title & Desc */}
          <div>
            <h4 className="text-xs font-semibold text-slate-100 group-hover:text-sky-400 transition line-clamp-1">
              {task.title}
            </h4>
            {task.description && (
              <p className="mt-1 text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8px] text-slate-500 font-semibold">
              <span>Progress</span>
              <span>{task.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-950/60 h-1 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${task.progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Footer Details */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-2">
            {dueInfo.text && (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] ${dueInfo.className}`}>
                <HiOutlineCalendar className="h-3 w-3" />
                {dueInfo.text}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-slate-500" title="Comments count">
              <HiOutlineChat className="h-3.5 w-3.5" />
              {task.comments?.length || 0}
            </span>

            {/* Chat Unread Badge */}
            {unreadCount > 0 && (
              <span className="inline-flex h-4 px-1 min-w-4 items-center justify-center rounded-full bg-sky-400 text-[8px] font-bold text-slate-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Assignee initials/avatar */}
          <div className="flex items-center gap-1.5 max-w-[50%]">
            {task.assignedTo ? (
              <div
                className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-md bg-gradient-to-br from-slate-800 to-slate-700 text-white text-[8px] font-bold border border-slate-950"
                title={`Assigned to ${task.assignedTo.name}`}
              >
                {task.assignedTo.name?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <HiOutlineUserCircle className="h-4.5 w-4.5 text-slate-600" title="Unassigned" />
            )}
          </div>
        </div>

        {/* Display Created By */}
        {task.createdBy?.name && (
          <div className="mt-1.5 text-[8px] text-slate-500 border-t border-dashed border-white/5 pt-1.5">
            Created By: <span className="font-medium text-slate-400">{task.createdBy.name}</span>
          </div>
        )}
      </div>

      {isEditOpen && (
        <EditTaskModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          task={task}
          boardId={boardId}
        />
      )}
    </>
  );
};

export default TaskCard;
