import { useState, useEffect } from 'react';
import axiosInstance from '../../../../utils/axiosInstance';

const TaskTable = ({
  tasks = [],
  onReassignTask,
  onDeleteTask,
  onRestoreTask
}) => {
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignQuery, setReassignQuery] = useState('');
  const [reassignSuggestions, setReassignSuggestions] = useState([]);
  const [selectedReassignUser, setSelectedReassignUser] = useState(null);
  const [isSearchingReassign, setIsSearchingReassign] = useState(false);

  // Debounced search for Task Reassignment
  useEffect(() => {
    if (!reassignQuery.trim()) {
      setReassignSuggestions([]);
      return;
    }
    setIsSearchingReassign(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(reassignQuery)}`);
        setReassignSuggestions(response.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingReassign(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [reassignQuery]);

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
                    <div className="flex flex-col gap-1.5 min-w-[200px] relative">
                      {selectedReassignUser ? (
                        <div className="flex items-center justify-between p-1 rounded-lg bg-slate-950 border border-white/10 text-[11px] gap-2">
                          <span className="text-white truncate font-bold">{selectedReassignUser.name}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                onReassignTask(t._id, selectedReassignUser._id);
                                setReassignTaskId('');
                                setSelectedReassignUser(null);
                                setReassignQuery('');
                              }}
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => setSelectedReassignUser(null)}
                              className="bg-white/5 hover:bg-white/10 text-slate-400 font-bold px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            placeholder="Search user..."
                            value={reassignQuery}
                            onChange={(e) => setReassignQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 px-2 py-1 rounded text-[11px] outline-none text-white focus:border-cyan-500"
                          />
                          {isSearchingReassign && (
                            <span className="absolute right-2 top-1 text-[8px] text-slate-500">Searching...</span>
                          )}
                          {reassignSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 max-h-32 overflow-y-auto border border-white/10 bg-slate-950 rounded-lg z-50 p-1 space-y-0.5 shadow-2xl custom-scrollbar text-left">
                              {reassignSuggestions.map((usr) => (
                                <button
                                  key={usr._id}
                                  onClick={() => {
                                    setSelectedReassignUser(usr);
                                    setReassignSuggestions([]);
                                  }}
                                  className="w-full flex items-center gap-1.5 p-1 hover:bg-white/5 rounded text-left text-[10px]"
                                >
                                  <img
                                    src={usr.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(usr.name)}`}
                                    alt={usr.name}
                                    className="h-4 w-4 rounded-full border border-white/10 animate-fade-in"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-white truncate leading-tight text-[10px]">{usr.name}</p>
                                    <p className="text-slate-500 text-[8px] truncate leading-none mt-0.5">{usr.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!selectedReassignUser && (
                        <button
                          onClick={() => {
                            setReassignTaskId('');
                            setReassignQuery('');
                            setReassignSuggestions([]);
                          }}
                          className="text-slate-500 hover:text-slate-350 text-[9px] text-left underline mt-0.5"
                        >
                          Cancel reassign
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{t.assignedTo?.name || 'Unassigned'}</span>
                      <button
                        onClick={() => {
                          setReassignTaskId(t._id);
                          setReassignQuery('');
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
