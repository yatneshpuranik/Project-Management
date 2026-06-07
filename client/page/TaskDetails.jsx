import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { HiOutlineArrowLeft, HiOutlineChatAlt, HiOutlineClock, HiOutlineCheckCircle, HiOutlineUser, HiOutlinePencil, HiOutlineTrash, HiOutlineClipboardList } from 'react-icons/hi'
import axiosInstance from '../utils/axiosInstance.js'
import socket from '../utils/socket.js'
import { deleteTask, updateTask } from '../redux/taskSlice.js'

const priorityOptions = ['Low', 'Medium', 'High']
const statusOptions = ['Todo', 'In Progress', 'Review', 'Done']

const formatDateForInput = (date) => {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

const TaskDetails = () => {
  const { boardId, taskId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state) => state.user.user)
  const currentUserId = user?._id || localStorage.getItem('userId')

  const [task, setTask] = useState(null)
  const [board, setBoard] = useState(null)
  const [comments, setComments] = useState([])
  const [activity, setActivity] = useState([])
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    priority: 'Low',
    dueDate: '',
    status: 'Todo',
    progress: 0,
    assignedTo: '',
  })
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const isBoardOwner = useMemo(
    () => Boolean(board?.createdBy?._id === currentUserId),
    [board, currentUserId]
  )

  const assignableUsers = useMemo(() => {
    if (!board) return []
    const members = board.members || []
    const all = [board.createdBy, ...members].filter(Boolean)
    const unique = []
    const seen = new Set()
    all.forEach((userItem) => {
      if (!userItem || seen.has(userItem._id)) return
      seen.add(userItem._id)
      unique.push(userItem)
    })
    return unique
  }, [board])

  const loadTaskDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const [taskRes, boardRes, commentsRes, activityRes] = await Promise.all([
        axiosInstance.get(`/tasks/${taskId}`),
        axiosInstance.get(`/boards/${boardId}`),
        axiosInstance.get(`/tasks/${taskId}/comments`),
        axiosInstance.get(`/activity/board/${boardId}`),
      ])

      const taskData = taskRes.data.task
      const boardData = boardRes.data.board
      const commentList = commentsRes.data.comments || []
      const activityList = (activityRes.data.activities || []).filter(
        (item) => item.taskId === taskId
      )

      setTask(taskData)
      setBoard(boardData)
      setComments(commentList)
      setActivity(activityList)
      setFormState({
        title: taskData.title || '',
        description: taskData.description || '',
        priority: taskData.priority || 'Low',
        dueDate: formatDateForInput(taskData.dueDate),
        status: taskData.status || 'Todo',
        progress: taskData.progress ?? 0,
        assignedTo: taskData.assignedTo?._id || '',
      })
    } catch (err) {
      console.error('Failed to load task details', err)
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load task details right now.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTaskDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, taskId])

  useEffect(() => {
    if (!boardId) return

    const joinBoardRoom = () => {
      socket.emit('join-board', { boardId })
    }

    if (socket.connected) {
      joinBoardRoom()
    } else {
      socket.once('connect', joinBoardRoom)
    }

    return () => {
      socket.off('connect', joinBoardRoom)
      if (socket.connected) {
        socket.emit('leave-board', { boardId })
      }
    }
  }, [boardId])

  useEffect(() => {
    const handleCommentAdded = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment?._id)) return prev;
          return [...prev, data.comment];
        });
      }
    }

    const handleActivityCreated = (data) => {
      if (data.activity?.taskId === taskId) {
        setActivity((prev) => [data.activity, ...prev])
      }
    }

    socket.on('comment-added', handleCommentAdded)
    socket.on('commentAdded', handleCommentAdded)
    socket.on('activity-created', handleActivityCreated)

    return () => {
      socket.off('comment-added', handleCommentAdded)
      socket.off('commentAdded', handleCommentAdded)
      socket.off('activity-created', handleActivityCreated)
    }
  }, [taskId])

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveTask = async () => {
    if (!task) return
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const updatedData = {
        status: formState.status,
        progress: Number(formState.progress),
      }

      if (isBoardOwner) {
        updatedData.title = formState.title
        updatedData.description = formState.description
        updatedData.priority = formState.priority
        updatedData.dueDate = formState.dueDate || undefined
        updatedData.assignedTo = formState.assignedTo || undefined
      }

      const updatedTask = await dispatch(
        updateTask({ taskId, data: updatedData })
      ).unwrap()

      setTask(updatedTask)
      setMessage('Task updated successfully')
      socket.emit('task-updated', { boardId, task: updatedTask })
    } catch (err) {
      console.error('Save task failed', err)
      setError(
        err?.payload || err.response?.data?.message || 'Unable to update task.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task || !window.confirm('Delete this task permanently?')) return
    setDeleting(true)
    setError(null)

    try {
      await dispatch(deleteTask(taskId)).unwrap()
      socket.emit('task-deleted', { boardId, taskId })
      navigate(`/boards/${boardId}`)
    } catch (err) {
      console.error('Task deletion failed', err)
      setError(
        err?.payload || err.response?.data?.message || 'Unable to delete task.'
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setError(null)
    try {
      const response = await axiosInstance.post(`/tasks/${taskId}/comments`, {
        text: commentText.trim(),
      })
      setComments((prev) => {
        if (prev.some((c) => c._id === response.data.comment?._id)) return prev;
        return [...prev, response.data.comment];
      });
      setCommentText('')
    } catch (err) {
      console.error('Add comment failed', err)
      setError(
        err.response?.data?.message || err.message || 'Unable to add comment.'
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center text-slate-300">
        Loading task details…
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex flex-col items-center justify-center gap-4 px-4 text-slate-200">
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm">{error}</p>
        <button
          onClick={() => navigate(`/boards/${boardId}`)}
          className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Back to board
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 pb-12 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(`/boards/${boardId}`)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-700 hover:bg-slate-900"
        >
          <HiOutlineArrowLeft className="h-4 w-4" /> Back to board
        </button>

        <div className="space-y-1 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-400">Task details</p>
          <h1 className="text-2xl font-semibold text-white">{task.title}</h1>
          <p className="text-sm text-slate-400">{task.description || 'No description provided.'}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && task && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Task overview</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Status & assignment</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {task.status}
                </span>
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {task.priority}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned</div>
                <div className="mt-3 flex items-center gap-3 text-sm text-white">
                  <HiOutlineUser className="h-5 w-5 text-sky-400" />
                  <span>{task.assignedTo?.name || 'Unassigned'}</span>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Due date</div>
                <div className="mt-3 flex items-center gap-3 text-sm text-white">
                  <HiOutlineClock className="h-5 w-5 text-amber-400" />
                  <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <HiOutlineClipboardList className="h-5 w-5 text-sky-400" />
              <h2 className="font-semibold text-white">Activity timeline</h2>
            </div>
            <div className="mt-6 space-y-4">
              {activity.length === 0 ? (
                <div className="rounded-3xl bg-slate-950/50 p-4 text-sm text-slate-500">No activity available yet.</div>
              ) : (
                activity.map((item) => (
                  <div key={item._id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-sm text-slate-200">{item.message}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <span>{item.type}</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit task</h2>
                <p className="mt-1 text-sm text-slate-400">Update progress, status, or change task details.</p>
              </div>
              <div className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                {isBoardOwner ? 'Board owner' : 'Team member'}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Title</span>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  disabled={!isBoardOwner}
                  className={`w-full rounded-3xl border px-4 py-3 text-sm text-white outline-none transition ${isBoardOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500' : 'border-white/10 bg-slate-900/40 text-slate-400 cursor-not-allowed'}`}
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Description</span>
                <textarea
                  rows={4}
                  value={formState.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  disabled={!isBoardOwner}
                  className={`w-full rounded-3xl border px-4 py-3 text-sm text-white outline-none transition ${isBoardOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500' : 'border-white/10 bg-slate-900/40 text-slate-400 cursor-not-allowed'}`}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
                  <select
                    value={formState.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    {statusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>{statusOption}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Progress</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formState.progress}
                    onChange={(e) => handleFieldChange('progress', e.target.value)}
                    className="w-full"
                  />
                  <div className="mt-2 text-sm text-slate-300">{formState.progress}% complete</div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Priority</span>
                  <select
                    value={formState.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    disabled={!isBoardOwner}
                    className={`w-full rounded-3xl border px-4 py-3 text-sm outline-none transition ${isBoardOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500 text-white' : 'border-white/10 bg-slate-900/40 text-slate-400 cursor-not-allowed'}`}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Due date</span>
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                    disabled={!isBoardOwner}
                    className={`w-full rounded-3xl border px-4 py-3 text-sm outline-none transition ${isBoardOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500 text-white' : 'border-white/10 bg-slate-900/40 text-slate-400 cursor-not-allowed'}`}
                  />
                </label>
              </div>

              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Assigned to</span>
                <select
                  value={formState.assignedTo}
                  onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                  disabled={!isBoardOwner}
                  className={`w-full rounded-3xl border px-4 py-3 text-sm outline-none transition ${isBoardOwner ? 'border-white/10 bg-slate-950/80 focus:border-sky-500 text-white' : 'border-white/10 bg-slate-900/40 text-slate-400 cursor-not-allowed'}`}
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map((member) => (
                    <option key={member._id} value={member._id}>{member.name}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handleSaveTask}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {isBoardOwner && (
                  <button
                    onClick={handleDeleteTask}
                    disabled={deleting}
                    className="inline-flex items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting…' : 'Delete task'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <HiOutlineChatAlt className="h-5 w-5 text-sky-400" />
              <h2 className="font-semibold text-white">Comments</h2>
            </div>

            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <div className="rounded-3xl bg-slate-950/50 p-4 text-sm text-slate-500">Be the first to comment on this task.</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                      <span>{comment.userName || comment.user?.name || 'Member'}</span>
                      <span className="text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-3 text-slate-200">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-3">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Add a comment</span>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share progress, blockers, or feedback..."
                  className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </label>
              <button
                onClick={handleAddComment}
                className="inline-flex items-center justify-center rounded-3xl bg-slate-100/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-100/10"
              >
                Post comment
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TaskDetails
