import { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChatAlt, HiOutlineUserCircle, HiOutlinePencil, HiOutlineTrash, HiOutlinePaperAirplane } from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import socket from '../utils/socket';
import { toast } from '../utils/toast';

const WorkspaceSidePanel = ({ boardId, currentBoard }) => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'activity'
  const [currentChannel, setCurrentChannel] = useState('General');
  const [messages, setMessages] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Chat message & input states
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  
  // Realtime Presence States
  const [onlineMemberIds, setOnlineMemberIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, userName }
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Collapsible sections state
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [membersCollapsed, setMembersCollapsed] = useState(false);

  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'You';

  const boardOwner = useMemo(() => {
    if (!currentBoard) return null;
    return currentBoard.createdBy;
  }, [currentBoard]);

  // All workspace members
  const allWorkspaceMembers = useMemo(() => {
    if (!currentBoard) return [];
    const members = currentBoard.members || [];
    const owner = currentBoard.createdBy;
    const all = [owner, ...members].filter(Boolean);
    
    // De-duplicate
    const seen = new Set();
    const unique = [];
    all.forEach(u => {
      const uId = u._id || u;
      if (uId && !seen.has(uId)) {
        seen.add(uId);
        unique.push(u);
      }
    });
    return unique;
  }, [currentBoard]);

  // Partition Online & Offline members
  const memberPresenceLists = useMemo(() => {
    const online = [];
    const offline = [];
    
    allWorkspaceMembers.forEach(member => {
      const mId = member._id || member;
      if (onlineMemberIds.has(mId) || mId === currentUserId) {
        online.push(member);
      } else {
        offline.push(member);
      }
    });

    return { online, offline };
  }, [allWorkspaceMembers, onlineMemberIds, currentUserId]);

  const fetchMessages = async (channel) => {
    if (!boardId) return;
    setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/boards/${boardId}/chat`, {
        params: { channel },
      });
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load workspace chat messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchActivities = async () => {
    if (!boardId) return;
    setLoadingActivities(true);
    try {
      const response = await axiosInstance.get(`/activity/board/${boardId}`);
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Failed to load board activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Mark all messages as read in database
  const markMessagesAsRead = async () => {
    if (!boardId) return;
    try {
      await axiosInstance.post(`/boards/${boardId}/chat/read`, { channel: currentChannel });
    } catch (e) {
      // Ignore
    }
  };

  const sendTypingEvent = (isTyping) => {
    if (!boardId) return;
    if (!socket.connected) return;

    if (isTyping) {
      socket.emit('workspaceTypingStarted', { boardId, channel: currentChannel });
    } else {
      socket.emit('workspaceTypingStopped', { boardId, channel: currentChannel });
    }
  };

  const scheduleTypingStop = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      sendTypingEvent(false);
    }, 1200);
  };

  const handleInputChange = (value) => {
    setNewMessage(value);
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      sendTypingEvent(true);
    }
    scheduleTypingStop();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !boardId) return;
    setIsSending(true);

    if (socket.connected) {
      socket.emit('workspaceMessageSent', {
        boardId,
        channel: currentChannel,
        content: newMessage.trim(),
      });
      setNewMessage('');
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        sendTypingEvent(false);
      }
      setIsSending(false);
    } else {
      // Fallback to REST API
      axiosInstance.post(`/boards/${boardId}/chat`, {
        channel: currentChannel,
        content: newMessage.trim(),
      }).then(() => {
        setNewMessage('');
        setIsSending(false);
      }).catch((e) => {
        console.error(e);
        setIsSending(false);
      });
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = (messageId) => {
    if (!editingContent.trim() || !boardId) return;
    
    if (socket.connected) {
      socket.emit('workspaceMessageEdited', {
        boardId,
        messageId,
        content: editingContent.trim(),
      });
      setEditingMessageId(null);
    } else {
      axiosInstance.put(`/boards/${boardId}/chat/${messageId}`, {
        content: editingContent.trim()
      }).then(() => {
        setEditingMessageId(null);
      }).catch(err => console.error(err));
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (!window.confirm('Delete this message permanently?')) return;

    if (socket.connected) {
      socket.emit('workspaceMessageDeleted', {
        boardId,
        messageId,
      });
    } else {
      axiosInstance.delete(`/boards/${boardId}/chat/${messageId}`)
        .catch(err => console.error(err));
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!boardId) return;
    fetchMessages(currentChannel);
    fetchActivities();
    markMessagesAsRead();
  }, [boardId, currentChannel]);

  // Socket Connection Join & Listeners
  useEffect(() => {
    if (!boardId) return;

    // Join Workspace Chat Room
    socket.emit('workspaceChatJoined', { boardId });

    const onMessageSent = (data) => {
      if (data.boardId !== boardId) return;
      if (data.message?.channel !== currentChannel) return;
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      markMessagesAsRead();
    };

    const onMessageEdited = (data) => {
      if (data.boardId !== boardId) return;
      setMessages((prev) =>
        prev.map((msg) => (msg._id === data.message._id ? data.message : msg))
      );
    };

    const onMessageDeleted = (data) => {
      if (data.boardId !== boardId) return;
      setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
    };

    const onTypingStarted = (data) => {
      if (data.boardId !== boardId) return;
      if (data.userId === currentUserId) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });
    };

    const onTypingStopped = (data) => {
      if (data.boardId !== boardId) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    const onUserOnline = (data) => {
      if (data.boardId !== boardId) return;
      setOnlineMemberIds((prev) => {
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    };

    const onUserOffline = (data) => {
      if (data.boardId !== boardId) return;
      setOnlineMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const onOnlineMembers = (data) => {
      if (data.boardId !== boardId) return;
      setOnlineMemberIds(new Set(data.users?.map((u) => u.userId) || []));
    };

    const onActivityCreated = (data) => {
      if (data?.activity?.boardId !== boardId) return;
      setActivities((prev) => [data.activity, ...prev]);
    };

    socket.on('workspaceMessageSent', onMessageSent);
    socket.on('workspaceMessageEdited', onMessageEdited);
    socket.on('workspaceMessageDeleted', onMessageDeleted);
    socket.on('workspaceTypingStarted', onTypingStarted);
    socket.on('workspaceTypingStopped', onTypingStopped);
    socket.on('workspaceUserOnline', onUserOnline);
    socket.on('workspaceUserOffline', onUserOffline);
    socket.on('workspaceOnlineMembers', onOnlineMembers);
    socket.on('activity-created', onActivityCreated);

    return () => {
      socket.emit('workspaceChatLeft', { boardId });
      socket.off('workspaceMessageSent', onMessageSent);
      socket.off('workspaceMessageEdited', onMessageEdited);
      socket.off('workspaceMessageDeleted', onMessageDeleted);
      socket.off('workspaceTypingStarted', onTypingStarted);
      socket.off('workspaceTypingStopped', onTypingStopped);
      socket.off('workspaceUserOnline', onUserOnline);
      socket.off('workspaceUserOffline', onUserOffline);
      socket.off('workspaceOnlineMembers', onOnlineMembers);
      socket.off('activity-created', onActivityCreated);
    };
  }, [boardId, currentChannel, currentUserId]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
    return 'Multiple users are typing...';
  }, [typingUsers]);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      
      {/* Workspace Header */}
      <div className="border-b border-white/10 p-4 bg-slate-900/60 flex-shrink-0">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-semibold">WORKSPACE PANEL</p>
        <h3 className="text-sm font-bold text-white mt-1 truncate">{currentBoard?.title || 'Workspace'}</h3>
        <p className="text-[10px] text-sky-400 mt-1 font-semibold">Owner: {boardOwner?.name || 'Unknown'}</p>
      </div>

      {/* Top Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/60 p-2.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
            activeTab === 'chat' ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:bg-slate-900'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
            activeTab === 'activity' ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:bg-slate-900'
          }`}
        >
          Workspace Log
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <div className="flex h-full flex-col overflow-hidden">
            
            {/* discord sidebar: Channels and Members */}
            <div className="border-b border-white/10 bg-slate-900/40 p-3 flex-shrink-0 space-y-3">
              
              {/* CHANNELS SECTION */}
              <div>
                <button
                  onClick={() => setChannelsCollapsed(!channelsCollapsed)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 w-full text-left"
                >
                  {channelsCollapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}
                  <span>Channels</span>
                </button>
                {!channelsCollapsed && (
                  <div className="mt-2 pl-3">
                    <button
                      onClick={() => setCurrentChannel('General')}
                      className={`flex items-center gap-1.5 py-1 text-xs font-semibold w-full text-left transition ${
                        currentChannel === 'General' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>#</span>
                      <span>general</span>
                    </button>
                  </div>
                )}
              </div>

              {/* MEMBERS SECTION */}
              <div>
                <button
                  onClick={() => setMembersCollapsed(!membersCollapsed)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 w-full text-left"
                >
                  {membersCollapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}
                  <span>Members</span>
                </button>
                {!membersCollapsed && (
                  <div className="mt-2 pl-3 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    
                    {/* Online list */}
                    {memberPresenceLists.online.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Online ({memberPresenceLists.online.length})</span>
                        {memberPresenceLists.online.map((member) => (
                          <div key={member._id} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                            <span className="truncate">{member.name}</span>
                            {(boardOwner?._id === member._id || boardOwner === member._id) && (
                              <span className="text-[8px] bg-sky-500/10 border border-sky-500/20 px-1 rounded text-sky-400 font-bold">Owner</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Offline list */}
                    {memberPresenceLists.offline.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                        <span className="text-[9px] uppercase font-bold text-slate-600 block">Offline ({memberPresenceLists.offline.length})</span>
                        {memberPresenceLists.offline.map((member) => (
                          <div key={member._id} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                            <span className="truncate">{member.name}</span>
                            {(boardOwner?._id === member._id || boardOwner === member._id) && (
                              <span className="text-[8px] bg-slate-800 border border-slate-700 px-1 rounded text-slate-500">Owner</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>

            {/* MESSAGES SECTION */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-0">
              <div className="text-center py-4 border-b border-white/5 mb-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
                  <HiOutlineChatAlt className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Welcome to #general!</h4>
                <p className="text-[10px] text-slate-500 mt-1">This is the start of the workspace chat history.</p>
              </div>

              {loadingMessages ? (
                <div className="text-center py-10 text-xs text-slate-400">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 italic">No messages sent yet.</div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === currentUserId || message.senderId?._id === currentUserId;
                  const isEditing = editingMessageId === message._id;
                  
                  return (
                    <div 
                      key={message._id} 
                      className="group flex gap-3 rounded-2xl border border-white/5 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/60 p-3.5 transition text-xs relative"
                    >
                      <div className="flex-shrink-0">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white font-bold border border-slate-950">
                          {message.senderName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-1.5 pr-8 min-w-0">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-bold text-slate-300">{message.senderName}</span>
                          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            <input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(message._id);
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(message._id)}
                                className="px-2.5 py-1 bg-sky-500 text-slate-950 rounded font-bold text-[10px]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-200 leading-relaxed break-words">{message.content}</p>
                        )}

                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          {message.editedAt && <span>edited</span>}
                          {message.readBy?.length > 0 && (
                            <span>Read by {message.readBy.length}</span>
                          )}
                        </div>
                      </div>

                      {/* Edit / Delete Hover Actions */}
                      {isOwn && !isEditing && (
                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1.5 bg-slate-950 border border-white/10 rounded-lg p-1">
                          <button
                            onClick={() => handleStartEdit(message)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                            title="Edit"
                          >
                            <HiOutlinePencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded"
                            title="Delete"
                          >
                            <HiOutlineTrash className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* MESSAGE INPUT */}
            <div className="border-t border-white/10 bg-slate-900/60 p-3.5 flex-shrink-0">
              {typingLabel && <p className="text-[10px] text-slate-500 italic mb-2 pl-1 animate-pulse">{typingLabel}</p>}
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message #${currentChannel.toLowerCase()}`}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center"
                >
                  <HiOutlinePaperAirplane className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Workspace Activity Log</h4>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act._id} className="text-xs border border-white/5 bg-slate-900/30 p-3 rounded-xl">
                    <p className="text-slate-300">{act.message}</p>
                    <span className="text-[9px] text-slate-500 block mt-1.5 font-semibold">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-6">No activities recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default WorkspaceSidePanel;
