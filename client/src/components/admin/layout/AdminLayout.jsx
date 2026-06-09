import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import { motion } from 'framer-motion';


const AdminLayout = () => {
  const userRole = localStorage.getItem('userRole') || '';
  const location = useLocation();

  if (userRole !== 'ADMIN') {
    return <Navigate to="/boards" replace />;
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <AdminNavbar />
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 bg-slate-950/40 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
