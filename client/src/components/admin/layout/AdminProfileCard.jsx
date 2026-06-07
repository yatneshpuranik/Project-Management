const AdminProfileCard = () => {
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@platform.com';

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-900/50 border border-white/5 rounded-2xl">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-sm">
        {currentUserName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-bold text-white truncate">{currentUserName}</h4>
        <p className="text-[10px] text-slate-500 truncate">{currentUserEmail}</p>
      </div>
    </div>
  );
};

export default AdminProfileCard;
