import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  fetchBoards,
  fetchBoardById,
  createBoard,
  setCurrentBoard,
  addBoardMember,
  removeBoardMember,
  deleteBoard
} from '../redux/boardSlice.js'
import { fetchTasksByBoard } from '../redux/taskSlice.js'
import Board from '../components/Board.jsx'
import ActivityPanel from '../components/ActivityPanel.jsx'
import TaskDetailsDrawer from '../components/TaskDetailsDrawer.jsx'
import CommentsModal from '../components/CommentsModal.jsx'
import ChatDrawer from '../components/ChatDrawer.jsx'
import axiosInstance from '../utils/axiosInstance'
import socket from '../utils/socket'
import { toast } from '../utils/toast'
import {
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineUserAdd,
  HiOutlineFolder,
  HiOutlineTemplate,
  HiOutlineSparkles,
  HiOutlineChatAlt,
  HiOutlineChevronRight,
  HiOutlineLogout,
  HiOutlineUserCircle
} from 'react-icons/hi'

// Custom inline SVG icons for Voice / Media controls
const MuteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l2.25 2.25V8.25z" />
  </svg>
)

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
)

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
)

const ScreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
)

const DisconnectIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12m0 0l2.25 2.25M16.5 12l2.25-2.25M16.5 12l-2.25 2.25M6.5 18c-2.209 0-4-1.791-4-4s1.791-4 4-4a4 4 0 014 4c0 2.209-1.791 4-4 4zm0 0H21m-4.5-8.25L14.25 12m0 0l-2.25-2.25m2.25 2.25L12 14.25" />
  </svg>
)

import {
  pageVariants,
  staggerContainer,
  fadeInUp,
  hoverLift
} from '../utils/motion.js'
import {
  HiOutlineCalendar,
  HiOutlineMenuAlt4,
  HiOutlineViewGrid,
  HiOutlineBadgeCheck,
  HiOutlineClipboardList
} from 'react-icons/hi'

const CountUp = ({ to }) => {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const end = parseInt(to, 10) || 0
    if (start === end) {
      setVal(end)
      return
    }
    const duration = 650
    const steps = Math.min(end, 25)
    const stepTime = Math.floor(duration / steps) || 20
    const increment = Math.ceil(end / steps) || 1
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setVal(end)
        clearInterval(timer)
      } else {
        setVal(start)
      }
    }, stepTime)
    return () => clearInterval(timer)
  }, [to])
  return <span>{val}</span>
}

