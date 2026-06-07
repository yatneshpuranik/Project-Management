import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '../redux/userSlice.js'
import axiosInstance from '../utils/axiosInstance'
import { connectSocket, disconnectSocket } from '../utils/socket'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProfileScreen from '../page/ProfileScreen.jsx'
import LoginScreen from '../page/LoginScreen.jsx'
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

const App = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.user)
  const [authChecked, setAuthChecked] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
        dispatch(setUser(result.data.user))
      } catch {
        localStorage.removeItem('token')
        dispatch(setUser(null))
      } finally {
        setAuthChecked(true)
      }
    }

    initializeAuth()
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
      <Navbar toggleSidebar={toggleSidebar} />
      {authChecked ? (
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={user ? <Navigate to='/boards' replace /> : <LoginScreen />} />
          
          {/* Protected Area Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
              </ProtectedRoute>
            }
          >
            <Route path='/boards' element={<BoardsScreen />} />
            <Route path='/boards/:boardId/tasks/:taskId' element={<BoardsScreen />} />
            <Route path='/boards/:boardId' element={<BoardsScreen />} />
            <Route path='/profile' element={<ProfileScreen />} />
            <Route path='/all-users' element={<AllUser />} />
            <Route path='/analytics' element={<AnalyticsScreen />} />
            <Route path='/settings' element={<SettingsScreen />} />
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
