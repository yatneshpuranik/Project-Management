import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../redux/taskSlice';
import axiosInstance from '../utils/axiosInstance';
import socket from '../utils/socket';
import {
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineChatAlt,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import { toast } from '../utils/toast';

const EditTaskModal = ({ isOpen, onClose, task, boardId }) => {
  const dispatch = useDispatch();
  const currentBoard = useSelector((state) => state.boards.currentBoard);
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName');
  
  const isOwner =
    currentBoard &&
    (currentBoard.createdBy?._id === currentUserId || currentBoard.createdBy === currentUserId);
  const members = currentBoard?.members || [];

  // Form states
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'Low');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [status, setStatus] = useState(task.status || 'Todo');
  const [progress, setProgress] = useState(task.progress || 0);
  const [assignedTo, setAssignedTo] = useState(
    task.assignedTo?._id || task.assignedTo || ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [taskOnlineUsers, setTaskOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: userName }
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load chat history and join room
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      try {
        const response = await axiosInstance.get(`/tasks/${task._id}/messages`);
        setMessages(response.data.messages || []);
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };
    fetchMessages();

    // Join task chat room
    socket.emit('taskChatJoined', {
      taskId: task._id,
      userId: currentUserId,
      userName: currentUserName,
      boardId,
      taskTitle: task.title,
    });

    // Listeners
    const handleActiveUsers = (data) => {
      if (data.taskId === task._id) {
        setTaskOnlineUsers(data.users || []);
      }
    };

    const handleMessageSent = (data) => {
      if (data.taskId === task._id) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleMessageEdited = (data) => {
      if (data.taskId === task._id) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.message._id ? data.message : msg))
        );
      }
    };

    const handleMessageDeleted = (data) => {
      if (data.taskId === task._id) {
        setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
      }
    };

    const handleTypingStart = (data) => {
      if (data.taskId === task._id && data.userId !== currentUserId) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.userName,
        }));
      }
    };

    const handleTypingStop = (data) => {
      if (data.taskId === task._id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    socket.on('activeUsersUpdated', handleActiveUsers);
    socket.on('chatMessageSent', handleMessageSent);
    socket.on('chatMessageEdited', handleMessageEdited);
    socket.on('chatMessageDeleted', handleMessageDeleted);
    socket.on('typingStarted', handleTypingStart);
    socket.on('typingStopped', handleTypingStop);

    return () => {
      socket.emit('taskChatLeft', {
        taskId: task._id,
        userId: currentUserId,
        boardId,
      });

      socket.off('activeUsersUpdated', handleActiveUsers);
      socket.off('chatMessageSent', handleMessageSent);
      socket.off('chatMessageEdited', handleMessageEdited);
      socket.off('chatMessageDeleted', handleMessageDeleted);
      socket.off('typingStarted', handleTypingStart);
      socket.off('typingStopped', handleTypingStop);
    };
  }, [isOpen, task._id, boardId, currentUserId, currentUserName, task.title]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle typing input
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);

    // Emit typing started
    socket.emit('typingStarted', {
      boardId,
      taskId: task._id,
      userId: currentUserId,
      userName: currentUserName,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typingStopped', {
        boardId,
        taskId: task._id,
        userId: currentUserId,
        userName: currentUserName,
      });
    }, 1500);
  };

  // Submit new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axiosInstance.post(`/tasks/${task._id}/messages`, {
        message: newMessage.trim(),
        boardId,
      });
      setNewMessage('');
      socket.emit('typingStopped', {
        boardId,
        taskId: task._id,
        userId: currentUserId,
        userName: currentUserName,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Message send failed');
    }
  };

  // Submit task updates
  const handleSubmitUpdates = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    setIsUpdating(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        status,
        progress: parseInt(progress, 10),
      };

      if (isOwner) {
        data.assignedTo = assignedTo || undefined;
      }

      const resultAction = await dispatch(updateTask({ taskId: task._id, data }));
      if (updateTask.fulfilled.match(resultAction)) {
        socket.emit('task-updated', {
          boardId,
          task: resultAction.payload,
        });
        toast.success('Task updated successfully');
        onClose();
      }
    } catch (err) {
      console.error('Update task failed:', err);
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axiosInstance.delete(`/tasks/${task._id}/messages/${messageId}`);
    } catch (err) {
      console.error('Delete message failed:', err);
      toast.error('Failed to delete message');
    }
  };

  // Edit message save
  const handleSaveEditMessage = async (messageId) => {
    if (!editingMessageText.trim()) return;
    try {
      await axiosInstance.put(`/tasks/${task._id}/messages/${messageId}`, {
        message: editingMessageText.trim(),
        boardId,
      });
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (err) {
      console.error('Edit message failed:', err);
      toast.error('Failed to edit message');
    }
  };

  const getAssignedName = () => {
    const aUser = members.find((m) => m._id === assignedTo);
    return aUser ? aUser.name : 'Unassigned';
  };

  if (!isOpen) return null;

  const typingList = Object.values(typingUsers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[85vh] rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900 flex-shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-400 font-semibold">Card Details</p>
            <h3 className="mt-1 text-lg font-bold text-white truncate max-w-md">Edit Task & Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content - Split layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Left Panel: Task Detail Form */}
          <form
            onSubmit={handleSubmitUpdates}
            className="w-full lg:w-1/2 p-6 overflow-y-auto space-y-5 border-r border-white/10 border-b lg:border-b-0"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Task Title *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/60"
                  required
                />
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Board Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </label>
            </div>

            <label className="block text-xs">
              <span className="text-slate-300 font-medium mb-1.5 block">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/60 resize-none"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                />
              </label>

              <label className="block text-xs">
                <span className="text-slate-300 font-medium mb-1.5 block">Assignee</span>
                {isOwner ? (
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-300 italic font-semibold">
                    {getAssignedName()}
                  </div>
                )}
              </label>
            </div>

            {/* Progress Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Task Completion Progress</span>
                <span className="text-sky-400">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="25"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-bold px-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
              >
                <HiOutlineCheck className="h-4 w-4" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Right Panel: Collaborative Group Chat */}
          <div className="w-full lg:w-1/2 flex flex-col h-full bg-slate-950/40">
            {/* Chat header */}
            <div className="px-4 py-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between text-xs flex-shrink-0">
              <div className="flex items-center gap-1.5 text-slate-300">
                <HiOutlineChatAlt className="h-4.5 w-4.5 text-sky-400" />
                <span className="font-bold">Task Group Chat</span>
              </div>

              {/* Online task users */}
              <div className="flex items-center gap-1 bg-slate-950/80 rounded-lg px-2 py-1 border border-white/5" title="Users viewing this task">
                <HiOutlineUserGroup className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-medium">
                  {taskOnlineUsers.length} online
                </span>
              </div>
            </div>

            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isSelf = msg.senderId?._id === currentUserId || msg.senderId === currentUserId;
                  const isEditing = editingMessageId === msg._id;
                  const senderName = msg.senderId?.name || 'Collaborator';

                  return (
                    <div
                      key={msg._id}
                      className={`flex gap-3 max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <span
                        className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 text-white text-[10px] font-bold border border-slate-950"
                        title={senderName}
                      >
                        {senderName.charAt(0).toUpperCase()}
                      </span>

                      {/* Bubble */}
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2 justify-between">
                          <span className="text-[9px] font-semibold text-slate-400">{senderName}</span>
                          <span className="text-[8px] text-slate-500 font-medium">
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`group relative rounded-xl px-3 py-2 border ${
                          isSelf
                            ? 'bg-sky-500/10 border-sky-500/20 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900 border-white/5 text-slate-300 rounded-tl-none'
                        }`}>
                          {isEditing ? (
                            <div className="space-y-1.5 py-1">
                              <input
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                className="w-full rounded bg-slate-950 border border-white/10 px-2 py-1 text-[11px] text-white outline-none focus:border-sky-500"
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEditMessage(msg._id)}
                                  className="text-[9px] px-2 py-0.5 rounded bg-sky-500 text-white font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs leading-normal whitespace-pre-wrap">{msg.message}</p>
                              {/* Message actions (edit/delete) */}
                              {isSelf && (
                                <div className="hidden group-hover:flex absolute right-1 -top-6 bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 gap-1.5 shadow-md">
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg._id);
                                      setEditingMessageText(msg.message);
                                    }}
                                    className="text-slate-400 hover:text-sky-400 transition"
                                    title="Edit Message"
                                  >
                                    <HiOutlinePencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    className="text-slate-400 hover:text-rose-400 transition"
                                    title="Delete Message"
                                  >
                                    <HiOutlineTrash className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                  <HiOutlineChatAlt className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No chat messages yet.</p>
                  <p className="text-[10px] opacity-60">Send a message to start collaboration!</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Typing Indicator Bar */}
            {typingList.length > 0 && (
              <div className="px-4 py-1.5 text-[10px] text-sky-400 italic font-semibold flex-shrink-0 animate-pulse bg-slate-900/20 border-t border-white/5">
                {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Chat inputs */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-white/10 bg-slate-900/40 flex-shrink-0"
            >
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Collaborate in real-time..."
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/60"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-40 transition"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default EditTaskModal;
