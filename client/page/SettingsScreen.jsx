import React, { useState } from 'react';
import { HiOutlineAdjustments, HiOutlineUserGroup, HiOutlineBell, HiOutlineDatabase, HiOutlineChevronRight } from 'react-icons/hi';

const SettingsScreen = () => {
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState({
    taskAssigned: true,
    taskMoved: true,
    chatMention: false,
    weeklyReport: true
  });
  const [permissions, setPermissions] = useState('members');

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">System Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Workspace Settings</h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage system controls, collaborative permissions, theme features, and live syncing.
        </p>
      </header>

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Section 1: Visual Theme */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/15">
              <HiOutlineAdjustments className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Visual Customization</h2>
              <p className="text-[10px] text-slate-400">Choose the styling appearance of your SaaS workspace.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setTheme('dark')}
              className={`rounded-xl border p-4 text-left transition ${
                theme === 'dark'
                  ? 'border-sky-500 bg-sky-500/5 text-white'
                  : 'border-white/5 bg-slate-950/40 text-slate-400 hover:bg-slate-900/60'
              }`}
            >
              <span className="block text-xs font-semibold">Deep Slate Dark</span>
              <span className="mt-1 block text-[10px] text-slate-500">Premium dark tones with glowing blue highlights.</span>
            </button>
            
            <button
              onClick={() => setTheme('light')}
              className={`rounded-xl border p-4 text-left transition ${
                theme === 'light'
                  ? 'border-sky-500 bg-sky-500/5 text-white'
                  : 'border-white/5 bg-slate-950/40 text-slate-400 hover:bg-slate-900/60'
              }`}
            >
              <span className="block text-xs font-semibold">Glassmorphic Light</span>
              <span className="mt-1 block text-[10px] text-slate-500">Bright, clean theme utilizing frosted card backdrops.</span>
            </button>

            <button
              onClick={() => setTheme('cyberpunk')}
              className={`rounded-xl border p-4 text-left transition ${
                theme === 'cyberpunk'
                  ? 'border-sky-500 bg-sky-500/5 text-white'
                  : 'border-white/5 bg-slate-950/40 text-slate-400 hover:bg-slate-900/60'
              }`}
            >
              <span className="block text-xs font-semibold">Neon Terminal</span>
              <span className="mt-1 block text-[10px] text-slate-500">Retro digital styles with high contrast purple accents.</span>
            </button>
          </div>
        </section>

        {/* Section 2: Permissions */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              <HiOutlineUserGroup className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Collaboration Rules</h2>
              <p className="text-[10px] text-slate-400">Control board joining constraints and task manipulations.</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">Allow guest invitations</p>
                <p className="text-[10px] text-slate-500">Enable non-authenticated links to preview selected boards.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">Task movement access</p>
                <p className="text-[10px] text-slate-500">Determine who has authority to drag and drop cards to different columns.</p>
              </div>
              <select
                value={permissions}
                onChange={(e) => setPermissions(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
              >
                <option value="all">Everyone</option>
                <option value="members">Verified Members</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Notification channels */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/15">
              <HiOutlineBell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Event Alerts</h2>
              <p className="text-[10px] text-slate-400">Configure alert rules for tasks updates and collaborative events.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            {Object.keys(notifications).map((key) => (
              <div 
                key={key} 
                onClick={() => toggleNotification(key)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer hover:bg-slate-900/30 transition"
              >
                <span className="text-xs font-medium text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  notifications[key] ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-800 text-slate-500 border border-transparent'
                }`}>
                  {notifications[key] ? 'Enabled' : 'Muted'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Data Syncing */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/20 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/15">
              <HiOutlineDatabase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Database & Socket Connection</h2>
              <p className="text-[10px] text-slate-400">Check server synchronization parameters.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-white">Websocket Connected</span>
            </div>
            <span className="text-[10px] text-slate-500">Port 8000 (ws://localhost:8000)</span>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SettingsScreen;
