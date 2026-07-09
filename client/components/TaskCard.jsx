import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineChatAlt } from 'react-icons/hi';

const TaskCard = ({ task, boardId, status }) => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-[#EF4444] bg-rose-500/10 border border-rose-500/20';
      case 'Medium':
        return 'text-[#F59E0B] bg-amber-500/10 border border-amber-500/20';
      case 'Low':
      default:
        return 'text-[#14F195] bg-emerald-500/10 border border-emerald-500/20';
    }
  };

  const getDueStyle = (dueDate) => {
    if (!dueDate) return { text: 'No deadline', className: 'text-slate-550 bg-slate-900/40' };
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return {
        text: `${Math.abs(diff)}d overdue`,
        className: 'text-rose-405 bg-rose-500/10 font-bold border border-rose-500/10',
      };
    }
    if (diff === 0) {
      return {
        text: 'Due Today',
        className: 'text-amber-405 bg-amber-500/10 font-bold border border-amber-500/10',
      };
    }
    if (diff === 1) {
      return {
        text: 'Tomorrow',
        className: 'text-sky-400 bg-sky-500/10 border border-sky-500/10',
      };
    }
    return {
      text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      className: 'text-slate-400 bg-slate-900/40 border border-white/5',
    };
  };

  const getProgressGradient = (colStatus) => {
    switch (colStatus) {
      case 'Todo':
        return 'from-[#8B5CF6] to-[#a78bfa]';
      case 'In Progress':
        return 'from-[#F59E0B] to-[#fbbf24]';
      case 'Done':
        return 'from-[#14F195] to-[#34d399]';
      case 'Review':
      default:
        return 'from-[#39BDF8] to-[#60a5fa]';
    }
  };

  const dueInfo = getDueStyle(task.dueDate);
  const lastSeenCount = parseInt(localStorage.getItem(`task_comments_seen_${task._id}`) || '0', 10);
  const hasUnread = (task.comments?.length || 0) > lastSeenCount;

  return (
    <>
      <motion.div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('taskData', JSON.stringify({ taskId: task._id, fromStatus: status }));
          setDragging(true);
        }}
        onDragEnd={() => {
          window.setTimeout(() => setDragging(false), 0);
        }}
        onClick={() => {
          if (dragging) return;
          navigate(`/boards/${boardId}/tasks/${task._id}`)
        }}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="group relative flex flex-col justify-between rounded-2xl border border-white/6 bg-slate-900/60 p-4 cursor-grab active:cursor-grabbing transition-[border-color,box-shadow] duration-200 shadow-sm hover:border-[rgba(56,189,248,0.25)] hover:shadow-[0_0_20px_rgba(56,189,248,0.12)]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className="rounded-full bg-slate-950/60 px-2 py-1 text-[9px] font-semibold text-slate-400">
              {status}
            </span>
          </div>

          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((lbl, idx) => (
                <span key={idx} className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/5">
                  {lbl}
                </span>
              ))}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-sky-400 transition-colors duration-200">{task.title}</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
              <span>Progress</span>
              <span>{task.progress ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className={`bg-gradient-to-r ${getProgressGradient(status)} h-full rounded-full transition-all duration-300`}
                style={{ width: `${task.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-[10px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 ${dueInfo.className}`}>{dueInfo.text}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem(`task_comments_seen_${task._id}`, task.comments?.length || 0);
                navigate(`/boards/${boardId}?comments=${task._id}`);
              }}
              className="relative p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition flex items-center justify-center"
              title="View Comments"
            >
              <HiOutlineChatAlt className="h-4.5 w-4.5" />
              {hasUnread && (
                <span className="absolute top-0.5 right-0.5 block h-2 w-2 rounded-full bg-[#EF4444] ring-1 ring-slate-900" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {task.assignedTo ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] text-slate-200">
                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-slate-950">
                  {task.assignedTo.name?.charAt(0).toUpperCase()}
                </div>
                <span>{task.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-slate-500">Unassigned</span>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TaskCard;
