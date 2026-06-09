import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '../utils/motion.js'
import axiosInstance from '../utils/axiosInstance'

const AllUser = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const currentRole = localStorage.getItem('userRole')
  const currentUserId = localStorage.getItem('userId')

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get('/user/all-users')
        setUsers(response.data.users || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleBlockUser = async (userId, userName) => {
    const reason = window.prompt(`Enter block reason for ${userName}:`, 'Violating workspace policy')
    if (reason === null) return // user cancelled
    try {
      const response = await axiosInstance.post(`/user/block/${userId}`, { reason })
      alert(response.data.message || 'User blocked successfully')
      // Update state
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBlocked: true, reason } : u))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to block user')
    }
  }

  const handleUnblockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to unblock this user?')) return
    try {
      const response = await axiosInstance.post(`/user/unblock/${userId}`)
      alert(response.data.message || 'User unblocked successfully')
      // Update state
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBlocked: false, reason: undefined } : u))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user')
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-sky-300/80">Team directory</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">All users</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Browse the full list of workspace users, their contact details, and account information in one polished panel.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Total users</p>
              <p className="mt-3 text-3xl font-semibold text-white">{users.length}</p>
            </div>
          </div>
        </header>

        <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20">
          {loading ? (
            <div className="rounded-3xl bg-slate-950/80 p-8 text-center text-slate-300">Loading users…</div>
          ) : error ? (
            <div className="rounded-3xl bg-rose-500/10 p-6 text-sm text-rose-200">{error}</div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl bg-slate-950/80 p-8 text-center text-slate-400">No users available yet.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <article key={user._id} className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-6 shadow-inner shadow-slate-950/10 flex flex-col justify-between min-h-[180px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-white">{user.name}</p>
                        {user.isBlocked && (
                          <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-1.5 py-0.5 rounded">Blocked</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                    </div>
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || '')}`}
                      alt={user.name}
                      className="h-12 w-12 rounded-full object-cover border border-white/10"
                    />
                  </div>
                  
                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p>
                      <span className="text-slate-300">Joined:</span> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                    <div className="text-xs text-slate-400">
                      <p>
                        <span className="text-slate-300 font-medium">Role:</span> <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${user.role === 'ADMIN' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-800 text-slate-400'}`}>{user.role || 'USER'}</span>
                      </p>
                      {user.isBlocked && user.reason && (
                        <p className="mt-1 text-rose-400/80 text-[10px] italic">
                          "{user.reason}"
                        </p>
                      )}
                    </div>
                    {currentRole === 'ADMIN' && user._id !== currentUserId && user.role !== 'ADMIN' && (
                      <div>
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleUnblockUser(user._id)}
                            className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold transition text-[10px]"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user._id, user.name)}
                            className="px-3 py-1.5 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 hover:bg-rose-500 hover:text-white font-bold transition text-[10px]"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  )
}

export default AllUser
