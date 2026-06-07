import { useState } from 'react';

const TaskTable = ({
  tasks = [],
  onReassignTask,
  onDeleteTask,
  onRestoreTask
}) => {
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');

  const handleReassignSubmit = (taskId) => {
    if (!reassignUserId.trim()) return;
    onReassignTask(taskId, reassignUserId);
    setReassignTaskId('');
    setReassignUserId('');
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
            <th className="p-4">Task Name</th>
            <th className="p-4">Workspace</th>
            <th className="p-4">Assigned To</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300">
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <tr key={t._id} className="hover:bg-white/5">
                <td className="p-4 font-bold text-white truncate max-w-[200px]">{t.title}</td>
                <td className="p-4">{t.boardId?.title || 'Unknown Workspace'}</td>
                <td className="p-4">
                  {reassignTaskId === t._id ? (
                    <div className="flex gap-1">
                      <input
                        placeholder="New Assignee ID..."
                        value={reassignUserId}
                        onChange={(e) => setReassignUserId(e.target.value)}
                        className="bg-slate-950 border border-white/10 px-2 py-1 rounded text-[11px] outline-none text-white focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleReassignSubmit(t._id)}
                        className="bg-cyan-500 text-slate-950 font-bold px-2 rounded text-[10px] cursor-pointer"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => {
                          setReassignTaskId('');
                          setReassignUserId('');
                        }}
                        className="bg-slate-800 text-slate-400 px-2 rounded text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{t.assignedTo?.name || 'Unassigned'}</span>
                      <button
                        onClick={() => {
                          setReassignTaskId(t._id);
                          setReassignUserId('');
                        }}
                        className="text-sky-400 hover:underline text-[10px] cursor-pointer font-semibold"
                      >
                        Reassign
                      </button>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase">{t.status}</span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  {t.isDeleted ? (
                    <button
                      onClick={() => onRestoreTask(t._id)}
                      className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => onDeleteTask(t._id)}
                      className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-bold hover:bg-rose-500 hover:text-white transition cursor-pointer"
                    >
                      Soft Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                No tasks registered or matching search filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
