import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { HiOutlineHome, HiOutlineViewBoards, HiOutlineChartBar, HiOutlineClock, HiOutlineUser, HiOutlineCog, HiOutlineShieldCheck } from 'react-icons/hi'
import { toast } from '../utils/toast'

const navItems = [
  { label: 'Dashboard', to: '/boards', icon: HiOutlineHome, end: true },
  { label: 'Boards', to: '/boards', icon: HiOutlineViewBoards },
  { label: 'Analytics', to: '/analytics', icon: HiOutlineChartBar },
  { label: 'Activities', to: '/all-users', icon: HiOutlineClock },
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
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userEmail === 'yatnesh@admin.com'

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

  return (
    <div className="flex h-full flex-col justify-between bg-slate-950 p-4">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Navigation Section */}
        <div className="space-y-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Navigation</p>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              const isWorkspaceRequired = item.label === 'Analytics' || item.label === 'Settings'

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
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                      isCustomActive 
                        ? 'bg-slate-900 text-sky-400 border border-white/5 shadow-inner' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Boards Section - Only show to non-admins */}
        {!isAdmin && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace Boards</p>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-white/5">{boards.length}</span>
            </div>
            <div className="space-y-1 max-h-[30vh] overflow-y-auto custom-scrollbar">
              {boards.length > 0 ? (
                boards.map((board) => (
                  <button
                    key={board._id}
                    type="button"
                    onClick={() => handleSelectBoard(board._id)}
                    className={`w-full flex flex-col items-start gap-1 rounded-xl px-3 py-2 text-left text-xs transition border ${
                      activeBoardId === board._id
                        ? 'border-sky-500/30 bg-slate-900 text-white shadow-md'
                        : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold truncate w-full">{board.title}</span>
                    {board.description && (
                      <span className="text-[10px] text-slate-500 line-clamp-1">{board.description}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-slate-900/30 px-3 py-4 text-center text-[11px] text-slate-500">
                  No active boards.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {!isAdmin && (
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="rounded-xl bg-slate-900/40 p-3 border border-white/5 text-[11px] text-slate-400 leading-normal">
            <p className="font-semibold text-slate-200">Collab Workspace</p>
            <p className="mt-1">Build cards, track reviews, and run sprints dynamically.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
