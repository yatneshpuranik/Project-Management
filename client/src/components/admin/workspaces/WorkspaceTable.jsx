import { HiOutlineFolder, HiOutlineChevronRight } from 'react-icons/hi';

const WorkspaceTable = ({ workspaces = [], selectedWorkspace, onSelectWorkspace }) => {
  return (
    <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      {workspaces.length > 0 ? (
        workspaces.map((ws) => (
          <div
            key={ws._id}
            onClick={() => onSelectWorkspace(ws)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
              selectedWorkspace?._id === ws._id
                ? 'bg-blue-500/10 border-blue-500/30 shadow-md'
                : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold">
                <HiOutlineFolder className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  {ws.title}
                  <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px] uppercase">{ws.visibility}</span>
                  {ws.isArchived && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase">
                      Archived
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Created by: {ws.createdBy?.name || 'Owner'}</p>
              </div>
            </div>
            <HiOutlineChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </div>
        ))
      ) : (
        <div className="text-center py-10 text-slate-500 text-xs italic">
          No workspaces matched the filter.
        </div>
      )}
    </div>
  );
};

export default WorkspaceTable;
