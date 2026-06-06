import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { moveTask } from '../redux/taskSlice';
import TaskCard from './TaskCard';
import socket from '../utils/socket';

const Column = ({ status, tasks, boardId, onAddTask }) => {
  const dispatch = useDispatch();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const data = JSON.parse(e.dataTransfer.getData('taskData'));
    const { taskId, fromStatus } = data;

    if (fromStatus !== status) {
      try {
        const resultAction = await dispatch(
          moveTask({
            taskId,
            data: { status },
          })
        );

        if (moveTask.fulfilled.match(resultAction)) {
          socket.emit('task-moved', {
            boardId,
            task: resultAction.payload,
            fromStatus,
            toStatus: status,
          });
        }
      } catch (error) {
        console.error('Error moving task:', error);
      }
    }
  };

  const dotColors = {
    Todo: 'bg-slate-500',
    'In Progress': 'bg-sky-500',
    Review: 'bg-amber-500',
    Done: 'bg-emerald-500',
  };

  return (
    <div className={`flex flex-col h-[65vh] rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-md transition ${
      isDraggingOver ? 'ring-2 ring-sky-500/30 bg-slate-900/40' : ''
    }`}>
      {/* Column Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-slate-900/40 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColors[status] || 'bg-slate-500'}`}></span>
          <h3 className="text-xs font-semibold text-slate-200">{status}</h3>
          <span className="rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-white/5">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="rounded-lg bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 text-[10px] font-semibold text-sky-400 transition"
        >
          + Add
        </button>
      </div>

      {/* Cards Stack */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar"
      >
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard key={task._id} task={task} boardId={boardId} status={status} />
          ))
        ) : (
          <div className="flex min-h-[5rem] items-center justify-center rounded-xl border border-dashed border-white/5 bg-slate-950/20 p-4 text-center text-[10px] text-slate-500">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};

export default Column;
