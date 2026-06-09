import { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  HiOutlineX,
  HiOutlineChatAlt,
  HiOutlineTrash,
  HiOutlineReply,
  HiOutlineUser,
  HiOutlineCheck,
  HiOutlinePaperAirplane
} from 'react-icons/hi';
import axiosInstance from '../utils/axiosInstance';
import socket from '../utils/socket';
import { toast } from '../utils/toast';
import { fetchTasksByBoard } from '../redux/taskSlice';

const CommentsModal = ({ taskId, boardId, onClose }) => {
  const dispatch = useDispatch();
  const { currentBoard } = useSelector((state) => state.boards);
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'You';
  const userRole = localStorage.getItem('userRole');

  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const commentsEndRef = useRef(null);

  const isOwner = useMemo(() => {
    if (!currentBoard) return false;
    const ownerId = currentBoard.createdBy?._id || currentBoard.createdBy;
    return ownerId === currentUserId || userRole === 'ADMIN';
  }, [currentBoard, currentUserId, userRole]);

  const fetchComments = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/tasks/${taskId}/comments?limit=100&skip=0`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      toast.error('Could not load comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  // Handle Socket events
  useEffect(() => {
    if (!taskId) return;

    const onCommentAdded = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment?._id)) return prev;
          return [...prev, data.comment];
        });
        // Scroll to bottom on new comment if user is at the bottom or it's their comment
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const onCommentDeleted = (data) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    };

    socket.on('comment-added', onCommentAdded);
    socket.on('commentAdded', onCommentAdded);
    socket.on('comment-deleted', onCommentDeleted);
    socket.on('commentDeleted', onCommentDeleted);

    return () => {
      socket.off('comment-added', onCommentAdded);
      socket.off('commentAdded', onCommentAdded);
      socket.off('comment-deleted', onCommentDeleted);
      socket.off('commentDeleted', onCommentDeleted);
    };
  }, [taskId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        text: commentText.trim(),
      };
      if (replyTo) {
        payload.parentId = replyTo._id;
      }
      const response = await axiosInstance.post(`/tasks/${taskId}/comments`, payload);
      const newComment = response.data.comment;
      
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment?._id)) return prev;
        return [...prev, newComment];
      });
      setCommentText('');
      setReplyTo(null);
      
      // Update task list redux count
      dispatch(fetchTasksByBoard(boardId));

      // Emit comment socket event
      socket.emit('comment-added', { boardId, taskId, comment: newComment });

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this comment permanently?')) return;
    try {
      await axiosInstance.delete(`/tasks/${taskId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      
      // Update task list redux count
      dispatch(fetchTasksByBoard(boardId));

      // Emit delete comment socket event
      socket.emit('comment-deleted', { boardId, taskId, commentId });
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error('Failed to delete comment.');
    }
  };

  const getSeenBy = (comment) => {
    if (!currentBoard) return 'Only you';
    const allTeammates = [currentBoard.createdBy, ...(currentBoard.members || [])].filter(Boolean);
    const seenByList = [];
    const authorId = (comment.userId?._id || comment.userId || '').toString();
    
    const seenIds = new Set();
    allTeammates.forEach(m => {
      const mId = (m._id || m).toString();
      if (mId !== authorId && !seenIds.has(mId)) {
        seenIds.add(mId);
        seenByList.push(m.name || 'Teammate');
      }
    });

    return seenByList.length > 0 ? `Seen by: ${seenByList.join(', ')}` : 'Seen by: Only you';
  };

  const rootComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const replies = useMemo(() => comments.filter(c => c.parentId), [comments]);

  const renderCommentNode = (c, depth = 0) => {
    const children = replies.filter(r => (r.parentId?._id || r.parentId || '').toString() === c._id.toString());
    const isCommentOwner = (c.userId?._id || c.userId || '').toString() === currentUserId;
    const canDelete = isCommentOwner || isOwner;
    const isSelected = selectedCommentId === c._id;

    return (
      <div key={c._id} className="space-y-2 mt-3" style={{ marginLeft: depth > 0 ? `${Math.min(depth * 16, 48)}px` : '0px' }}>
        <div 
          onClick={() => setSelectedCommentId(isSelected ? null : c._id)}
          className={`group/comment relative border p-3 rounded-xl cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'border-sky-500/30 bg-sky-500/5 shadow-md shadow-sky-500/5' 
              : 'border-white/5 bg-slate-950/40 hover:border-white/10 hover:bg-slate-950/60'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-semibold">
            <div className="flex items-center gap-2">
              <span className={`font-bold transition-colors ${isSelected ? 'text-sky-400' : 'text-slate-300'}`}>
                {c.userName || 'Teammate'}
              </span>
              {isCommentOwner && (
                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  You
                </span>
              )}
            </div>
            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex justify-between items-start gap-3">
            <p className="text-xs text-slate-200 flex-1 break-words">{c.text}</p>
            <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover/comment:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyTo(replyTo?._id === c._id ? null : c);
                  setCommentText('');
                }}
                className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-800 rounded"
                title="Reply"
              >
                <HiOutlineReply className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Selected Interaction State Details */}
          {isSelected && (
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 animate-fade-in">
              <div className="flex items-center gap-1.5">
                {isCommentOwner ? (
                  <span className="text-slate-400 font-semibold">{getSeenBy(c)}</span>
                ) : (
                  <span className="text-slate-400 font-semibold">Sent by: {c.userName || 'Teammate'}</span>
                )}
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteComment(c._id, e)}
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded transition"
                  title="Delete comment"
                >
                  <HiOutlineTrash className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {children.map(child => renderCommentNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0E1528]/95 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/60 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <HiOutlineChatAlt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Task Discussion</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time collaborative updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-900/20">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-xs">
              Loading discussion history...
            </div>
          ) : rootComments.length > 0 ? (
            <>
              {rootComments.map((comment) => renderCommentNode(comment))}
              <div ref={commentsEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <HiOutlineChatAlt className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-xs font-semibold">No comments yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Be the first to start the conversation!</p>
            </div>
          )}
        </div>

        {/* Footer input form */}
        <div className="border-t border-white/10 p-4 bg-slate-950/60 backdrop-blur flex-shrink-0 space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/10 p-2.5 rounded-xl text-[11px] animate-fade-in">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] font-bold text-sky-400 uppercase tracking-wider">
                  Replying to: {replyTo.userName || 'Teammate'}
                </p>
                <p className="text-slate-300 truncate mt-0.5 font-medium">"{replyTo.text}"</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded ml-2 transition flex-shrink-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? "Type your reply..." : "Write a comment..."}
              required
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-500 transition placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-4 py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10"
            >
              <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
              <span>{replyTo ? 'Reply' : 'Post'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CommentsModal;
