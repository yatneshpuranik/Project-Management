import { toast } from '../../../../utils/toast';

const AdminSettingsPanel = ({ settings, setSettings }) => {
  const handleToggleMaintenance = (e) => {
    setSettings({ ...settings, maintenanceMode: e.target.checked });
    toast.success('Maintenance mode setting saved locally.');
  };

  const handleToggleRegistration = (e) => {
    setSettings({ ...settings, registrationEnabled: e.target.checked });
    toast.success('Registration config saved.');
  };

  const handleChangeLogLevel = (e) => {
    setSettings({ ...settings, logLevel: e.target.value });
    toast.success(`Logger level configured to: ${e.target.value}`);
  };

  return (
    <div className="premium-card premium-card-hover space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <strong className="text-sm text-slate-200">Maintenance Mode</strong>
          <p className="text-[10px] text-slate-500">Redirect users to system offline page during deployments.</p>
        </div>
        <input
          type="checkbox"
          checked={settings.maintenanceMode}
          onChange={handleToggleMaintenance}
          className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-blue-500 h-4 w-4 cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div>
          <strong className="text-sm text-slate-200">Allow New Registrations</strong>
          <p className="text-[10px] text-slate-500">Block or allow sign-up screen operations globally.</p>
        </div>
        <input
          type="checkbox"
          checked={settings.registrationEnabled}
          onChange={handleToggleRegistration}
          className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-blue-500 h-4 w-4 cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div>
          <strong className="text-sm text-slate-200">Centralized Logger level</strong>
          <p className="text-[10px] text-slate-500">Configure default API logging noise suppression level.</p>
        </div>
        <select
          value={settings.logLevel}
          onChange={handleChangeLogLevel}
          className="bg-slate-950 border border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-white focus:border-blue-500"
        >
          <option value="silent">silent</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
          <option value="debug">debug</option>
        </select>
      </div>
    </div>
  );
};

export default AdminSettingsPanel;
