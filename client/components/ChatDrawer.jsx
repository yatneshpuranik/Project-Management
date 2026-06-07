import { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineChatAlt, HiOutlinePencil, HiOutlineTrash, HiOutlinePaperAirplane, HiOutlineX } from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import socket from '../utils/socket';
import { toast } from '../utils/toast';

const ChatDrawer = ({ boardId, channel, currentBoard, onClose, isInline = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null);

  // Mention Dropdown State
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentions, setMentions] = useState([]);

  // Realtime Presence & Typing States
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, userName }
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'You';

  const boardOwner = useMemo(() => {
    if (!currentBoard) return null;
    return currentBoard.createdBy;
  }, [currentBoard]);

  const isCurrentBoardOwner = useMemo(() => {
    if (!boardOwner) return false;
    const ownerId = (boardOwner._id || boardOwner).toString();
    return ownerId === currentUserId;
  }, [boardOwner, currentUserId]);

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

  const fetchMessages = async (ch) => {
    if (!boardId) return;
    setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/boards/${boardId}/chat`, {
        params: { channel: ch },
      });
      setMessages(response.data.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load workspace chat messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!boardId) return;
    try {
      await axiosInstance.post(`/boards/${boardId}/chat/read`, { channel });
    } catch (e) {
      // Ignore
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (boardId && channel) {
      fetchMessages(channel);
      markMessagesAsRead();
    }
  }, [boardId, channel]);

  // Socket Connection Join & Listeners
  useEffect(() => {
    if (!boardId || !channel) return;

    socket.emit('workspaceChatJoined', { boardId });

    const onMessageSent = (data) => {
      if (data.boardId !== boardId) return;
      if (data.message?.channel?.toLowerCase() !== channel.toLowerCase()) return;
      setMessages((prev) => {
        if (prev.some(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      scrollToBottom();
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
      if (data.channel?.toLowerCase() !== channel.toLowerCase()) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });
    };

    const onTypingStopped = (data) => {
      if (data.boardId !== boardId) return;
      if (data.channel?.toLowerCase() !== channel.toLowerCase()) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    const onReactionAdded = (data) => {
      if (data.boardId !== boardId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === data.messageId) {
            const reactions = msg.reactions || [];
            if (reactions.some(r => r.userId === data.reaction.userId && r.emoji === data.reaction.emoji)) {
              return msg;
            }
            return { ...msg, reactions: [...reactions, data.reaction] };
          }
          return msg;
        })
      );
    };

    const onReactionRemoved = (data) => {
      if (data.boardId !== boardId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === data.messageId) {
            const reactions = msg.reactions || [];
            return {
              ...msg,
              reactions: reactions.filter(r => !(r.userId === data.userId && r.emoji === data.emoji))
            };
          }
          return msg;
        })
      );
    };

    socket.on('workspaceMessageSent', onMessageSent);
    socket.on('workspaceMessageEdited', onMessageEdited);
    socket.on('workspaceMessageDeleted', onMessageDeleted);
    socket.on('workspaceTypingStarted', onTypingStarted);
    socket.on('workspaceTypingStopped', onTypingStopped);
    socket.on('workspaceReactionAdded', onReactionAdded);
    socket.on('workspaceReactionRemoved', onReactionRemoved);

    return () => {
      socket.emit('workspaceChatLeft', { boardId });
      socket.off('workspaceMessageSent', onMessageSent);
      socket.off('workspaceMessageEdited', onMessageEdited);
      socket.off('workspaceMessageDeleted', onMessageDeleted);
      socket.off('workspaceTypingStarted', onTypingStarted);
      socket.off('workspaceTypingStopped', onTypingStopped);
      socket.off('workspaceReactionAdded', onReactionAdded);
      socket.off('workspaceReactionRemoved', onReactionRemoved);
    };
  }, [boardId, channel, currentUserId]);

  const sendTypingEvent = (isTyping) => {
    if (!boardId || !socket.connected) return;
    if (isTyping) {
      socket.emit('workspaceTypingStarted', { boardId, channel });
    } else {
      socket.emit('workspaceTypingStopped', { boardId, channel });
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

    // Check for mention trigger
    const words = value.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1);
      setMentionSearchQuery(query);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }

    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      sendTypingEvent(true);
    }
    scheduleTypingStop();
  };

  const handleSelectMention = (member) => {
    const words = newMessage.split(' ');
    words[words.length - 1] = `@${member.name} `;
    const updatedMessage = words.join(' ');
    setNewMessage(updatedMessage);

    const memberId = member._id || member;
    if (!mentions.includes(memberId)) {
      setMentions([...mentions, memberId]);
    }
    setShowMentionDropdown(false);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !boardId) return;
    setIsSending(true);

    const messageData = {
      boardId,
      channel,
      content: newMessage.trim(),
    };

    if (replyToMessage) {
      messageData.replyTo = replyToMessage._id;
    }

    if (mentions.length > 0) {
      messageData.mentions = mentions;
    }

    if (socket.connected) {
      socket.emit('workspaceMessageSent', messageData);
      setNewMessage('');
      setReplyToMessage(null);
      setMentions([]);
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        sendTypingEvent(false);
      }
      setIsSending(false);
      scrollToBottom();
    } else {
      axiosInstance.post(`/boards/${boardId}/chat`, messageData).then(() => {
        setNewMessage('');
        setReplyToMessage(null);
        setMentions([]);
        setIsSending(false);
        fetchMessages(channel);
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
        fetchMessages(channel);
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
        .then(() => fetchMessages(channel))
        .catch(err => console.error(err));
    }
  };

  const handleToggleReaction = (messageId, emoji, hasReacted) => {
    if (!socket.connected) {
      toast.error('Reactions require an active socket connection.');
      return;
    }
    if (hasReacted) {
      socket.emit('workspaceReactionRemoved', { boardId, messageId, emoji });
    } else {
      socket.emit('workspaceReactionAdded', { boardId, messageId, emoji });
    }
  };

  const getGroupedReactions = (reactions = []) => {
    const groups = {};
    reactions.forEach((r) => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
      }
      groups[r.emoji].count += 1;
      groups[r.emoji].users.push(r.userName);
      const reactUserId = (r.userId?._id || r.userId || '').toString();
      if (reactUserId === currentUserId) {
        groups[r.emoji].hasReacted = true;
      }
    });
    return Object.values(groups);
  };

  const getAvatarGradient = (name) => {
    const colors = [
      'from-rose-500 to-pink-500',
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-sky-500',
      'from-teal-500 to-emerald-500',
      'from-amber-500 to-orange-500',
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatMessageContent = (content) => {
    if (!content) return '';
    const parts = content.split(/(@\w+(?:\s+\w+)?)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-cyan-500/10 text-cyan-400 font-bold px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
    return 'Multiple users are typing...';
  }, [typingUsers]);

  return (
    <div className={isInline ? "w-full h-full bg-slate-950/60 flex flex-col min-h-0 relative rounded-2xl border border-white/5" : "fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-slate-950/95 border-l border-white/10 shadow-2xl flex flex-col transform translate-x-0 transition-transform duration-300 ease-out backdrop-blur-md"}>
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-sm">
            <span>#</span>
            <span>{channel.toLowerCase()}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Text Channel Chat</p>
        </div>
        {!isInline && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
        <div className="text-center py-6 border-b border-white/5 mb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
            <HiOutlineChatAlt className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Welcome to #{channel.toLowerCase()}!</h4>
          <p className="text-[10px] text-slate-500 mt-1">This is the start of the #{channel.toLowerCase()} channel.</p>
        </div>

        {loadingMessages ? (
          <div className="text-center py-10 text-xs text-slate-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 italic">No messages sent yet.</div>
        ) : (
          messages.map((message) => {
            const senderId = (message.senderId?._id || message.senderId || '').toString();
            const isOwn = senderId === currentUserId;
            const isEditing = editingMessageId === message._id;

            return (
              <div 
                key={message._id} 
                className="group flex flex-col rounded-2xl border border-white/5 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/60 p-3.5 transition text-xs relative"
              >
                {/* Reply Context */}
                {message.replyTo && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-2 border-l-2 border-cyan-500/40 mb-1.5 italic">
                    <span>↳ Replying to</span>
                    <span className="font-bold text-slate-400">@{message.replyTo.senderName || 'user'}</span>
                    <span className="truncate max-w-[200px]">"{message.replyTo.content}"</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(message.senderName)} text-white font-bold border border-slate-950`}>
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
                          className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(message._id)}
                            className="px-2.5 py-1 bg-cyan-500 text-slate-950 rounded font-bold text-[10px]"
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
                      <p className="text-slate-200 leading-relaxed break-words">{formatMessageContent(message.content)}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500">
                      {message.editedAt && <span>edited</span>}
                    </div>

                    {/* Reactions list */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {getGroupedReactions(message.reactions).map((group) => (
                          <button
                            key={group.emoji}
                            onClick={() => handleToggleReaction(message._id, group.emoji, group.hasReacted)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border transition ${
                              group.hasReacted
                                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 font-bold'
                                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                            }`}
                            title={group.users.join(', ')}
                          >
                            <span>{group.emoji}</span>
                            <span>{group.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-slate-950 border border-white/10 rounded-lg p-1 z-10">
                  <button
                    onClick={() => setReplyToMessage(message)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] font-bold px-1.5"
                    title="Reply"
                  >
                    ↳ Reply
                  </button>
                  
                  {['👍', '❤️', '🔥', '😂', '😮'].map((emoji) => {
                    const hasReact = message.reactions?.some(r => {
                      const reactUserId = (r.userId?._id || r.userId || '').toString();
                      return reactUserId === currentUserId && r.emoji === emoji;
                    });
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(message._id, emoji, hasReact)}
                        className={`p-1 hover:bg-slate-800 rounded transition text-xs ${hasReact ? 'bg-cyan-500/10' : ''}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  {(isOwn || isCurrentBoardOwner) && (
                    <>
                      {isOwn && !isEditing && (
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                          title="Edit"
                        >
                          <HiOutlinePencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded"
                        title="Delete"
                      >
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-slate-900/60 p-3.5 flex-shrink-0">
        {replyToMessage && (
          <div className="flex items-center justify-between bg-slate-950 border border-white/10 px-3 py-1.5 rounded-t-xl text-[10px] text-slate-400 border-b-0">
            <div className="flex items-center gap-1 truncate">
              <span>Replying to</span>
              <strong className="text-slate-300">@{replyToMessage.senderName}</strong>
              <span className="truncate max-w-[200px] italic">"{replyToMessage.content}"</span>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="text-slate-500 hover:text-slate-300 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mentions dropdown */}
        {showMentionDropdown && (
          <div className="bg-slate-950 border border-white/10 rounded-xl max-h-32 overflow-y-auto p-1.5 space-y-1 mb-2 shadow-2xl">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 px-2 py-0.5 border-b border-white/5">Mention Member</p>
            {allWorkspaceMembers
              .filter((m) => (m.name || '').toLowerCase().includes(mentionSearchQuery.toLowerCase()))
              .map((m) => (
                <button
                  key={m._id || m}
                  onClick={() => handleSelectMention(m)}
                  className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-cyan-500 hover:text-slate-950 rounded-lg transition font-semibold"
                >
                  @{m.name}
                </button>
              ))}
          </div>
        )}

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
            placeholder={`Message #${channel.toLowerCase()}`}
            className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center"
          >
            <HiOutlinePaperAirplane className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ChatDrawer;
