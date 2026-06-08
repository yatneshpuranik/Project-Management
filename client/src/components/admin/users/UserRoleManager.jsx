import { useState, useEffect } from 'react';

const UserRoleManager = ({ selectedUser, onUpdateRole }) => {
  const [newRoleVal, setNewRoleVal] = useState(selectedUser?.role || 'USER');

  useEffect(() => {
    if (selectedUser) {
      setNewRoleVal(selectedUser.role);
    }
  }, [selectedUser]);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] uppercase font-bold text-slate-500">Alter User Role</label>
      <div className="flex gap-2">
        <select
          value={newRoleVal}
          onChange={(e) => setNewRoleVal(e.target.value)}
          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] outline-none text-white focus:border-blue-500"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button
          onClick={() => onUpdateRole(selectedUser._id, newRoleVal)}
          className="px-3 bg-blue-500 hover:bg-blue-400 text-slate-955 font-bold text-[10px] rounded-xl transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default UserRoleManager;
