import { HiOutlineClock, HiOutlineSparkles } from 'react-icons/hi'

const ActivityPanel = ({ activities = [], onlineUsers = [] }) => {
  const recentActions = activities.slice(0, 15)

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-400 mb-1">
          <HiOutlineClock className="h-4 w-4 text-sky-500" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Real-Time Activity</span>
        </div>
        <h2 className="text-sm font-bold text-white">Workspace Feed</h2>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Section: Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Activity Timeline</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 border border-white/5 font-bold">{recentActions.length}</span>
          </div>

          <div className="space-y-2">
            {recentActions.length > 0 ? (
              recentActions.map((activity) => (
                <div key={activity._id} className="rounded-xl border border-white/5 bg-slate-900/20 p-3 text-xs leading-normal">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-1">
                    <span className="font-semibold truncate">{activity.userName || 'Workspace Member'}</span>
                    {activity.type && (
                      <span className="rounded-full bg-slate-900 border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        {activity.type}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200">{activity.message}</p>
                  <span className="text-[9px] text-slate-550 block mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-505 text-center py-4 border border-dashed border-white/5 rounded-xl">
                No recent activity.
              </p>
            )}
          </div>
        </div>

        {/* Section: Online Collaborators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Online Members</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {onlineUsers.length} active
            </span>
          </div>

          <div className="space-y-2">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <div key={user.socketId} className="flex items-center gap-2.5 rounded-xl bg-slate-900/20 p-2.5 border border-white/5">
                  <div className="relative flex-shrink-0">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/15">
                      {user.userName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-slate-950 ${
                      user.status === 'Typing...' ? 'bg-sky-400 animate-pulse' : 'bg-emerald-500'
                    }`}></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-xs font-semibold text-slate-200 truncate">{user.userName}</p>
                      <span className="text-[8px] text-slate-500">
                        {user.lastActive ? new Date(user.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 truncate">
                      {user.viewingTask ? `Viewing: ${user.viewingTask}` : 'Viewing board'}
                    </p>
                    <p className="text-[8px] text-sky-400 font-medium">
                      Status: {user.status || 'Online'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-500 text-center py-4 border border-dashed border-white/5 rounded-xl">
                No active collaborators.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Panel Footer */}
      <div className="p-4 border-t border-white/5 flex-shrink-0 bg-slate-950">
        <div className="flex gap-2 items-start text-[10px] text-slate-500 leading-normal">
          <HiOutlineSparkles className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <p>This board is synchronized live. Drag cards to update statuses instantaneously for all online team members.</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityPanel
