import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setUser } from '../redux/userSlice.js'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight, HiOutlineViewBoards } from 'react-icons/hi'

const LoginScreen = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (isRegister && (!name.trim() || !email.trim() || !password.trim())) {
      setError('All fields are required for registration.')
      setLoading(false)
      return
    }

    if (!isRegister && (!email.trim() || !password.trim())) {
      setError('Email/Username and password are required.')
      setLoading(false)
      return
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    const endpoint = isRegister ? '/api/user/register' : '/api/user/login'
    const payload = isRegister ? { name, email, password } : { email, password }

    try {
      const result = await axios.post(
        `${serverUrl}${endpoint}`,
        payload,
        { withCredentials: true }
      )

      if (isRegister) {
        setSuccess('Registration successful! Logging you in...')
        // Auto-login after registration
        setTimeout(() => {
          localStorage.setItem('token', result.data.token)
          localStorage.setItem('userId', result.data.user._id)
          localStorage.setItem('userName', result.data.user.name)
          localStorage.setItem('userEmail', result.data.user.email)
          dispatch(setUser(result.data.user))
          navigate('/boards')
        }, 1200)
      } else {
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('userId', result.data.user._id)
        localStorage.setItem('userName', result.data.user.name)
        localStorage.setItem('userEmail', result.data.user.email)
        dispatch(setUser(result.data.user))
        navigate('/boards')
      }
    } catch (err) {
      console.error('Auth request failed:', err)
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-950 px-4 py-16 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl shadow-slate-950/50">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <HiOutlineViewBoards className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isRegister 
              ? 'Join our workspace to collaborate on tasks in real-time.' 
              : 'Sign in to access your collaborative boards.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {isRegister && (
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <HiOutlineUser className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
              />
            </div>
          )}

          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <HiOutlineMail className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder={isRegister ? 'Email Address' : 'Email or Username'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <HiOutlineLockClosed className="h-5 w-5" />
            </span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
            {!loading && <HiOutlineArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isRegister ? 'Already have an account?' : 'New to our platform?'}
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
              setSuccess(null)
            }}
            className="ml-2 font-semibold text-sky-400 hover:text-sky-300 focus:outline-none"
          >
            {isRegister ? 'Sign In' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen;
