import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteTask } from '../redux/taskSlice';
import EditTaskModal from './EditTaskModal';
import socket from '../utils/socket';
import { HiOutlineCalendar, HiOutlinePencil, HiOutlineTrash, HiOutlineUser } from 'react-icons/hi';

const TaskCard = ({ task, boardId, status }) => {
  const dispatch = useDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'High':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskData', JSON.stringify({
      taskId: task._id,
      fromStatus: status,
    }));
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const resultAction = await dispatch(deleteTask(task._id));
      if (deleteTask.fulfilled.match(resultAction)) {
        socket.emit('task-deleted', { boardId, taskId: task._id });
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="rounded-xl border border-white/5 bg-slate-900/40 p-4 transition-all duration-200 hover:border-slate-800 hover:bg-slate-900/60 shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg relative"
      >
        {/* Top Header: Priority badge & edit actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityStyle(task.priority)}`}>
            {task.priority}
          </span>
          
          <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-slate-400 hover:text-sky-400 p-0.5 transition"
              title="Edit Task"
            >
              <HiOutlinePencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-slate-400 hover:text-rose-400 p-0.5 transition"
              title="Delete Task"
            >
              <HiOutlineTrash className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-semibold text-slate-200 mb-1.5 leading-snug line-clamp-2">
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-[10px] text-slate-500 mb-3.5 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Footer: User assignment & Due Date */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/5 text-[9px] text-slate-500">
          {task.assignedTo ? (
            <div className="flex items-center gap-1 bg-slate-950/60 rounded px-1.5 py-0.5 border border-white/5 max-w-[120px]">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-sky-500 text-white text-[8px] font-bold">
                {task.assignedTo.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="truncate">{task.assignedTo.name || 'Unassigned'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-600">
              <HiOutlineUser className="h-3.5 w-3.5" />
              <span>Unassigned</span>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1 bg-slate-950/40 rounded px-1.5 py-0.5 border border-white/5">
              <HiOutlineCalendar className="h-3.5 w-3.5 text-slate-600" />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
        boardId={boardId}
      />
    </>
  );
};

export default TaskCard;
