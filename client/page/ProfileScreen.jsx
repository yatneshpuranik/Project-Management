import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const ProfileScreen = () => {
  const { user } = useSelector((state) => state.user)
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
          <h2 className="text-3xl font-semibold text-white">Profile</h2>
          <p className="mt-4 text-slate-400">No user data found. Please log in to access your profile.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 inline-flex rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-sky-300/80">My profile</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{user.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                Manage your account details, review your profile information, and jump back into your boards.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 px-6 py-4 text-center text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
              <p className="mt-2 text-lg font-semibold text-white">{user.email}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Account summary</p>
            <div className="mt-6 space-y-4 text-slate-300">
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Name</p>
                <p className="mt-2 text-lg font-semibold text-white">{user.name}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Email</p>
                <p className="mt-2 text-lg font-semibold text-white">{user.email}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Joined</p>
                <p className="mt-2 text-lg font-semibold text-white">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Quick actions</p>
            <div className="mt-8 space-y-4">
              <button
                onClick={() => navigate('/boards')}
                className="w-full rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Open boards
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Return home
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfileScreen
