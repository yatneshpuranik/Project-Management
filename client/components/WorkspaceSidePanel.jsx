import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineChevronDown, HiOutlineChevronRight } from 'react-icons/hi';
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

const WorkspaceSidePanel = ({ boardId, currentBoard, onSelectTextChannel, activeChatChannel }) => {
  // Realtime Presence States
  const [presenceUpdates, setPresenceUpdates] = useState({}); // { [userId]: { status, lastActive } }

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
  const navigate = useNavigate();

  const boardOwner = useMemo(() => {
    if (!currentBoard) return null;
    return currentBoard.createdBy;
  }, [currentBoard]);

  const isCurrentBoardOwner = useMemo(() => {
    if (!boardOwner) return false;
    const ownerId = (boardOwner._id || boardOwner).toString();
    return ownerId === currentUserId;
  }, [boardOwner, currentUserId]);

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
      const isOwner = (boardOwner?._id || boardOwner || '').toString() === mId.toString();

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

  const handleLeaveWorkspace = async () => {
    if (!window.confirm('Are you sure you want to leave this workspace? This will remove you from all task assignments and channels.')) return;
    try {
      await axiosInstance.post(`/boards/${boardId}/leave`);
      toast.success('You have left the workspace.');
      navigate('/boards');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave workspace.');
    }
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

  // Socket Connection Join & Listeners (Presence & Voice Only)
  useEffect(() => {
    if (!boardId) return;

    socket.emit('workspaceChatJoined', { boardId });

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

    socket.on('workspaceUserOnline', onUserOnline);
    socket.on('workspaceUserOffline', onUserOffline);
    socket.on('workspaceOnlineMembers', onOnlineMembers);
    socket.on('presence-update', onPresenceUpdate);
    socket.on('userJoinedVoice', onUserJoinedVoice);
    socket.on('userLeftVoice', onUserLeftVoice);
    socket.on('voiceStateUpdated', onVoiceStateUpdated);

    return () => {
      socket.emit('workspaceChatLeft', { boardId });
      socket.off('workspaceUserOnline', onUserOnline);
      socket.off('workspaceUserOffline', onUserOffline);
      socket.off('workspaceOnlineMembers', onOnlineMembers);
      socket.off('presence-update', onPresenceUpdate);
      socket.off('userJoinedVoice', onUserJoinedVoice);
      socket.off('userLeftVoice', onUserLeftVoice);
      socket.off('voiceStateUpdated', onVoiceStateUpdated);
    };
  }, [boardId, activeVoiceChannel, isMuted, isCameraOn, isScreenSharing]);

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

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        
        {/* CHANNELS SECTION */}
        <div>
          <button
            onClick={() => setChannelsCollapsed(!channelsCollapsed)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 w-full text-left"
          >
            {channelsCollapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}
            <span>Text Channels</span>
          </button>
          {!channelsCollapsed && (
            <div className="mt-2 pl-3 space-y-1">
              {(currentBoard?.channels || ['general', 'development', 'testing', 'announcements']).map((ch) => (
                <button
                  key={ch}
                  onClick={() => onSelectTextChannel && onSelectTextChannel(ch.toLowerCase())}
                  className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold w-full text-left transition ${
                    activeChatChannel?.toLowerCase() === ch.toLowerCase()
                      ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
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
                      className={`flex items-center justify-between py-1 px-2.5 rounded-lg text-xs font-semibold w-full text-left transition ${
                        isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
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

              {/* Leave Workspace Button */}
              {!isCurrentBoardOwner && (
                <button
                  onClick={handleLeaveWorkspace}
                  className="w-full py-2 mt-2 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 hover:bg-rose-500 hover:text-white transition font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  Leave Workspace
                </button>
              )}
            </div>
          )}
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
  );
};

export default WorkspaceSidePanel;
