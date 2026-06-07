import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTasksByBoard,
  setOnlineUsers,
  addTaskLocally,
  updateTaskLocally,
  deleteTaskLocally,
  moveTaskLocally,
  setEditingUser,
  removeEditingUser,
} from '../redux/taskSlice';
import Column from './Column';
import CreateTaskModal from './CreateTaskModal';
import socket from '../utils/socket';

const Board = ({ boardId }) => {
  const dispatch = useDispatch();
  const { tasks, loading, onlineUsers } = useSelector(state => state.tasks);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState('Todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [dueFilter, setDueFilter] = useState('All');

  useEffect(() => {
    if (!boardId) return;

    dispatch(fetchTasksByBoard(boardId));

    const joinRoom = () => {
      socket.emit('join-board', {
        boardId,
      });
    };

    joinRoom();

    const handleOnlineUsers = (data) => {
      dispatch(setOnlineUsers(data.users || []));
      localStorage.setItem('onlineCount', (data.users || []).length.toString());
    };

    const handleTaskCreated = (data) => {
      if (data?.task) {
        dispatch(addTaskLocally(data.task));
      }
    };

    const handleTaskUpdated = (data) => {
      if (data?.task) {
        dispatch(updateTaskLocally(data.task));
      }
    };

    const handleTaskDeleted = (data) => {
      if (data?.taskId) {
        dispatch(deleteTaskLocally(data.taskId));
      }
    };

    const handleTaskMoved = (data) => {
      if (data?.task) {
        dispatch(moveTaskLocally(data.task));
      }
    };

    const handleTypingStart = (data) => {
      if (data?.taskId && data?.userId && data?.userName) {
        dispatch(setEditingUser(data));
      }
    };

    const handleTypingStop = (data) => {
      if (data?.taskId && data?.userId) {
        dispatch(removeEditingUser(data));
      }
    };

    const handleConnect = () => {
      joinRoom();
    };

    socket.on('connect', handleConnect);
    socket.on('online-users', handleOnlineUsers);
    socket.on('task-created', handleTaskCreated);
    socket.on('task-updated', handleTaskUpdated);
    socket.on('task-deleted', handleTaskDeleted);
    socket.on('task-moved', handleTaskMoved);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);

    return () => {
      socket.emit('leave-board', {
        boardId,
      });
      socket.off('connect', handleConnect);
      socket.off('online-users', handleOnlineUsers);
      socket.off('task-created', handleTaskCreated);
      socket.off('task-updated', handleTaskUpdated);
      socket.off('task-deleted', handleTaskDeleted);
      socket.off('task-moved', handleTaskMoved);
      socket.off('typing-start', handleTypingStart);
      socket.off('typing-stop', handleTypingStop);
    };
  }, [boardId, dispatch]);

  const statuses = ['Todo', 'In Progress', 'Review', 'Done'];

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query);
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesAssigned =
        assignedFilter === 'All' || task.assignedTo?.name === assignedFilter;

      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const today = new Date();
      const oneWeek = new Date();
      oneWeek.setDate(today.getDate() + 7);
      let matchesDue = true;

      if (dueFilter === 'Today') {
        matchesDue = dueDate && dueDate.toDateString() === today.toDateString();
      }
      if (dueFilter === 'This Week') {
        matchesDue = dueDate && dueDate >= today && dueDate <= oneWeek;
      }
      if (dueFilter === 'Overdue') {
        matchesDue = dueDate && dueDate < today;
      }

      return matchesSearch && matchesPriority && matchesAssigned && matchesDue;
    });
  }, [tasks, priorityFilter, assignedFilter, searchQuery, dueFilter]);

  const uniqueAssignees = useMemo(() => {
    return Array.from(new Set(tasks.map((task) => task.assignedTo?.name).filter(Boolean)));
  }, [tasks]);

  if (!boardId) {
    return (
      <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-950/90 p-12 text-center text-slate-300 shadow-2xl shadow-slate-950/30">
        <p className="text-lg font-semibold text-white">No board selected</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">Select a board from the sidebar to view your tasks and activity.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-24 text-slate-100">
        <div className="rounded-3xl bg-slate-950/80 px-8 py-6 text-xl font-semibold shadow-2xl shadow-slate-950/40">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Controls / Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Total tasks</p>
          <p className="text-xl font-bold text-white mt-1">{tasks.length}</p>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Teammates Online</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{onlineUsers.length}</p>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Active Priority</p>
          <p className="text-xl font-bold text-sky-400 mt-1">{priorityFilter !== 'All' ? priorityFilter : 'All'}</p>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Contributors</p>
          <p className="text-xl font-bold text-white mt-1">{uniqueAssignees.length || 1}</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/20 p-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="w-full lg:max-w-md">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="w-full lg:w-auto flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
              >
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Assignee:</span>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
              >
                <option>All</option>
                {uniqueAssignees.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Due:</span>
              <select
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
              >
                <option>All</option>
                <option>Today</option>
                <option>This Week</option>
                <option>Overdue</option>
              </select>
            </div>

            <button
              onClick={() => {
                setCreateTaskStatus('Todo');
                setIsCreateModalOpen(true);
              }}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 text-xs font-semibold shadow-md transition ml-auto"
            >
              + Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Kanban Area */}
      <div className="mt-4 flex-1 overflow-x-auto flex gap-6 pb-4 pt-1 custom-scrollbar w-full">
        {statuses.map((status) => (
          <div key={status} className="w-[340px] flex-shrink-0 flex flex-col h-full">
            <Column
              status={status}
              tasks={filteredTasks.filter((task) => task.status === status)}
              boardId={boardId}
              onAddTask={(statusName) => {
                setCreateTaskStatus(statusName);
                setIsCreateModalOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        boardId={boardId}
        defaultStatus={createTaskStatus}
      />
    </div>
  );
};

export default Board;
