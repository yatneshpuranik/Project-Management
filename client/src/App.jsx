import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '../redux/userSlice.js'
import axiosInstance from '../utils/axiosInstance'
import socket, { connectSocket, disconnectSocket } from '../utils/socket'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ProfileScreen from '../page/ProfileScreen.jsx'
import LoginScreen from '../page/LoginScreen.jsx'
import VerifyEmailScreen from '../page/VerifyEmailScreen.jsx'
import AllUser from '../page/AllUser.jsx'
import Home from '../page/Home.jsx'
import BoardsScreen from '../page/BoardsScreen.jsx'
import TaskDetails from '../page/TaskDetails.jsx'
import Navbar from '../components/Navbar.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Toast from '../components/Toast.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import AnalyticsScreen from '../page/AnalyticsScreen.jsx'
import SettingsScreen from '../page/SettingsScreen.jsx'

// Modular Admin Imports
import AdminLayout from './components/admin/layout/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminWorkspaces from './pages/admin/AdminWorkspaces.jsx'
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx'
import AdminSecurity from './pages/admin/AdminSecurity.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import AdminAccessControl from './pages/admin/AdminAccessControl.jsx'
import AdminTasks from './pages/admin/AdminTasks.jsx'

import Sidebar from '../components/Sidebar.jsx'
import AdminSidebar from './components/admin/layout/AdminSidebar.jsx'
import AdminNavbar from './components/admin/layout/AdminNavbar.jsx'
import Footer from '../components/Footer.jsx'

const ProfileScreenWrapper = ({ isSidebarOpen, closeSidebar }) => {
  const { user } = useSelector((state) => state.user)
  if (user?.role === 'ADMIN') {
    return (
      <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
        <AdminNavbar />
        <div className="flex-1 flex overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 bg-slate-950/40 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <ProfileScreen />
          </main>
        </div>
      </div>
    )
  } else {
    return (
      <div className="flex flex-1 w-full overflow-hidden relative">
        {isSidebarOpen && (
          <div 
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          />
        )}
        <aside className="fixed top-[73px] bottom-0 left-0 z-40 w-72 border-r border-white/6 bg-slate-950/45 backdrop-blur-xl p-4 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-[calc(100vh-73px)]">
          <Sidebar onLinkClick={closeSidebar} />
        </aside>
        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-950/40 h-[calc(100vh-73px)]">
          <div className="flex-1 w-full p-4 md:p-6 lg:p-8">
            <ProfileScreen />
          </div>
          <Footer />
        </main>
      </div>
    )
  }
}

const App = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.user)
  const [authChecked, setAuthChecked] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setAuthChecked(true)
        return
      }

      try {
        const result = await axiosInstance.get('/user/me')
        localStorage.setItem('userRole', result.data.user.role || 'USER')
        localStorage.setItem('userId', result.data.user._id)
        localStorage.setItem('userName', result.data.user.name)
        localStorage.setItem('userEmail', result.data.user.email)
        dispatch(setUser(result.data.user))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userId')
        localStorage.removeItem('userName')
        localStorage.removeItem('userEmail')
        dispatch(setUser(null))
      } finally {
        setAuthChecked(true)
      }
    }

    initializeAuth()
  }, [dispatch])

  useEffect(() => {
    const handleBlocked = (data) => {
      alert(`Your account has been blocked. Reason: ${data?.reason || 'No reason specified'}`)
      localStorage.clear()
      dispatch(setUser(null))
      window.location.href = '/login'
    }

    socket.on('blocked', handleBlocked)
    return () => {
      socket.off('blocked', handleBlocked)
    }
  }, [dispatch])

  useEffect(() => {
    if (user) {
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [user])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {!isAdminPath && location.pathname !== '/profile' && <Navbar toggleSidebar={toggleSidebar} />}
      {authChecked ? (
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={user ? (user.role === 'ADMIN' ? <Navigate to='/admin' replace /> : <Navigate to='/boards' replace />) : <LoginScreen />} />
          <Route path='/verify-email' element={<VerifyEmailScreen />} />
          
          {/* Protected Area Layout */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <DashboardLayout isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
              </ProtectedRoute>
            }
          >
            <Route path='/boards' element={<BoardsScreen />} />
            <Route path='/boards/:boardId/tasks/:taskId' element={<BoardsScreen />} />
            <Route path='/boards/:boardId' element={<BoardsScreen />} />
            <Route path='/all-users' element={<AllUser />} />
            <Route path='/analytics' element={<AnalyticsScreen />} />
            <Route path='/settings' element={<SettingsScreen />} />
          </Route>

          {/* Shared Profile Page Route */}
          <Route
            path='/profile'
            element={
              <ProtectedRoute allowedRoles={['USER', 'ADMIN']}>
                <ProfileScreenWrapper isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
              </ProtectedRoute>
            }
          />
 
          {/* Admin Protected Area */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path='/admin' element={<AdminDashboard />} />
            <Route path='/admin/users' element={<AdminUsers />} />
            <Route path='/admin/workspaces' element={<AdminWorkspaces />} />
            <Route path='/admin/tasks' element={<AdminTasks />} />
            <Route path='/admin/analytics' element={<AdminAnalytics />} />
            <Route path='/admin/security' element={<AdminSecurity view="security" />} />
            <Route path='/admin/role-management' element={<AdminSecurity view="roles" />} />
            <Route path='/admin/system-health' element={<AdminSecurity view="health" />} />
            <Route path='/admin/access-control' element={<AdminAccessControl />} />
            <Route path='/admin/settings' element={<AdminSettings />} />
          </Route>

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      ) : (
        <div className="min-h-screen flex items-center justify-center">Loading…</div>
      )}
      <Toast />
    </div>
  )
}

export default App
