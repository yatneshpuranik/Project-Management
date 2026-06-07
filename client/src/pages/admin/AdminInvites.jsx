import { HiOutlineMailOpen } from 'react-icons/hi';

const AdminInvites = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">Platform Invitations</h2>
        <p className="text-xs text-slate-400">View and audit active workspace invitations across all workspace groups.</p>
      </div>

      <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs italic">
        <HiOutlineMailOpen className="h-8 w-8 mx-auto mb-2 text-slate-600" />
        No active pending workspace invitations currently registered. Invitation lifecycle is managed directly from the Workspace Directory.
      </div>
    </div>
  );
};

export default AdminInvites;
