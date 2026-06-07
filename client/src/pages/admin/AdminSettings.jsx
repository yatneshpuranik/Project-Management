import { useState } from 'react';
import AdminSettingsPanel from '../../components/admin/settings/AdminSettingsPanel';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    discordWebhooks: false,
    logLevel: 'error'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">Platform System Settings</h2>
        <p className="text-xs text-slate-400">Configure global registration features and central administration behaviors.</p>
      </div>

      <AdminSettingsPanel settings={settings} setSettings={setSettings} />
    </div>
  );
};

export default AdminSettings;
