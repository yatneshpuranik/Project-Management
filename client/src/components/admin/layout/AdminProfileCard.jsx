import { useNavigate } from 'react-router-dom';

const AdminProfileCard = () => {
  const navigate = useNavigate();
  const currentUserName = localStorage.getItem('userName') || 'Admin';
  const currentUserEmail = localStorage.getItem('userEmail') || 'admin@platform.com';

  return (
    <div
      onClick={() => navigate('/profile')}
      className="flex items-center gap-3 p-3 bg-slate-900/50 border border-white/5 rounded-2xl cursor-pointer hover:bg-slate-900 transition"
    >
      <img
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`}
        alt={currentUserName}
        className="h-10 w-10 rounded-full object-cover border border-white/10"
      />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-white truncate">{currentUserName}</h4>
        <p className="text-xs text-slate-500 truncate">{currentUserEmail}</p>
      </div>
    </div>
  );
};

export default AdminProfileCard;
