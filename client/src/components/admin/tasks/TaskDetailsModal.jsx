const TaskDetailsModal = ({ task, onClose }) => {
  if (!task) return null;

  return (
    <div className="premium-modal-backdrop">
      <div className="premium-modal-container relative space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Task Auditor</span>
            <h3 className="text-base font-bold text-white mt-1">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3 text-xs text-slate-400">
          <p className="flex justify-between">
            <span>Workspace:</span>
            <span className="font-semibold text-slate-200">{task.boardId?.title || 'Unknown Workspace'}</span>
          </p>
          <p className="flex justify-between">
            <span>Assignee:</span>
            <span className="font-semibold text-slate-200">{task.assignedTo?.name || 'Unassigned'}</span>
          </p>
          <p className="flex justify-between">
            <span>Assignee Email:</span>
            <span className="font-semibold text-slate-300">{task.assignedTo?.email || 'N/A'}</span>
          </p>
          <p className="flex justify-between">
            <span>Status:</span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-bold uppercase">
              {task.status}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Priority:</span>
            <span className="font-semibold text-slate-200 uppercase">{task.priority || 'Normal'}</span>
          </p>
          {task.description && (
            <div className="space-y-1 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Description</span>
              <p className="bg-slate-950 p-3 rounded-xl border border-white/5 italic text-slate-300">
                "{task.description}"
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
