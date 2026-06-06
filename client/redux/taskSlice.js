import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';

// Async Thunks
export const fetchTasksByBoard = createAsyncThunk(
  'tasks/fetchByBoard',
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/tasks/board/${boardId}`);
      return response.data.tasks;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error fetching tasks');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/tasks', taskData);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error creating task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/tasks/${taskId}`, data);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error updating task');
    }
  }
);

export const moveTask = createAsyncThunk(
  'tasks/move',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/tasks/${taskId}/move`, data);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error moving task');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (taskId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
      return taskId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error deleting task');
    }
  }
);

const initialState = {
  tasks: [],
  loading: false,
  error: null,
  onlineUsers: [],
  editingUsers: {}, // { taskId: { userId, userName } }
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Local actions
    addTaskLocally: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTaskLocally: (state, action) => {
      const index = state.tasks.findIndex(task => task._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTaskLocally: (state, action) => {
      state.tasks = state.tasks.filter(task => task._id !== action.payload);
    },
    moveTaskLocally: (state, action) => {
      const index = state.tasks.findIndex(task => task._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setEditingUser: (state, action) => {
      const { taskId, userId, userName } = action.payload;
      if (!state.editingUsers[taskId]) {
        state.editingUsers[taskId] = {};
      }
      state.editingUsers[taskId] = { userId, userName };
    },
    removeEditingUser: (state, action) => {
      const { taskId } = action.payload;
      if (state.editingUsers[taskId]) {
        delete state.editingUsers[taskId];
      }
    },
    clearTasks: (state) => {
      state.tasks = [];
      state.editingUsers = {};
    },
  },
  extraReducers: (builder) => {
    // Fetch Tasks
    builder.addCase(fetchTasksByBoard.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTasksByBoard.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasksByBoard.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Create Task
    builder.addCase(createTask.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks.push(action.payload);
    });
    builder.addCase(createTask.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Update Task
    builder.addCase(updateTask.pending, (state) => {
      state.error = null;
    });
    builder.addCase(updateTask.fulfilled, (state, action) => {
      const index = state.tasks.findIndex(task => task._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    });
    builder.addCase(updateTask.rejected, (state, action) => {
      state.error = action.payload;
    });

    // Move Task
    builder.addCase(moveTask.pending, (state) => {
      state.error = null;
    });
    builder.addCase(moveTask.fulfilled, (state, action) => {
      const index = state.tasks.findIndex(task => task._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    });
    builder.addCase(moveTask.rejected, (state, action) => {
      state.error = action.payload;
    });

    // Delete Task
    builder.addCase(deleteTask.pending, (state) => {
      state.error = null;
    });
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.tasks = state.tasks.filter(task => task._id !== action.payload);
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      state.error = action.payload;
    });
  },
});

export const {
  addTaskLocally,
  updateTaskLocally,
  deleteTaskLocally,
  moveTaskLocally,
  setOnlineUsers,
  setEditingUser,
  removeEditingUser,
  clearTasks,
} = taskSlice.actions;

export default taskSlice.reducer;