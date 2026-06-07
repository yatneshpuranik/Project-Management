import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TaskCard = ({ task, boardId, status }) => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);

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

  const getDueStyle = (dueDate) => {
    if (!dueDate) return { text: 'No deadline', className: 'text-slate-500 bg-slate-900/40' };
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return {
        text: `${Math.abs(diff)}d overdue`,
        className: 'text-rose-400 bg-rose-500/10 font-bold border border-rose-500/10',
      };
    }
    if (diff === 0) {
      return {
        text: 'Due Today',
        className: 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/10',
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

  const dueInfo = getDueStyle(task.dueDate);

  return (
    <>
      <div
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
        className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-slate-900/40 p-4 hover:border-slate-700/60 hover:bg-slate-900/60 cursor-grab active:cursor-grabbing transition shadow-sm hover:shadow-md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className="rounded-full bg-slate-950/60 px-2 py-1 text-[9px] font-semibold text-slate-300">
              {status}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-100 line-clamp-2">{task.title}</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
              <span>Progress</span>
              <span>{task.progress ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${task.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-[10px] text-slate-300">
          <span className={`rounded-full px-2 py-1 ${dueInfo.className}`}>{dueInfo.text}</span>
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
      </div>
    </>
  );
};

export default TaskCard;
