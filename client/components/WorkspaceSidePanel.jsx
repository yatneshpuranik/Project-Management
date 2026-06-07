import { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChatAlt, HiOutlinePencil, HiOutlineTrash, HiOutlinePaperAirplane } from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import socket from '../utils/socket';
import { toast } from '../utils/toast';

// Custom inline SVG icons for Voice / Media controls
const MuteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l2.25 2.25V8.25z" />
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const ScreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
);

const DisconnectIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12m0 0l2.25 2.25M16.5 12l2.25-2.25M16.5 12l-2.25 2.25M6.5 18c-2.209 0-4-1.791-4-4s1.791-4 4-4a4 4 0 014 4c0 2.209-1.791 4-4 4zm0 0H21m-4.5-8.25L14.25 12m0 0l-2.25-2.25m2.25 2.25L12 14.25" />
  </svg>
);

const WorkspaceSidePanel = ({ boardId, currentBoard }) => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'activity'
  const [currentChannel, setCurrentChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Chat message & input states
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Thread Reply State
  const [replyToMessage, setReplyToMessage] = useState(null);

  // Mention Dropdown State
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentions, setMentions] = useState([]); // Array of user IDs mentioned
  
  // Realtime Presence States
  const [presenceUpdates, setPresenceUpdates] = useState({}); // { [userId]: { status, lastActive } }
  const [typingUsers, setTypingUsers] = useState([]); // Array of { userId, userName }
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Mock Voice / Video States
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [voiceChannelUsers, setVoiceChannelUsers] = useState({}); // { [channelName]: { [userId]: { userName, isMuted, isCameraOn, isScreenSharing } } }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Collapsible sections state
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [voiceChannelsCollapsed, setVoiceChannelsCollapsed] = useState(false);
  const [membersCollapsed, setMembersCollapsed] = useState(false);

  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'You';

  const boardOwner = useMemo(() => {
    if (!currentBoard) return null;
    return currentBoard.createdBy;
  }, [currentBoard]);

  // Set default channel when board loaded
  useEffect(() => {
    if (currentBoard?.channels && currentBoard.channels.length > 0) {
      const exists = currentBoard.channels.some(ch => ch.toLowerCase() === currentChannel.toLowerCase());
      if (!exists) {
        setCurrentChannel(currentBoard.channels[0].toLowerCase());
      }
    }
  }, [currentBoard, currentChannel]);

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

  // Resolve presence dynamically
  const getMemberPresence = (member) => {
    const mId = member._id || member;
    if (mId === currentUserId) {
      return { status: 'Online', lastActive: new Date() };
    }
    const update = presenceUpdates[mId];
    if (update) {
      return {
        status: update.status,
        lastActive: update.lastActive
      };
    }
    return {
      status: member.presenceStatus || 'Offline',
      lastActive: member.lastActive || null
    };
  };

  // Group members by categories
  const groupedMembers = useMemo(() => {
    const ownerList = [];
    const memberList = [];
    const blockedList = [];

    allWorkspaceMembers.forEach(member => {
      const isBlocked = member.isBlocked;
      const mId = member._id || member;
      const isOwner = (boardOwner?._id || boardOwner) === mId;

      if (isBlocked) {
        blockedList.push(member);
      } else if (isOwner) {
        ownerList.push(member);
      } else {
        memberList.push(member);
      }
    });

    return { ownerList, memberList, blockedList };
  }, [allWorkspaceMembers, boardOwner]);

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
    
    if (!mentions.includes(member._id)) {
      setMentions([...mentions, member._id]);
    }
    setShowMentionDropdown(false);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !boardId) return;
    setIsSending(true);

    const messageData = {
      boardId,
      channel: currentChannel,
      content: newMessage.trim(),
    };

    if (replyToMessage) {
      messageData.replyTo = replyToMessage._id;
    }

    if (mentions.length > 0) {
      // Ensure the mentions are clean in content
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
    } else {
      // Fallback to REST API
      axiosInstance.post(`/boards/${boardId}/chat`, messageData).then(() => {
        setNewMessage('');
        setReplyToMessage(null);
        setMentions([]);
        setIsSending(false);
        fetchMessages(currentChannel);
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
        fetchMessages(currentChannel);
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
        .then(() => fetchMessages(currentChannel))
        .catch(err => console.error(err));
    }
  };

  // Reactions
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
      if (r.userId === currentUserId) {
        groups[r.emoji].hasReacted = true;
      }
    });
    return Object.values(groups);
  };

  // Voice Controls
  const handleJoinVoice = (ch) => {
    if (!socket.connected) {
      toast.error('Voice channels require an active socket connection.');
      return;
    }
    if (activeVoiceChannel === ch) return;
    
    if (activeVoiceChannel) {
      socket.emit('leaveVoiceChannel', { boardId, channelName: activeVoiceChannel });
    }
    
    socket.emit('joinVoiceChannel', { boardId, channelName: ch });
    setActiveVoiceChannel(ch);
    
    socket.emit('voiceStateUpdate', {
      boardId,
      channelName: ch,
      isMuted,
      isCameraOn,
      isScreenSharing
    });
    toast.success(`Connected to voice: #${ch.replace('-voice', '')}`);
  };

  const handleLeaveVoice = () => {
    if (!activeVoiceChannel) return;
    socket.emit('leaveVoiceChannel', { boardId, channelName: activeVoiceChannel });
    setActiveVoiceChannel(null);
    setVoiceChannelUsers((prev) => {
      const next = { ...prev };
      delete next[activeVoiceChannel];
      return next;
    });
    toast.info('Disconnected from voice.');
  };

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted: nextVal,
        isCameraOn,
        isScreenSharing
      });
    }
  };

  const handleToggleCamera = () => {
    const nextVal = !isCameraOn;
    setIsCameraOn(nextVal);
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted,
        isCameraOn: nextVal,
        isScreenSharing
      });
    }
  };

  const handleToggleScreenShare = () => {
    const nextVal = !isScreenSharing;
    setIsScreenSharing(nextVal);
    if (activeVoiceChannel) {
      socket.emit('voiceStateUpdate', {
        boardId,
        channelName: activeVoiceChannel,
        isMuted,
        isCameraOn,
        isScreenSharing: nextVal
      });
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

    socket.emit('workspaceChatJoined', { boardId });

    const onMessageSent = (data) => {
      if (data.boardId !== boardId) return;
      if (data.message?.channel !== currentChannel) return;
      setMessages((prev) => {
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

    const onPresenceUpdate = (data) => {
      setPresenceUpdates((prev) => ({
        ...prev,
        [data.userId]: { status: data.status, lastActive: data.lastActive }
      }));
    };

    const onUserOnline = (data) => {
      if (data.boardId !== boardId) return;
      setPresenceUpdates((prev) => ({
        ...prev,
        [data.userId]: { status: 'Online', lastActive: new Date() }
      }));
    };

    const onUserOffline = (data) => {
      if (data.boardId !== boardId) return;
      setPresenceUpdates((prev) => ({
        ...prev,
        [data.userId]: { status: 'Offline', lastActive: new Date() }
      }));
    };

    const onOnlineMembers = (data) => {
      if (data.boardId !== boardId) return;
      setPresenceUpdates((prev) => {
        const next = { ...prev };
        data.users?.forEach((u) => {
          next[u.userId] = { status: 'Online', lastActive: new Date() };
        });
        return next;
      });
    };

    const onActivityCreated = (data) => {
      if (data?.activity?.boardId !== boardId) return;
      setActivities((prev) => [data.activity, ...prev]);
    };

    // Reactions Listeners
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

    // Voice Channel Listeners
    const onUserJoinedVoice = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName;
        const users = prev[ch] || {};
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
        };
      });

      if (activeVoiceChannel === data.channelName) {
        socket.emit('voiceStateUpdate', {
          boardId,
          channelName: activeVoiceChannel,
          isMuted,
          isCameraOn,
          isScreenSharing
        });
      }
    };

    const onUserLeftVoice = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName;
        const users = { ...(prev[ch] || {}) };
        delete users[data.userId];
        return {
          ...prev,
          [ch]: users
        };
      });
    };

    const onVoiceStateUpdated = (data) => {
      setVoiceChannelUsers((prev) => {
        const ch = data.channelName;
        const users = prev[ch] || {};
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
        };
      });
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
    socket.on('presence-update', onPresenceUpdate);
    socket.on('workspaceReactionAdded', onReactionAdded);
    socket.on('workspaceReactionRemoved', onReactionRemoved);
    socket.on('userJoinedVoice', onUserJoinedVoice);
    socket.on('userLeftVoice', onUserLeftVoice);
    socket.on('voiceStateUpdated', onVoiceStateUpdated);

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
      socket.off('presence-update', onPresenceUpdate);
      socket.off('workspaceReactionAdded', onReactionAdded);
      socket.off('workspaceReactionRemoved', onReactionRemoved);
      socket.off('userJoinedVoice', onUserJoinedVoice);
      socket.off('userLeftVoice', onUserLeftVoice);
      socket.off('voiceStateUpdated', onVoiceStateUpdated);
    };
  }, [boardId, currentChannel, currentUserId, activeVoiceChannel, isMuted, isCameraOn, isScreenSharing]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
    return 'Multiple users are typing...';
  }, [typingUsers]);

  // Helpers for visuals
  const formatLastActive = (dateString) => {
    if (!dateString) return 'Offline';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
          <span key={index} className="bg-sky-500/10 text-sky-400 font-bold px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Render Member Directory Item
  const renderMemberItem = (member, roleLabel) => {
    const mId = member._id || member;
    const presence = getMemberPresence(member);
    const isBlocked = member.isBlocked;
    
    const statusColor = isBlocked
      ? 'bg-red-500 shadow-red-500/20'
      : presence.status === 'Online'
      ? 'bg-emerald-500 shadow-emerald-500/20'
      : presence.status === 'Away'
      ? 'bg-amber-500 shadow-amber-500/20'
      : presence.status === 'Busy'
      ? 'bg-rose-500 shadow-rose-500/20'
      : 'bg-slate-600';

    const initials = member.name ? member.name.charAt(0).toUpperCase() : '?';

    return (
      <div key={mId} className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:border-slate-800 transition">
        <div className="relative flex-shrink-0">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(member.name)} text-white font-bold text-sm border border-slate-950`}>
            {initials}
          </span>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 ${statusColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white truncate">{member.name}</p>
            <span className={`text-[8px] px-1 rounded uppercase font-bold border ${
              isBlocked
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : roleLabel === 'OWNER'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isBlocked ? 'Blocked' : roleLabel}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{member.email}</p>
          <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">
            {isBlocked ? 'Blocked User' : `Active: ${presence.status === 'Online' ? 'Online' : formatLastActive(presence.lastActive)}`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      
      {/* Workspace Header */}
      <div className="border-b border-white/10 p-4 bg-slate-900/60 flex-shrink-0">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-semibold">WORKSPACE PANEL</p>
        <h3 className="text-sm font-bold text-white mt-1 truncate">{currentBoard?.title || 'Workspace'}</h3>
        <p className="text-[10px] text-sky-400 mt-1 font-semibold">Workspace Owner: {boardOwner?.name || 'Unknown'}</p>
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
            
            {/* Discord Sidebar: Channels, Voice and Members */}
            <div className="border-b border-white/10 bg-slate-900/40 p-3 flex-shrink-0 space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
              
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
                  <div className="mt-2 pl-3 space-y-1">
                    {(currentBoard?.channels || ['general', 'development', 'testing', 'announcements']).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setCurrentChannel(ch.toLowerCase())}
                        className={`flex items-center gap-1.5 py-1 text-xs font-semibold w-full text-left transition ${
                          currentChannel.toLowerCase() === ch.toLowerCase() ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>#</span>
                        <span>{ch.toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* VOICE CHANNELS SECTION */}
              <div>
                <button
                  onClick={() => setVoiceChannelsCollapsed(!voiceChannelsCollapsed)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 w-full text-left"
                >
                  {voiceChannelsCollapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}
                  <span>Voice Channels</span>
                </button>
                {!voiceChannelsCollapsed && (
                  <div className="mt-2 pl-3 space-y-2">
                    {['general-voice', 'development-voice', 'meeting-voice'].map((ch) => {
                      const usersInCh = Object.entries(voiceChannelUsers[ch] || {});
                      const isActive = activeVoiceChannel === ch;
                      return (
                        <div key={ch} className="space-y-1">
                          <button
                            onClick={() => handleJoinVoice(ch)}
                            className={`flex items-center justify-between py-1 text-xs font-semibold w-full text-left transition ${
                              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>🔊</span>
                              <span>{ch.replace('-voice', '')}</span>
                            </span>
                            {isActive && <span className="text-[8.5px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400 font-bold">Connected</span>}
                          </button>
                          
                          {/* List users in voice channel */}
                          {usersInCh.length > 0 && (
                            <div className="pl-5 space-y-1 border-l border-white/5 ml-1.5">
                              {usersInCh.map(([uid, uState]) => (
                                <div key={uid} className="flex items-center justify-between text-[10.5px] text-slate-400 py-0.5">
                                  <span className="truncate">{uState.userName}</span>
                                  <div className="flex gap-1 items-center">
                                    {uState.isMuted && <span title="Muted" className="text-[10px]">🔇</span>}
                                    {uState.isCameraOn && <span title="Camera On" className="text-[10px]">📷</span>}
                                    {uState.isScreenSharing && <span title="Screen Sharing" className="text-[10px]">🖥️</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  <span>Team Directory</span>
                </button>
                {!membersCollapsed && (
                  <div className="mt-2 pl-1 space-y-3">
                    {/* OWNER LIST */}
                    {groupedMembers.ownerList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider pl-1">Owner</span>
                        {groupedMembers.ownerList.map((m) => renderMemberItem(m, 'OWNER'))}
                      </div>
                    )}

                    {/* MEMBER LIST */}
                    {groupedMembers.memberList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider pl-1">Members ({groupedMembers.memberList.length})</span>
                        {groupedMembers.memberList.map((m) => renderMemberItem(m, 'MEMBER'))}
                      </div>
                    )}

                    {/* BLOCKED USERS */}
                    {groupedMembers.blockedList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-red-400 block tracking-wider pl-1">Blocked Users</span>
                        {groupedMembers.blockedList.map((m) => renderMemberItem(m, 'BLOCKED'))}
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
                <h4 className="text-sm font-bold text-white">Welcome to #{currentChannel.toLowerCase()}!</h4>
                <p className="text-[10px] text-slate-500 mt-1">This is the start of the #{currentChannel.toLowerCase()} channel chat history.</p>
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
                      className="group flex flex-col rounded-2xl border border-white/5 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/60 p-3.5 transition text-xs relative"
                    >
                      {/* Reply Reference rendering */}
                      {message.replyTo && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-2 border-l-2 border-sky-500/40 mb-1.5 italic">
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
                            <p className="text-slate-200 leading-relaxed break-words">{formatMessageContent(message.content)}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500">
                            {message.editedAt && <span>edited</span>}
                            {message.readBy?.length > 0 && (
                              <span>Read by {message.readBy.length}</span>
                            )}
                          </div>

                          {/* Render Reactions list */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {getGroupedReactions(message.reactions).map((group) => (
                                <button
                                  key={group.emoji}
                                  onClick={() => handleToggleReaction(message._id, group.emoji, group.hasReacted)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border transition ${
                                    group.hasReacted
                                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 font-bold'
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

                      {/* Hover Actions: Reply, React, Edit, Delete */}
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-slate-950 border border-white/10 rounded-lg p-1 z-10">
                        {/* Reply Button */}
                        <button
                          onClick={() => setReplyToMessage(message)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] font-bold px-1.5"
                          title="Reply"
                        >
                          ↳ Reply
                        </button>
                        
                        {/* Emoji Picker buttons */}
                        {['👍', '❤️', '🔥', '😂', '😮'].map((emoji) => {
                          const hasReact = message.reactions?.some(r => r.userId === currentUserId && r.emoji === emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(message._id, emoji, hasReact)}
                              className={`p-1 hover:bg-slate-800 rounded transition text-xs ${hasReact ? 'bg-sky-500/10' : ''}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}

                        {isOwn && !isEditing && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* MESSAGE INPUT */}
            <div className="border-t border-white/10 bg-slate-900/60 p-3.5 flex-shrink-0">
              {/* Reply Preview Bar */}
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

              {/* Mentions Autocomplete Dropdown */}
              {showMentionDropdown && (
                <div className="bg-slate-950 border border-white/10 rounded-xl max-h-32 overflow-y-auto p-1.5 space-y-1 mb-2 shadow-2xl">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 px-2 py-0.5 border-b border-white/5">Mention Member</p>
                  {allWorkspaceMembers
                    .filter((m) => (m.name || '').toLowerCase().includes(mentionSearchQuery.toLowerCase()))
                    .map((m) => (
                      <button
                        key={m._id || m}
                        onClick={() => handleSelectMention(m)}
                        className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-sky-500 hover:text-slate-950 rounded-lg transition font-semibold"
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

            {/* VOICE CONTROL PANEL */}
            {activeVoiceChannel && (
              <div className="border-t border-white/10 bg-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0 animate-fadeIn">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Voice Connected
                  </p>
                  <p className="text-xs font-bold text-white truncate mt-0.5">#{activeVoiceChannel.replace('-voice', '')}</p>
                </div>
                
                {/* Media Control Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMute}
                    className={`p-2 rounded-xl border transition ${
                      isMuted 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' 
                        : 'bg-slate-950 border-white/5 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MuteIcon /> : <MicIcon />}
                  </button>

                  <button
                    onClick={handleToggleCamera}
                    className={`p-2 rounded-xl border transition ${
                      isCameraOn 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-slate-950 border-white/5 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
                  >
                    <CameraIcon />
                  </button>

                  <button
                    onClick={handleToggleScreenShare}
                    className={`p-2 rounded-xl border transition ${
                      isScreenSharing 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-slate-950 border-white/5 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                  >
                    <ScreenIcon />
                  </button>

                  <button
                    onClick={handleLeaveVoice}
                    className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 border border-rose-500/20 text-white transition flex items-center justify-center"
                    title="Disconnect Voice Call"
                  >
                    <DisconnectIcon />
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Workspace Activity Log</h4>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act._id || act.createdAt} className="text-xs border border-white/5 bg-slate-900/30 p-3 rounded-xl">
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
