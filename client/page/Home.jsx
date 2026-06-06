import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.user)

  useEffect(() => {
    if (user) {
      navigate('/boards')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <p className="inline-flex rounded-full bg-sky-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.34em] text-sky-200">
              Agile collaboration
            </p>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Build smarter boards and move work faster.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Sign in to access your live kanban workspace, manage tasks in real time, and collaborate with your team on a polished project dashboard.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
              >
                Login to continue
              </button>
              <button
                onClick={() => navigate('/boards')}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Explore boards
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Dashboard preview</p>
            <div className="mt-6 space-y-4 rounded-[28px] bg-slate-950/80 p-6">
              <div className="flex items-center justify-between gap-4 rounded-3xl bg-slate-900/80 px-5 py-4">
                <div>
                  <p className="text-sm text-slate-400">Active boards</p>
                  <p className="mt-1 text-2xl font-semibold text-white">12</p>
                </div>
                <div className="rounded-2xl bg-sky-500/10 px-3 py-2 text-sm text-sky-200">3 live</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-slate-900/80 p-4">
                  <p className="text-sm text-slate-400">Team tasks</p>
                  <p className="mt-3 text-3xl font-semibold text-white">124</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-4">
                  <p className="text-sm text-slate-400">Projects</p>
                  <p className="mt-3 text-3xl font-semibold text-white">7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
