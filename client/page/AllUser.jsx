import React, { useEffect, useState } from 'react'
import axiosInstance from '../utils/axiosInstance'

const AllUser = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
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
                <article key={user._id} className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-6 shadow-inner shadow-slate-950/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{user.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p>
                      <span className="text-slate-300">ID:</span> {user._id}
                    </p>
                    <p>
                      <span className="text-slate-300">Joined:</span> {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AllUser
