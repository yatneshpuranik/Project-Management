import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoards, createBoard } from '../redux/boardSlice';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { boards, loading } = useSelector(state => state.boards);
  const { user } = useSelector(state => state.user);

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!boardTitle.trim()) {
      alert('Board title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const resultAction = await dispatch(
        createBoard({
          title: boardTitle,
          description: boardDescription,
        })
      );

      if (createBoard.fulfilled.match(resultAction)) {
        setBoardTitle('');
        setBoardDescription('');
        setIsCreateBoardOpen(false);
        navigate(`/board/${resultAction.payload._id}`);
      }
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoardClick = (boardId) => {
    navigate(`/board/${boardId}`);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back, {user?.name || 'User'}</h1>
            <p className="text-slate-400">Manage your boards and collaborate in real-time</p>
          </div>
          <button
            onClick={() => setIsCreateBoardOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + New Board
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl font-semibold text-slate-300">Loading boards...</div>
          </div>
        )}

        {/* Boards Grid */}
        {!loading && boards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map(board => (
              <div
                key={board._id}
                onClick={() => handleBoardClick(board._id)}
                className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 hover:shadow-xl transition-all cursor-pointer hover:scale-105 transform"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{board.title}</h2>
                    {board.description && (
                      <p className="text-slate-400 text-sm mb-4">{board.description}</p>
                    )}
                  </div>
                  <div className="text-3xl">📋</div>
                </div>

                {/* Board Stats */}
                <div className="border-t border-slate-600 pt-4">
                  <div className="flex justify-between text-sm text-slate-300 mb-3">
                    <span>👥 {board.members?.length || 0} Members</span>
                    <span>⏰ {new Date(board.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Members Avatar */}
                  {board.members && board.members.length > 0 && (
                    <div className="flex -space-x-2">
                      {board.members.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-700"
                          title={member.name}
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {board.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-700">
                          +{board.members.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-white mb-2">No boards yet</h2>
            <p className="text-slate-400 mb-6">Create your first board to get started with real-time collaboration</p>
            <button
              onClick={() => setIsCreateBoardOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Create First Board
            </button>
          </div>
        ) : null}
      </div>

      {/* Create Board Modal */}
      {isCreateBoardOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create New Board</h2>
              <button
                onClick={() => setIsCreateBoardOpen(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label htmlFor="boardTitle" className="block text-sm font-semibold text-white mb-2">
                  Board Title *
                </label>
                <input
                  id="boardTitle"
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  required
                  placeholder="e.g., Project Alpha"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="boardDescription" className="block text-sm font-semibold text-white mb-2">
                  Description
                </label>
                <textarea
                  id="boardDescription"
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="Describe your board"
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateBoardOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
