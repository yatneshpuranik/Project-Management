import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';

// Async Thunks
export const fetchBoards = createAsyncThunk(
  'boards/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/boards');
      return response.data.boards;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error fetching boards');
    }
  }
);

export const createBoard = createAsyncThunk(
  'boards/create',
  async (boardData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/boards', boardData);
      return response.data.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error creating board');
    }
  }
);

export const fetchBoardById = createAsyncThunk(
  'boards/fetchById',
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/boards/${boardId}`);
      return response.data.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error fetching board');
    }
  }
);

export const updateBoard = createAsyncThunk(
  'boards/update',
  async ({ boardId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/boards/${boardId}`, data);
      return response.data.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error updating board');
    }
  }
);

export const deleteBoard = createAsyncThunk(
  'boards/delete',
  async (boardId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/boards/${boardId}`);
      return boardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error deleting board');
    }
  }
);

export const addBoardMember = createAsyncThunk(
  'boards/addMember',
  async ({ boardId, memberId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/boards/${boardId}/members`, {
        memberId,
      });
      return response.data.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error adding member');
    }
  }
);

export const removeBoardMember = createAsyncThunk(
  'boards/removeMember',
  async ({ boardId, memberId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `/boards/${boardId}/members/${memberId}`
      );
      return response.data.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error removing member');
    }
  }
);

const initialState = {
  boards: [],
  currentBoard: null,
  loading: false,
  error: null,
};

const boardSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    setCurrentBoard: (state, action) => {
      state.currentBoard = action.payload;
    },
    clearCurrentBoard: (state) => {
      state.currentBoard = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Boards
    builder.addCase(fetchBoards.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchBoards.fulfilled, (state, action) => {
      state.loading = false;
      state.boards = action.payload;
    });
    builder.addCase(fetchBoards.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Create Board
    builder.addCase(createBoard.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createBoard.fulfilled, (state, action) => {
      state.loading = false;
      state.boards.push(action.payload);
      state.currentBoard = action.payload;
    });
    builder.addCase(createBoard.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Update Board
    builder.addCase(updateBoard.pending, (state) => {
      state.error = null;
    });
    builder.addCase(updateBoard.fulfilled, (state, action) => {
      const index = state.boards.findIndex(
        board => board._id === action.payload._id
      );
      if (index !== -1) {
        state.boards[index] = action.payload;
      }
      if (state.currentBoard?._id === action.payload._id) {
        state.currentBoard = action.payload;
      }
    });
    builder.addCase(updateBoard.rejected, (state, action) => {
      state.error = action.payload;
    });

    // Fetch Board By ID
    builder.addCase(fetchBoardById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchBoardById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentBoard = action.payload;
      const index = state.boards.findIndex(board => board._id === action.payload._id);
      if (index !== -1) {
        state.boards[index] = action.payload;
      } else {
        state.boards.push(action.payload);
      }
    });
    builder.addCase(fetchBoardById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Delete Board
    builder.addCase(deleteBoard.pending, (state) => {
      state.error = null;
    });
    builder.addCase(deleteBoard.fulfilled, (state, action) => {
      state.boards = state.boards.filter(board => board._id !== action.payload);
      if (state.currentBoard?._id === action.payload) {
        state.currentBoard = null;
      }
    });
    builder.addCase(deleteBoard.rejected, (state, action) => {
      state.error = action.payload;
    });

    // Add Member
    builder.addCase(addBoardMember.fulfilled, (state, action) => {
      const index = state.boards.findIndex(
        board => board._id === action.payload._id
      );
      if (index !== -1) {
        state.boards[index] = action.payload;
      }
      if (state.currentBoard?._id === action.payload._id) {
        state.currentBoard = action.payload;
      }
    });

    // Remove Member
    builder.addCase(removeBoardMember.fulfilled, (state, action) => {
      const index = state.boards.findIndex(
        board => board._id === action.payload._id
      );
      if (index !== -1) {
        state.boards[index] = action.payload;
      }
      if (state.currentBoard?._id === action.payload._id) {
        state.currentBoard = action.payload;
      }
    });
  },
});

export const { setCurrentBoard, clearCurrentBoard } = boardSlice.actions;

export default boardSlice.reducer;
