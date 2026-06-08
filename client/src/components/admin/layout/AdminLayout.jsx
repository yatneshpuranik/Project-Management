import { Navigate, Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';


const AdminLayout = () => {
  const userRole = localStorage.getItem('userRole') || '';

  if (userRole !== 'ADMIN') {
    return <Navigate to="/boards" replace />;
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <AdminNavbar />
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 bg-slate-950/40 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
