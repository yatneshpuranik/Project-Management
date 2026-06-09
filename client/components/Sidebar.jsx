import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { HiOutlineHome, HiOutlineViewBoards, HiOutlineChartBar, HiOutlineClock, HiOutlineUser, HiOutlineCog, HiOutlineShieldCheck } from 'react-icons/hi'
import { toast } from '../utils/toast'
import { motion } from 'framer-motion'

const navItems = [
  { label: 'Dashboard', to: '/boards', icon: HiOutlineHome, end: true },
  { label: 'Boards', to: '/boards', icon: HiOutlineViewBoards },
  { label: 'Analytics', to: '/analytics', icon: HiOutlineChartBar },
  { label: 'Profile', to: '/profile', icon: HiOutlineUser },
  { label: 'Settings', to: '/settings', icon: HiOutlineCog },
]

const Sidebar = ({ onLinkClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { boardId: activeBoardId } = useParams()
  const { boards } = useSelector((state) => state.boards)

  const userRole = localStorage.getItem('userRole')
  const userEmail = localStorage.getItem('userEmail')
  const currentUserId = localStorage.getItem('userId')
  const isAdmin = userRole === 'ADMIN'

  // If Admin, only show the Admin Panel link. Remove normal workspace routes.
  const items = isAdmin
    ? [{ label: 'Admin Panel', to: '/admin', icon: HiOutlineShieldCheck }]
    : [...navItems]

  const handleSelectBoard = (id) => {
    navigate(`/boards/${id}`)
    if (onLinkClick) onLinkClick()
  }

  const handleNavLinkClick = () => {
    if (onLinkClick) onLinkClick()
  }

  const myWorkspaces = boards.filter(b => (b.createdBy?._id || b.createdBy || '').toString() === currentUserId)
  const joinedWorkspaces = boards.filter(b => (b.createdBy?._id || b.createdBy || '').toString() !== currentUserId)

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Navigation Section */}
        <div className="space-y-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              const isWorkspaceRequired = item.label === 'Analytics'

              const handleClick = (e) => {
                if (isWorkspaceRequired && !activeBoardId) {
                  e.preventDefault()
                  toast.error('Please select a workspace first.')
                  return
                }
                handleNavLinkClick()
              }

              // Custom active highlight logic to avoid duplicate highlighting of Dashboard & Boards
              const isCustomActive = (() => {
                if (item.label === 'Dashboard') {
                  return location.pathname === '/boards' && !activeBoardId
                }
                if (item.label === 'Boards') {
                  return location.pathname.startsWith('/boards') && !!activeBoardId
                }
                return location.pathname.startsWith(item.to)
              })()

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={handleClick}
                  className={
                    `relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition border border-transparent ${
                      isCustomActive 
                        ? 'text-sky-400' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`
                  }
                >
                  {isCustomActive && (
                    <motion.span
                      layoutId="activeUserNav"
                      className="absolute inset-0 bg-[rgba(57,189,248,0.12)] border border-[rgba(57,189,248,0.25)] rounded-xl z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="h-4.5 w-4.5 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Boards Section - Only show to non-admins */}
        {!isAdmin && (
          <div className="space-y-4">
            {/* MY WORKSPACES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">MY WORKSPACES</p>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-white/5">{myWorkspaces.length}</span>
              </div>
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar">
                {myWorkspaces.length > 0 ? (
                  myWorkspaces.map((board) => (
                    <button
                      key={board._id}
                      type="button"
                      onClick={() => handleSelectBoard(board._id)}
                      className={`relative w-full flex flex-col items-start gap-1 rounded-xl px-3.5 py-3 text-left text-xs transition border border-transparent ${
                        activeBoardId === board._id
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      }`}
                    >
                      {activeBoardId === board._id && (
                        <motion.span
                          layoutId="activeWorkspaceNav"
                          className="absolute inset-0 bg-[rgba(57,189,248,0.12)] border border-[rgba(57,189,248,0.25)] rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="font-semibold truncate w-full relative z-10">{board.title}</span>
                      {board.description && (
                        <span className="text-[10px] text-slate-500 line-clamp-1 relative z-10">{board.description}</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/5 bg-slate-900/30 px-3 py-4 text-center text-[11px] text-slate-500">
                    No owned workspaces.
                  </div>
                )}
              </div>
            </div>

            {/* JOINED WORKSPACES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">JOINED WORKSPACES</p>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-white/5">{joinedWorkspaces.length}</span>
              </div>
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar">
                {joinedWorkspaces.length > 0 ? (
                  joinedWorkspaces.map((board) => (
                    <button
                      key={board._id}
                      type="button"
                      onClick={() => handleSelectBoard(board._id)}
                      className={`relative w-full flex flex-col items-start gap-1 rounded-xl px-3.5 py-3 text-left text-xs transition border border-transparent ${
                        activeBoardId === board._id
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      }`}
                    >
                      {activeBoardId === board._id && (
                        <motion.span
                          layoutId="activeWorkspaceNav"
                          className="absolute inset-0 bg-[rgba(57,189,248,0.12)] border border-[rgba(57,189,248,0.25)] rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="font-semibold truncate w-full relative z-10">{board.title}</span>
                      {board.description && (
                        <span className="text-[10px] text-slate-500 line-clamp-1 relative z-10">{board.description}</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/5 bg-slate-900/30 px-3 py-4 text-center text-[11px] text-slate-500">
                    No joined workspaces.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {!isAdmin && (
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="rounded-2xl bg-slate-900/30 p-3 border border-white/5 text-[11px] text-slate-400 leading-normal backdrop-blur-md">
            <p className="font-semibold text-slate-200 uppercase tracking-[0.2em] text-[9px]">COLLAB WORKSPACE</p>
            <p className="mt-1">Build cards, track reviews, and run sprints dynamically.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
