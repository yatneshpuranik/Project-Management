import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { setUser } from '../redux/userSlice.js';
import { toast } from '../utils/toast.js';

const ProfileScreen = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsernameState] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

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
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setUpdating(true);
    try {
      const response = await axiosInstance.put('/user/profile', {
        name: name.trim(),
        username: username.trim(),
        password: password || undefined,
      });

      if (response.data.success) {
        toast.success('Profile updated successfully');
        dispatch(setUser(response.data.user));
        localStorage.setItem('userName', response.data.user.name);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const isAdmin = user.role === 'ADMIN';
  const themeColorClass = isAdmin ? 'cyan' : 'sky';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-sm uppercase tracking-[0.32em] font-bold text-${themeColorClass}-400`}>
                {isAdmin ? 'Platform Admin Profile' : 'My profile'}
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{user.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                Manage your credentials, update your account settings, and review your platform metadata.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 px-6 py-4 text-center text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
              <p className="mt-2 text-lg font-semibold text-white">{user.email}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Edit Credentials Form */}
          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400 font-bold mb-6">Modify Credentials</p>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-${themeColorClass}-500 transition`}
                  placeholder="Enter display name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsernameState(e.target.value)}
                  className={`w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-${themeColorClass}-500 transition`}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">New Password (optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-${themeColorClass}-500 transition`}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-${themeColorClass}-500 transition`}
                  placeholder="Confirm new password"
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                className={`w-full rounded-2xl text-slate-950 py-3 text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer ${
                  isAdmin ? 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/10' : 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/10'
                }`}
              >
                {updating ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Read-Only Meta Data */}
          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20 flex flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400 font-bold mb-6">Security Metadata</p>
              <div className="space-y-4 text-xs text-slate-300">
                <div className="rounded-2xl bg-slate-950/80 p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Email Address</p>
                  <p className="mt-1.5 text-xs text-white font-medium truncate">{user.email}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/80 p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Console Role</p>
                  <p className={`mt-1.5 text-xs font-bold ${isAdmin ? 'text-cyan-400' : 'text-sky-400'}`}>{user.role}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/80 p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Account Created</p>
                  <p className="mt-1.5 text-xs text-slate-300 font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/5 space-y-3">
              {isAdmin ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-100 transition hover:bg-white/10 cursor-pointer"
                >
                  Return to Panel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/boards')}
                    className="w-full rounded-2xl bg-sky-500 hover:bg-sky-400 text-white px-5 py-3 text-xs font-bold transition cursor-pointer"
                  >
                    Open Boards
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-100 transition hover:bg-white/10 cursor-pointer"
                  >
                    Return Home
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileScreen;