const BoardsScreen = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { boardId, taskId } = useParams()
  const [searchParams] = useSearchParams()
  const commentsTaskId = searchParams.get('comments')
  const { boards, currentBoard } = useSelector((state) => state.boards)
  const { tasks, onlineUsers } = useSelector((state) => state.tasks)

  const currentUserId = localStorage.getItem('userId')
  const currentUserName = localStorage.getItem('userName') || 'You'

  // Tabs navigation state
  const [activeTab, setActiveTab] = useState('dashboard')

  // Global Landing dashboard states
  const [globalTasks, setGlobalTasks] = useState([])
  const [globalActivities, setGlobalActivities] = useState([])
  const [globalLoading, setGlobalLoading] = useState(false)

  // Active workspace View modes
  const [viewMode, setViewMode] = useState('board') // 'board', 'list', 'calendar'

  // Activities logs state
  const [activities, setActivities] = useState([])

  // Invite member states
  const [inviteSearch, setInviteSearch] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Ownership transfer state
  const [transferSearch, setTransferSearch] = useState('')
  const [transferSearchResults, setTransferSearchResults] = useState([])
  const [selectedTransferUser, setSelectedTransferUser] = useState(null)

  // Create Workspace Dialog States
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [metricModalType, setMetricModalType] = useState(null)

  // Search/Discovery Workspaces State
  const [discoveryQuery, setDiscoveryQuery] = useState('')
  const [discoveryResults, setDiscoveryResults] = useState([])
  const [isSearchingWorkspaces, setIsSearchingWorkspaces] = useState(false)
  const [discoveryFilter, setDiscoveryFilter] = useState('')

  // Inline Chat/Voice states
  const [activeChatChannel, setActiveChatChannel] = useState('general')
  const [unreadCounts, setUnreadCounts] = useState({})

  // Realtime Voice Call States
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null)
  const [voiceChannelUsers, setVoiceChannelUsers] = useState({})
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // Channels lists definitions
  const textChannels = currentBoard?.channels || ['general', 'development', 'testing', 'announcements']
  const voiceChannels = ['general-voice', 'development-voice', 'meeting-voice']

  useEffect(() => {
    dispatch(fetchBoards())
  }, [dispatch])

  useEffect(() => {
    if (!boardId && boards.length > 0) {
      setGlobalLoading(true)
      const fetchGlobalData = async () => {
        try {
          const taskPromises = boards.map(b => axiosInstance.get(`/tasks/board/${b._id}`))
          const activityPromises = boards.map(b => axiosInstance.get(`/activity/board/${b._id}`))

          const [taskResponses, activityResponses] = await Promise.all([
            Promise.all(taskPromises),
            Promise.all(activityPromises)
          ])

          const allTasks = taskResponses.flatMap(res => res.data.tasks || [])
          const allActivities = activityResponses.flatMap(res => res.data.activities || [])

          allActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

          setGlobalTasks(allTasks)
          setGlobalActivities(allActivities.slice(0, 15))
        } catch (err) {
          console.error('Error fetching global dashboard data:', err)
        } finally {
          setGlobalLoading(false)
        }
      }
      fetchGlobalData()
    }
  }, [boardId, boards])

  useEffect(() => {
    if (boardId) {
      dispatch(fetchBoardById(boardId))
      dispatch(fetchTasksByBoard(boardId))
      // Reset voice state on switching board
      setActiveVoiceChannel(null)
      setVoiceChannelUsers({})
      setUnreadCounts({})
    }
  }, [boardId, dispatch])

  // Load activities for the board
  const loadActivities = async () => {
    if (!boardId) return
    try {
      const res = await axiosInstance.get(`/activity/board/${boardId}`)
      setActivities(res.data.activities || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (boardId && activeTab === 'dashboard') {
      loadActivities()
    }
  }, [boardId, activeTab])

  // Global search for workspaces
  useEffect(() => {
    if (boardId) return;
    const delayDebounce = setTimeout(() => {
      searchGlobalWorkspaces(discoveryQuery, discoveryFilter);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [discoveryQuery, discoveryFilter, boardId]);

  // Search users for invite
  useEffect(() => {
    if (!inviteSearch.trim() || !boardId) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(inviteSearch)}&boardId=${boardId}`)
        setSearchResults(response.data.users || [])
      } catch (err) {
        console.error('User search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [inviteSearch, boardId])

  // Search users for transfer ownership
  useEffect(() => {
    if (!transferSearch.trim()) {
      setTransferSearchResults([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(transferSearch)}`)
        setTransferSearchResults(response.data.users || [])
      } catch (err) {
        console.error('Transfer search error:', err)
      }
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [transferSearch])

  // Real-time Sockets Integration
  useEffect(() => {
    if (!boardId) return

    // Socket joins board chatroom
    socket.emit('workspaceChatJoined', { boardId })

    const handleActivityCreated = (data) => {
      if (data.activity) {
        setActivities((prev) => {
          if (prev.some(act => act._id === data.activity._id)) return prev
          return [data.activity, ...prev]
        })
      }
    }

    const handleMessageSent = (data) => {
      if (data.message && data.message.boardId === boardId) {
        const msg = data.message
        if (msg.channel.toLowerCase() !== activeChatChannel.toLowerCase() || activeTab !== 'chat') {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.channel.toLowerCase()]: (prev[msg.channel.toLowerCase()] || 0) + 1
          }))
        }
      }
    }

    const handleMemberEviction = (data) => {
      if (data.boardId === boardId) {
        if (data.memberId === currentUserId) {
          toast.info('You have been removed from this board by the owner.')
          navigate('/boards', { replace: true })
        } else {
          dispatch(fetchBoardById(boardId))
        }
      }
    }

    const handleMemberAddition = (data) => {
      if (data.boardId === boardId) {
        dispatch(fetchBoardById(boardId))
      }
    }

    // Voice socket listeners
    const onUserJoinedVoice = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName
        const users = prev[ch] || {}
        return {
          ...prev,
          [ch]: {
            ...users,
            [data.userId]: {
              userName: data.userName,
              isMuted: false,
              isCameraOn: false,
              isScreenSharing: false,
              ...users[data.userId]
            }
          }
        }
      })
    }

    const onUserLeftVoice = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName
        const users = { ...(prev[ch] || {}) }
        delete users[data.userId]
        return {
          ...prev,
          [ch]: users
        }
      })
    }

    const onVoiceStateUpdated = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName
        const users = prev[ch] || {}
        return {
          ...prev,
          [ch]: {
            ...users,
            [data.userId]: {
              userName: data.userName,
              isMuted: data.isMuted,
              isCameraOn: data.isCameraOn,
              isScreenSharing: data.isScreenSharing
            }
          }
        }
      })
    }

    socket.on('activity-created', handleActivityCreated)
    socket.on('workspaceMessageSent', handleMessageSent)
    socket.on('memberRemoved', handleMemberEviction)
    socket.on('memberAdded', handleMemberAddition)
    socket.on('userJoinedVoice', onUserJoinedVoice)
    socket.on('userLeftVoice', onUserLeftVoice)
    socket.on('voiceStateUpdated', onVoiceStateUpdated)

    return () => {
      socket.emit('workspaceChatLeft', { boardId })
      socket.off('activity-created', handleActivityCreated)
      socket.off('workspaceMessageSent', handleMessageSent)
      socket.off('memberRemoved', handleMemberEviction)
      socket.off('memberAdded', handleMemberAddition)
      socket.off('userJoinedVoice', onUserJoinedVoice)
      socket.off('userLeftVoice', onUserLeftVoice)
      socket.off('voiceStateUpdated', onVoiceStateUpdated)
    }
  }, [boardId, activeChatChannel, activeTab, currentUserId])

  // Evict member
  const handleEvictMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to evict this member?')) return
    try {
      await dispatch(removeBoardMember({ boardId, memberId })).unwrap()
      toast.success('Member evicted successfully.')
      dispatch(fetchBoardById(boardId))
    } catch (err) {
      toast.error(err || 'Failed to evict member.')
    }
  }

  // Leave Workspace
  const handleLeaveWorkspace = async () => {
    const isOwner = currentBoard && (currentBoard.createdBy?._id === currentUserId || currentBoard.createdBy === currentUserId)
    if (isOwner) {
      toast.error('Owner cannot leave workspace. Please transfer ownership or delete board.')
      return
    }
    if (!window.confirm('Are you sure you want to leave this workspace?')) return
    try {
      await axiosInstance.post(`/boards/${boardId}/leave`)
      toast.success('Successfully left the workspace.')
      navigate('/boards')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave workspace.')
    }
  }

  // Transfer Ownership
  const handleTransfer = async (e) => {
    e.preventDefault()
    if (!selectedTransferUser) return
    const newOwnerId = selectedTransferUser._id
    try {
      await axiosInstance.put(`/boards/${boardId}`, { createdBy: newOwnerId })
      toast.success('Ownership transferred successfully.')
      setSelectedTransferUser(null)
      dispatch(fetchBoardById(boardId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ownership.')
    }
  }

  // Delete board workspace
  const handleDeleteBoardWorkspace = async () => {
    if (!window.confirm('Delete workspace permanently? This will erase all cards.')) return
    try {
      await dispatch(deleteBoard(boardId)).unwrap()
      toast.success('Workspace deleted permanently.')
      navigate('/boards')
    } catch (err) {
      toast.error(err || 'Failed to delete workspace.')
    }
  }

  // Join Voice Channel
  const handleJoinVoice = (ch) => {
    if (!socket.connected) {
      toast.error('Voice requires socket connection.')
      return
    }
    if (activeVoiceChannel === ch) return

    if (activeVoiceChannel) {
      socket.emit('leaveVoiceChannel', { boardId, channelName: activeVoiceChannel })
    }

    socket.emit('joinVoiceChannel', { boardId, channelName: ch })
    setActiveVoiceChannel(ch)

    socket.emit('voiceStateUpdate', {
      boardId,
      channelName: ch,
      isMuted,
      isCameraOn,
      isScreenSharing
    })
    toast.success(`Connected to voice channel: #${ch.replace('-voice', '')}`)
  }

  // Leave Voice Channel
  const handleLeaveVoice = () => {
    if (!activeVoiceChannel) return
    socket.emit('leaveVoiceChannel', { boardId, channelName: activeVoiceChannel })
    setActiveVoiceChannel(null)
    setVoiceChannelUsers((prev) => {
      const next = { ...prev }
      delete next[activeVoiceChannel]
      return next
    })
    toast.info('Disconnected from voice channel.')
  }

  // Toggle Media States
  const handleToggleMute = () => {
    const nextVal = !isMuted
    setIsMuted(nextVal)
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted: nextVal,
        isCameraOn,
        isScreenSharing
      })
    }
  }

  const handleToggleCamera = () => {
    const nextVal = !isCameraOn
    setIsCameraOn(nextVal)
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted,
        isCameraOn: nextVal,
        isScreenSharing
      })
    }
  }

  const handleToggleScreenShare = () => {
    const nextVal = !isScreenSharing
    setIsScreenSharing(nextVal)
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted,
        isCameraOn,
        isScreenSharing: nextVal
      })
    }
  }

  // Invite user thunk
  const handleSendInvite = async (userId) => {
    try {
      await dispatch(addBoardMember({ boardId, memberId: userId })).unwrap()
      toast.success('Invitation sent successfully.')
      setInviteSearch('')
      setIsInviteOpen(false)
    } catch (err) {
      toast.error(err || 'Failed to send invite.')
    }
  }

  // Workspace creation
  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const resultAction = await dispatch(
        createBoard({ title: title.trim(), description: description.trim() })
      )
      if (createBoard.fulfilled.match(resultAction)) {
        setTitle('')
        setDescription('')
        setIsCreateModalOpen(false)
        navigate(`/boards/${resultAction.payload._id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  // Browse Workspaces
  const searchGlobalWorkspaces = async (query = '', filter = '') => {
    setIsSearchingWorkspaces(true)
    try {
      const response = await axiosInstance.get(`/workspaces/search`, {
        params: { q: query, filter }
      })
      setDiscoveryResults(response.data.workspaces || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearchingWorkspaces(false)
    }
  }

  const handleJoinWorkspace = async (targetBoardId) => {
    try {
      await axiosInstance.post(`/workspaces/${targetBoardId}/join`)
      toast.success('Joined workspace successfully!')
      dispatch(fetchBoards())
      searchGlobalWorkspaces(discoveryQuery, discoveryFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join workspace')
    }
  }

  const handleRequestAccess = async (targetBoardId) => {
    try {
      await axiosInstance.post(`/workspaces/${targetBoardId}/request-access`)
      toast.success('Access request sent successfully!')
      searchGlobalWorkspaces(discoveryQuery, discoveryFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request access')
    }
  }

  // De-duplicate Owner and Members lists
  const workspaceOwner = currentBoard?.createdBy
  const isOwner = currentBoard && (workspaceOwner?._id === currentUserId || workspaceOwner === currentUserId)

  const deDuplicatedMembers = useMemo(() => {
    if (!currentBoard) return []
    const members = currentBoard.members || []
    const ownerId = (workspaceOwner?._id || workspaceOwner || '').toString()
    const seen = new Set([ownerId])
    const list = []
    members.forEach((m) => {
      const mId = (m._id || m).toString()
      if (mId && !seen.has(mId) && m.role !== 'ADMIN') {
        seen.add(mId)
        list.push(m)
      }
    })
    return list
  }, [currentBoard, workspaceOwner])

  const calendarDays = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const days = []
    const temp = new Date(startDate)
    while (temp <= endDate) {
      days.push(new Date(temp))
      temp.setDate(temp.getDate() + 1)
    }
    return days
  }, [])

  const getTasksForDay = (day) => {
    return tasks.filter(t => {
      if (!t.dueDate) return false
      const dDate = new Date(t.dueDate)
      return dDate.getDate() === day.getDate() &&
        dDate.getMonth() === day.getMonth() &&
        dDate.getFullYear() === day.getFullYear()
    })
  }

  // 1. Dashboard Landing (If no board selected)
  if (!boardId) {
    const userEmail = localStorage.getItem('userEmail') || ''
    const assignedTasks = globalTasks.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo === currentUserId || t.assignedTo?.email === userEmail)
    const completedTasks = globalTasks.filter(t => t.status === 'Done')
    const pendingTasks = globalTasks.filter(t => t.status !== 'Done')

    return (
      <>
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-8 max-w-full"
        >
          {/* Dash Header */}
          <header className="rounded-[24px] border border-white/6 bg-slate-900/40 p-6 backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />
            <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Workspace Dashboard</p>
                <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight">WorkSync Dashboard</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Review available board workspaces, view team participation, and create new collaborative spaces.
                </p>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary self-start lg:self-auto bg-sky-500 hover:bg-violet-600 text-slate-955 hover:text-white flex items-center gap-1.5 transition shadow-lg hover:shadow-violet-500/25"
              >
                <HiOutlinePlus className="h-4 w-4" /> Create Board
              </button>
            </div>
          </header>

          {/* Global Statistics Cards */}
          {globalLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="premium-card animate-shimmer h-28 rounded-2xl border border-white/5 bg-slate-900/40" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { id: 'workspaces', label: 'Total Workspaces', value: boards.length, color: 'text-sky-400', icon: HiOutlineFolder, gradient: 'from-sky-500/10 to-transparent' },
                { id: 'tasks', label: 'Total Tasks', value: globalTasks.length, color: 'text-violet-400', icon: HiOutlineClipboardList, gradient: 'from-violet-500/10 to-transparent' },
                { id: 'assigned', label: 'Assigned to Me', value: assignedTasks.length, color: 'text-cyan-400', icon: HiOutlineUserCircle, gradient: 'from-cyan-500/10 to-transparent' },
                { id: 'completed', label: 'Completed Tasks', value: completedTasks.length, color: 'text-emerald-400', icon: HiOutlineBadgeCheck, gradient: 'from-emerald-500/10 to-transparent' },
                { id: 'pending', label: 'Pending Tasks', value: pendingTasks.length, color: 'text-amber-400', icon: HiOutlineClock, gradient: 'from-amber-500/10 to-transparent' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    onClick={() => setMetricModalType(stat.id)}
                    className="premium-card relative overflow-hidden rounded-2xl border border-white/6 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between cursor-pointer hover:border-sky-500/25 transition-colors duration-200"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-20 pointer-events-none`} />
                    <div className="flex items-center justify-between text-slate-400 z-10">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</span>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="mt-4 text-3xl font-extrabold text-white tracking-tight z-10">
                      {stat.value}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Dashboard Content */}
          <div className="space-y-8">
            {/* Workspaces list */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-450">All Workspaces</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {boards.map((board) => (
                  <motion.div
                    key={board._id}
                    variants={fadeInUp}
                    whileHover={{ y: -4, scale: 1.01, borderColor: 'rgba(56,189,248,0.25)' }}
                    onClick={() => navigate(`/boards/${board._id}`)}
                    className="premium-card premium-card-hover group relative flex flex-col justify-between cursor-pointer bg-slate-900/40 hover:bg-slate-900/60"
                  >
                    <div>
                      <div className="flex items-center justify-between text-slate-400 mb-3">
                        <div className="flex items-center gap-2">
                          <HiOutlineFolder className="h-5 w-5 text-sky-400" />
                          <span className="text-[10px] uppercase tracking-wider font-semibold">Workspace</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition truncate">{board.title}</h3>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">{board.description || 'No description provided.'}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {board.members?.slice(0, 3).map((member, idx) => (
                          <span
                            key={idx}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-700 text-white text-[9px] font-bold border border-slate-950"
                            title={member.name}
                          >
                            {member.name?.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {board.members?.length > 3 && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400 text-[8px] font-semibold border border-slate-955">
                            +{board.members.length - 3}
                          </span>
                        )}
                      </div>
                      <span>{board.members?.length || 0} participants</span>
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-transparent p-6 hover:border-sky-500/40 hover:bg-sky-500/5 cursor-pointer text-slate-400 hover:text-sky-450 transition duration-200 min-h-[160px]"
                >
                  <HiOutlinePlus className="h-6 w-6 mb-2 text-slate-450 group-hover:text-sky-400 transition" />
                  <span className="text-xs font-semibold text-slate-350">Add New Workspace</span>
                  <span className="text-[10px] text-slate-500 mt-1">Start tracking boards</span>
                </motion.div>
              </div>
            </section>

            {/* Discovery List */}
            <section className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-450">Discover Workspaces</h2>
                  <p className="text-[10.5px] text-slate-500">Search and join other public or private workspaces on WorkSync.</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <input
                    value={discoveryQuery}
                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        searchGlobalWorkspaces(discoveryQuery, discoveryFilter)
                      }
                    }}
                    placeholder="Search workspaces..."
                    className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 transition w-full sm:w-48"
                  />
                  <select
                    value={discoveryFilter}
                    onChange={(e) => setDiscoveryFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">All visibility</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <button
                    onClick={() => searchGlobalWorkspaces(discoveryQuery, discoveryFilter)}
                    className="btn-primary text-xs"
                  >
                    Search
                  </button>
                </div>
              </div>

              {isSearchingWorkspaces ? (
                <div className="text-center py-10 text-xs text-slate-505">Searching workspaces...</div>
              ) : discoveryResults.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 italic bg-slate-900/10 border border-dashed border-white/5 rounded-2xl">
                  No public workspaces found.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {discoveryResults.map((ws) => (
                    <div key={ws._id} className="premium-card flex flex-col justify-between p-4 bg-slate-900/30">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
                          <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">{ws.visibility}</span>
                          <span>{ws.membersCount || 0} members</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white truncate">{ws.title}</h3>
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 min-h-[32px]">{ws.description}</p>
                        <p className="text-[10px] text-sky-400 mt-2 font-semibold">Owner: {ws.createdBy?.name || 'Owner'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5">
                        {ws.joinStatus === 'member' ? (
                          <span className="text-xs text-emerald-400 font-bold">✓ Joined</span>
                        ) : ws.joinStatus === 'pending' ? (
                          <span className="text-xs text-amber-400 font-bold italic">⌛ Pending Approval</span>
                        ) : ws.visibility === 'public' ? (
                          <button
                            onClick={() => handleJoinWorkspace(ws._id)}
                            className="w-full btn-primary text-xs"
                          >
                            Join Workspace
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRequestAccess(ws._id)}
                            className="w-full btn-primary text-xs"
                          >
                            Request Access
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </motion.div>

        {/* Create Board Modal */}
        {isCreateModalOpen && (
          <div className="premium-modal-backdrop">
            <div className="premium-modal-container relative !animate-none !max-w-[580px] w-full h-auto">
              <h3 className="text-base font-semibold text-white mb-2">Create New Workspace</h3>
              <p className="text-[11px] text-slate-450 mb-4">Set up board details.</p>

              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Workspace name..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Summary..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="btn-primary"
                  >
                    {isCreating ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Metric Detail Modal */}
        {metricModalType && (
          <div className="premium-modal-backdrop" onClick={() => setMetricModalType(null)}>
            <div className="premium-modal-container relative max-w-lg w-full flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center pb-3 border-b border-white/10 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {metricModalType === 'workspaces' && 'Workspace Directory'}
                    {metricModalType === 'tasks' && 'All Tasks'}
                    {metricModalType === 'assigned' && 'Tasks Assigned to Me'}
                    {metricModalType === 'completed' && 'Completed Tasks'}
                    {metricModalType === 'pending' && 'Pending Tasks'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {metricModalType === 'workspaces' && `Total Workspaces: ${boards.length}`}
                    {metricModalType === 'tasks' && `Total Tasks: ${globalTasks.length}`}
                    {metricModalType === 'assigned' && `Assigned Tasks: ${globalTasks.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo === currentUserId || t.assignedTo?.email === localStorage.getItem('userEmail')).length}`}
                    {metricModalType === 'completed' && `Completed Tasks: ${globalTasks.filter(t => t.status === 'Done').length}`}
                    {metricModalType === 'pending' && `Pending Tasks: ${globalTasks.filter(t => t.status !== 'Done').length}`}
                  </p>
                </div>
                <button
                  onClick={() => setMetricModalType(null)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white transition hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 custom-scrollbar">
                {metricModalType === 'workspaces' && boards.map((b) => (
                  <div
                    key={b._id}
                    onClick={() => {
                      setMetricModalType(null);
                      navigate(`/boards/${b._id}`);
                    }}
                    className="p-3 bg-slate-900/40 border border-white/5 hover:border-white/15 rounded-xl flex justify-between items-center cursor-pointer transition hover:bg-slate-900/60"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[200px]">{b.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate max-w-[250px] mt-0.5">{b.description || 'No description'}</p>
                    </div>
                    <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-white/5 font-semibold text-slate-500">
                      {b.members?.length || 0} members
                    </span>
                  </div>
                ))}

                {metricModalType !== 'workspaces' && (() => {
                  const userEmail = localStorage.getItem('userEmail') || '';
                  const list = metricModalType === 'tasks'
                    ? globalTasks
                    : metricModalType === 'assigned'
                      ? globalTasks.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo === currentUserId || t.assignedTo?.email === userEmail)
                      : metricModalType === 'completed'
                        ? globalTasks.filter(t => t.status === 'Done')
                        : globalTasks.filter(t => t.status !== 'Done');

                  if (list.length === 0) {
                    return <p className="text-xs text-slate-500 italic text-center py-6">No tasks found.</p>;
                  }

                  return list.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => {
                        setMetricModalType(null);
                        navigate(`/boards/${t.boardId?._id || t.boardId}/tasks/${t._id}`);
                      }}
                      className="p-3 bg-slate-900/40 border border-white/5 hover:border-white/15 rounded-xl flex justify-between items-center cursor-pointer transition hover:bg-slate-900/60"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="text-xs font-bold text-white truncate">{t.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-505 font-medium">
                            Board: <span className="text-sky-400">{t.boardId?.title || 'Active Board'}</span>
                          </span>
                          {t.dueDate && (
                            <span className="text-[9px] text-slate-505 font-medium">
                              Due: <span className="text-slate-450">{new Date(t.dueDate).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded ${t.priority === 'High' ? 'bg-rose-500/10 text-rose-400' :
                            t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-slate-800 text-slate-400'
                          }`}>
                          {t.priority}
                        </span>
                        <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded ${t.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400' :
                            t.status === 'Review' ? 'bg-amber-500/10 text-amber-400' :
                              t.status === 'In Progress' ? 'bg-sky-500/10 text-sky-400' :
                                'bg-slate-800 text-slate-400'
                          }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-[calc(100vh-121px)] overflow-hidden">
      {/* Board Header Bar */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md flex flex-col md:flex-row gap-4 md:items-center md:justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 text-slate-400">
            <HiOutlineTemplate className="h-4 w-4 text-sky-400" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Active Space</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white truncate">{currentBoard?.title || 'Loading Board...'}</h2>
          {currentBoard?.description && (
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{currentBoard.description}</p>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950/60 p-1 border border-white/10 rounded-xl">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'directory', label: 'Directory' },
            { id: 'chat', label: 'Chat' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === tab.id
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tabs Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="h-full min-h-0 flex overflow-hidden gap-4">
            <div className="flex-1 min-w-0">
              <Board boardId={boardId} />
            </div>
            <div className="w-64 border-l border-white/10 flex-shrink-0 hidden lg:block">
              <ActivityPanel activities={activities} onlineUsers={onlineUsers} />
            </div>
          </div>
        )}

        {/* Tab 2: Directory */}
        {activeTab === 'directory' && (
          <div className="h-full grid gap-6 md:grid-cols-3 overflow-y-auto p-1 custom-scrollbar">
            {/* Members Directory */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workspace Directory</h3>

                {/* Invite Dropdown Trigger */}
                {(isOwner || currentBoard?.userPermissions?.canInvite) && (
                  <div className="relative">
                    <button
                      onClick={() => setIsInviteOpen(!isInviteOpen)}
                      title="Invite Member"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      <HiOutlineUserAdd className="h-4 w-4" /> Invite Member
                    </button>

                    {/* Discord Style invite dropdown */}
                    {isInviteOpen && (
                      <div className="absolute right-0 mt-2 z-40 w-85 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 space-y-3.5">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Invite teammate</h4>
                          <button onClick={() => setIsInviteOpen(false)} className="text-slate-500 hover:text-slate-200 transition">✕</button>
                        </div>
                        <input
                          value={inviteSearch}
                          onChange={(e) => setInviteSearch(e.target.value)}
                          placeholder="Search by name, username or email..."
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500 transition duration-200"
                        />
                        <div className="max-h-52 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                          {isSearching ? (
                            <div className="text-center py-6 text-xs text-slate-500">Searching...</div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                              <div key={user._id} className="flex justify-between items-center p-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs gap-3 hover:bg-white/5 transition">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                                    alt={user.name}
                                    className="h-7 w-7 rounded-full flex-shrink-0 border border-white/10"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-200 truncate">{user.name}</span>
                                      <span className="bg-slate-800 text-[8px] px-1.5 py-0.5 rounded uppercase font-semibold text-slate-400">{user.role || 'USER'}</span>
                                    </div>
                                    <p className="text-slate-500 text-[10px] truncate">{user.email}</p>
                                  </div>
                                </div>
                                {user.inviteStatus === 'pending' ? (
                                  <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-xl font-semibold text-[10px]">Pending</span>
                                ) : (
                                  <button
                                    onClick={() => handleSendInvite(user._id)}
                                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition text-[10px] cursor-pointer"
                                  >
                                    Invite
                                  </button>
                                )}
                              </div>
                            ))
                          ) : inviteSearch.trim() ? (
                            <div className="text-center py-6 text-xs text-slate-500">No users found.</div>
                          ) : (
                            <div className="text-center py-6 text-[11px] text-slate-500">Type name or email to search.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OWNER SECTION */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-widest">OWNER</span>
                {workspaceOwner ? (
                  <div className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-3">
                    <img
                      src={workspaceOwner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(workspaceOwner.name || '')}`}
                      alt={workspaceOwner.name}
                      className="h-9 w-9 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <p className="font-bold text-white text-xs">{workspaceOwner.name || 'Workspace Owner'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{workspaceOwner.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No workspace owner resolved.</p>
                )}
              </div>

              {/* MEMBERS SECTION */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest">MEMBERS ({deDuplicatedMembers.length})</span>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                  {deDuplicatedMembers.length > 0 ? (
                    deDuplicatedMembers.map((member) => (
                      <div key={member._id} className="p-3 bg-slate-900/30 border border-white/5 rounded-2xl flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name || '')}`}
                            alt={member.name}
                            className="h-8 w-8 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <p className="font-semibold text-white text-xs">{member.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{member.email}</p>
                          </div>
                        </div>

                        {/* Eviction Button */}
                        {(isOwner || currentBoard?.userPermissions?.canRemoveMember) && (
                          <button
                            onClick={() => handleEvictMember(member._id)}
                            className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white transition rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            Evict
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-600 italic">
                      No other team members have joined this workspace yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Leave / Workspace ownership administration */}
            <div className="bg-slate-900/20 border border-white/10 rounded-2xl p-5 space-y-5 h-max">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Workspace Admin</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Manage your workspace access and permissions.</p>
              </div>
              <div className="space-y-4 pt-2 border-t border-white/5">
                {/* Ownership Transfer */}
                {(isOwner || currentBoard?.userPermissions?.canTransferOwnership) && (
                  <form onSubmit={handleTransfer} className="space-y-3 pt-2">
                    <label className="block text-[9px] uppercase font-bold text-slate-400">Transfer Ownership</label>

                    {!selectedTransferUser ? (
                      <div className="relative">
                        <input
                          value={transferSearch}
                          onChange={(e) => setTransferSearch(e.target.value)}
                          placeholder="Search member by name or email..."
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 outline-none focus:border-cyan-500"
                        />
                        {transferSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 z-50 max-h-40 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 space-y-1 custom-scrollbar">
                            {transferSearchResults.map((u) => (
                              <div
                                key={u._id}
                                onClick={() => {
                                  setSelectedTransferUser(u)
                                  setTransferSearch('')
                                  setTransferSearchResults([])
                                }}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                                    alt={u.name}
                                    className="h-6 w-6 rounded-full flex-shrink-0 border border-white/10"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-200 truncate">{u.name}</span>
                                      <span className="bg-slate-800 text-[8px] px-1 text-slate-400 rounded uppercase font-semibold">{u.role || 'USER'}</span>
                                    </div>
                                    <p className="text-slate-500 text-[9px] truncate">{u.email}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded">Select</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={selectedTransferUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedTransferUser.name)}`}
                            alt={selectedTransferUser.name}
                            className="h-8 w-8 rounded-full flex-shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate">{selectedTransferUser.name}</span>
                              <span className="bg-slate-800 text-[8px] px-1 text-slate-400 rounded uppercase font-semibold">{selectedTransferUser.role || 'USER'}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{selectedTransferUser.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTransferUser(null)}
                          className="text-slate-400 hover:text-white text-[10px] font-semibold border border-white/10 hover:border-white/20 rounded-lg px-2 py-1 transition cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedTransferUser}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Confirm Ownership Transfer
                    </button>
                  </form>
                )}

                {/* Permanent delete workspace */}
                {(isOwner || currentBoard?.userPermissions?.canDeleteWorkspace) && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="block text-[9px] uppercase font-bold text-rose-400">Caution Zone</span>
                    <button
                      onClick={handleDeleteBoardWorkspace}
                      className="w-full py-2 bg-rose-500/20 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Delete Board Workspace
                    </button>
                  </div>
                )}

                {!isOwner && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <p className="text-[10px] text-slate-500">You are a Workspace Member. You can choose to leave this workspace. This removes your card assignments.</p>
                    <button
                      onClick={handleLeaveWorkspace}
                      className="w-full py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Leave Workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Chat */}
        {activeTab === 'chat' && (
          <div className="h-full flex overflow-hidden bg-slate-900/10 border border-white/10 rounded-2xl">
            {/* Left channels sidebar */}
            <div className="w-56 bg-slate-950 border-r border-white/10 p-3 flex flex-col flex-shrink-0 justify-between">
              <div className="space-y-4">
                {/* Text Channels */}
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2 pl-2">Text Channels</h4>
                  <div className="space-y-0.5 overflow-y-auto max-h-40 pr-1 custom-scrollbar">
                    {textChannels.map((ch) => {
                      const lowerCh = ch.toLowerCase()
                      const unread = unreadCounts[lowerCh] || 0
                      return (
                        <button
                          key={ch}
                          onClick={() => {
                            setActiveChatChannel(lowerCh)
                            setUnreadCounts((prev) => ({ ...prev, [lowerCh]: 0 }))
                            axiosInstance.post(`/boards/${boardId}/chat/read`, { channel: lowerCh }).catch(console.error)
                          }}
                          className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold text-left transition ${activeChatChannel?.toLowerCase() === lowerCh
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-inner'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                            }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>#</span>
                            <span className="truncate max-w-[120px]">{lowerCh}</span>
                          </span>
                          {unread > 0 && (
                            <span className="bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{unread}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Voice Channels */}
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2 pl-2">Voice Channels</h4>
                  <div className="space-y-1">
                    {voiceChannels.map((ch) => {
                      const usersInCh = Object.entries(voiceChannelUsers[ch] || {})
                      const isCallActive = activeVoiceChannel === ch
                      return (
                        <div key={ch} className="space-y-0.5">
                          <button
                            onClick={() => handleJoinVoice(ch)}
                            className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold text-left transition ${isCallActive
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/25'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                              }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>🔊</span>
                              <span className="truncate max-w-[120px]">{ch.replace('-voice', '')}</span>
                            </span>
                            {isCallActive && (
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                          </button>

                          {/* Users in call */}
                          {usersInCh.length > 0 && (
                            <div className="pl-5 space-y-1 ml-1.5 border-l border-white/5 py-0.5">
                              {usersInCh.map(([uid, uState]) => (
                                <div key={uid} className="flex justify-between items-center text-[10.5px] text-slate-400 py-0.2">
                                  <span className="truncate max-w-[100px]">{uState.userName}</span>
                                  <div className="flex gap-1 items-center flex-shrink-0">
                                    {uState.isMuted && <span title="Muted" className="text-[9px]">🔇</span>}
                                    {uState.isCameraOn && <span title="Camera On" className="text-[9px]">📷</span>}
                                    {uState.isScreenSharing && <span title="Screen Sharing" className="text-[9px]">🖥️</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Persistent Voice Controls inside sidebar */}
              {activeVoiceChannel && (
                <div className="pt-2 border-t border-white/5 space-y-2 bg-slate-950/60 p-2 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Voice Active
                    </p>
                    <p className="text-[10px] font-bold text-white truncate mt-0.5">#{activeVoiceChannel.replace('-voice', '')}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={handleToggleMute}
                      className={`p-1.5 rounded bg-slate-900 border border-white/5 hover:border-slate-800 text-xs flex items-center justify-center ${isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'
                        }`}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                      {isMuted ? <MuteIcon /> : <MicIcon />}
                    </button>
                    <button
                      onClick={handleToggleCamera}
                      className={`p-1.5 rounded bg-slate-900 border border-white/5 hover:border-slate-800 text-xs flex items-center justify-center ${isCameraOn ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300'
                        }`}
                      title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
                    >
                      <CameraIcon />
                    </button>
                    <button
                      onClick={handleToggleScreenShare}
                      className={`p-1.5 rounded bg-slate-900 border border-white/5 hover:border-slate-800 text-xs flex items-center justify-center ${isScreenSharing ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300'
                        }`}
                      title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                    >
                      <ScreenIcon />
                    </button>
                    <button
                      onClick={handleLeaveVoice}
                      className="p-1.5 rounded bg-rose-600 border border-rose-500/20 text-white text-xs flex items-center justify-center hover:bg-rose-700"
                      title="Disconnect Call"
                    >
                      <DisconnectIcon />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inline chat content pane */}
            <div className="flex-1 min-w-0 h-full relative">
              {activeChatChannel ? (
                <ChatDrawer
                  boardId={boardId}
                  channel={activeChatChannel}
                  currentBoard={currentBoard}
                  isInline={true}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  Select a text channel on the left to display conversation history.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Task Details drawer */}
      <TaskDetailsDrawer
        taskId={taskId}
        boardId={boardId}
        isOpen={Boolean(taskId)}
        onClose={() => navigate(`/boards/${boardId}`)}
      />

      {commentsTaskId && (
        <CommentsModal
          taskId={commentsTaskId}
          boardId={boardId}
          onClose={() => navigate(`/boards/${boardId}`)}
        />
      )}
    </div>
  )
}

export default BoardsScreen
