import { HiOutlineChevronRight } from 'react-icons/hi';

const UsersTable = ({ users = [], selectedUser, onSelectUser, filter }) => {
  return (
    <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      {users.length > 0 ? (
        users.map((user) => (
          <div
            key={user._id}
            onClick={() => onSelectUser(user)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
              selectedUser?._id === user._id
                ? 'bg-blue-500/10 border-blue-500/30 shadow-md'
                : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || '')}`}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover border border-white/10"
              />
              <div>
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  {user.name}
                  <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px] uppercase">{user.role}</span>
                  {user.isBlocked && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase">
                      Blocked
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-555 mt-0.5">{user.email}</p>
              </div>
            </div>
            <HiOutlineChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </div>
        ))
      ) : (
        <div className="text-center py-10 text-slate-500 text-xs italic">
          {filter === 'restricted' ? 'No restricted users found' : 'No registered users matched the filter.'}
        </div>
      )}
    </div>
  );
};

export default UsersTable;
