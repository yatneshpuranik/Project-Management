import { configureStore } from '@reduxjs/toolkit';
import userSlice from './userSlice.js';
import taskSlice from './taskSlice.js';
import boardSlice from './boardSlice.js';

const store = configureStore({
  reducer: {
    user: userSlice,
    tasks: taskSlice,
    boards: boardSlice,
  },
});

export default store;