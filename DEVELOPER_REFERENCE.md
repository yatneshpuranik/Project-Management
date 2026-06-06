# Developer Quick Reference - MERN Kanban Board

## 🚀 Quick Commands

### Server
```bash
cd server
npm run dev          # Start development server
npm install          # Install dependencies
```

### Client
```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
```

---

## 📦 File Locations Quick Reference

### Backend Controllers
- **Board Logic**: `server/controller/boardController.js`
- **Task Logic**: `server/controller/taskController.js`
- **User Logic**: `server/controller/userController.js`

### Backend Routes
- **Board Routes**: `server/route/boardRoute.js`
- **Task Routes**: `server/route/taskRoute.js`
- **User Routes**: `server/route/userRoute.js`

### Backend Models
- **Board Model**: `server/model/board.js`
- **Task Model**: `server/model/task.js`
- **User Model**: `server/model/userModel.js`

### Frontend Components
- **Board**: `client/components/Board.jsx`
- **Column**: `client/components/Column.jsx`
- **TaskCard**: `client/components/TaskCard.jsx`
- **Navbar**: `client/components/Navbar.jsx`
- **Profile**: `client/components/Profile.jsx`

### Frontend Redux
- **Store Config**: `client/redux/store.js`
- **Task State**: `client/redux/taskSlice.js`
- **Board State**: `client/redux/boardSlice.js`

### Frontend Utils
- **Axios Config**: `client/utils/axiosInstance.js`
- **Socket Config**: `client/utils/socket.js`

---

## 🔄 Common Development Tasks

### Adding a New API Endpoint

1. **Create Controller Method**
```javascript
// server/controller/taskController.js
export const myNewAction = async (req, res) => {
  try {
    // Your logic here
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};
```

2. **Add Route**
```javascript
// server/route/taskRoute.js
router.post('/my-action', myNewAction);
```

3. **Create Redux Async Thunk**
```javascript
// client/redux/taskSlice.js
export const myNewAction = createAsyncThunk(
  'tasks/myNewAction',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/tasks/my-action', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);
```

4. **Add Reducer**
```javascript
// In extraReducers
builder.addCase(myNewAction.fulfilled, (state, action) => {
  // Update state
});
```

### Adding a Socket Event

1. **Server Handler**
```javascript
// server/socket/socket.js
socket.on('my-event', (data) => {
  const { boardId } = data;
  const room = `board-${boardId}`;
  io.to(room).emit('my-event-response', { /* response data */ });
});
```

2. **Client Listener**
```javascript
// In any component
useEffect(() => {
  socket.on('my-event-response', (data) => {
    // Handle response
  });
}, []);
```

---

## 🎨 Tailwind CSS Common Classes

### Layout
```css
/* Flexbox */
flex flex-row flex-col justify-between items-center

/* Grid */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6

/* Spacing */
p-4 px-6 py-3 m-2 mb-4 mt-8
```

### Colors
```css
/* Background */
bg-slate-800 bg-blue-600 bg-green-500 bg-red-500

/* Text */
text-white text-slate-400 text-blue-400

/* Border */
border border-slate-600 border-blue-500 rounded-lg
```

### Hover States
```css
hover:bg-blue-700 hover:text-white hover:shadow-lg
```

### Responsive
```css
/* Mobile-first */
w-full md:w-1/2 lg:w-1/3

/* Breakpoints */
sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
```

---

## 📝 Redux Pattern Examples

### Dispatching Action
```javascript
import { useDispatch } from 'react-redux';
import { createTask } from '../redux/taskSlice';

const dispatch = useDispatch();

// Dispatch async thunk
dispatch(createTask(taskData)).then(result => {
  if (createTask.fulfilled.match(result)) {
    console.log('Success:', result.payload);
  }
});
```

### Selecting State
```javascript
import { useSelector } from 'react-redux';

const { tasks, loading, error } = useSelector(state => state.tasks);
const { boards, currentBoard } = useSelector(state => state.boards);
```

### Updating Local State
```javascript
dispatch(addTaskLocally(newTask));
dispatch(updateTaskLocally(updatedTask));
dispatch(deleteTaskLocally(taskId));
```

---

## 🔗 API Call Pattern

```javascript
// Using axiosInstance with JWT auto-attach
try {
  const response = await axiosInstance.post('/tasks', {
    title: 'New Task',
    description: 'Description',
    boardId: 'board-123'
  });
  
  console.log(response.data);
} catch (error) {
  console.error(error.response?.data?.message);
}
```

---

## 💾 Socket Event Pattern

```javascript
// Emit event
socket.emit('task-created', {
  boardId: 'board-123',
  task: taskObject
});

// Listen for event
useEffect(() => {
  socket.on('task-updated', (data) => {
    dispatch(updateTaskLocally(data.task));
  });

  return () => {
    socket.off('task-updated');
  };
}, [dispatch]);
```

---

## 🧪 Testing Components

### Test Board Creation
```javascript
// 1. Login
// 2. Click "New Board"
// 3. Fill in title and description
// 4. Click "Create Board"
// 5. Verify board appears in list
// 6. Click to open board
```

### Test Task Drag-Drop
```javascript
// 1. Open board
// 2. Create task (appears in Todo)
// 3. Drag task to "In Progress"
// 4. Verify status changes in Redux store
// 5. Verify status changes in other connected clients
```

### Test Real-time Sync
```javascript
// 1. Open same board in 2 browser windows
// 2. Create task in window 1
// 3. Verify it appears instantly in window 2
// 4. Edit task in window 2
// 5. Verify update appears in window 1
```

---

## 🔍 Debugging Tips

### Redux DevTools
```javascript
// Install Redux DevTools browser extension
// Open DevTools -> Redux tab
// See all state changes and time travel
```

### Socket Debug
```javascript
// In client/utils/socket.js
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('error', (err) => console.error('Socket error:', err));
```

### API Debug
```javascript
// In client/utils/axiosInstance.js
axiosInstance.interceptors.response.use(
  res => { console.log('API Response:', res); return res; },
  err => { console.error('API Error:', err); return Promise.reject(err); }
);
```

---

## 📋 Priority Levels

| Level | Color | Severity |
|-------|-------|----------|
| Low | Green (bg-green-500) | 🟢 |
| Medium | Yellow (bg-yellow-500) | 🟡 |
| High | Red (bg-red-500) | 🔴 |

---

## 📊 Task Statuses

| Status | Column | Purpose |
|--------|--------|---------|
| Todo | First | New/Unstarted tasks |
| In Progress | Second | Currently being worked on |
| Review | Third | Awaiting review/approval |
| Done | Fourth | Completed tasks |

---

## 🔐 Auth Flow

```
1. User logs in
2. Backend returns JWT token
3. Token stored in localStorage
4. axiosInstance adds token to all requests
5. Server validates token in auth middleware
6. Protected routes accessible
```

---

## 📲 Real-time Flow

```
Client                              Server
  |                                   |
  |------ join-board event ----------->|
  |                                   |
  |<---- online-users event ----------|
  |                                   |
  |------ task-created event -------->|
  |                                   |--- Broadcast to room
  |<---- task-created event ---------|
  |<---- (all users get update)
  |                                   |
```

---

## 🚨 Error Handling

### Server Error Response
```javascript
{
  message: "Error description",
  error: "Error details"
}
```

### Handling in Component
```javascript
try {
  await dispatch(createTask(data));
} catch (error) {
  // Automatic error handling via thunk rejection
  const errorMsg = error.payload || 'Unknown error';
  setError(errorMsg);
}
```

---

## 📚 File Sizes & Structure

| Component | Lines | Complexity |
|-----------|-------|-----------|
| Board.jsx | ~100 | Medium |
| Column.jsx | ~80 | Low |
| TaskCard.jsx | ~100 | Medium |
| taskSlice.js | ~180 | High |
| boardController.js | ~200 | High |

---

## 🔄 Data Flow Diagram

```
User Action (Click, Drag, Type)
        ↓
React Component Handler
        ↓
Redux Dispatch (Thunk)
        ↓
API Call (axiosInstance)
        ↓
Backend Processing
        ↓
Redux State Update
        ↓
Socket.io Broadcast
        ↓
Other Clients Update
        ↓
UI Re-render
```

---

## ✅ Deployment Checklist

- [ ] Set environment variables
- [ ] Update API URLs
- [ ] Enable HTTPS
- [ ] Setup MongoDB Atlas
- [ ] Configure CORS properly
- [ ] Add error logging
- [ ] Setup monitoring
- [ ] Test all features
- [ ] Backup database
- [ ] Setup CI/CD

---

## 📞 Quick Support

| Issue | Solution |
|-------|----------|
| Socket won't connect | Check server is running on port 5000 |
| Tasks not syncing | Check Socket.io events in browser console |
| API 401 errors | Verify JWT token is stored and being sent |
| Mongo connection fails | Check MONGODB_URI in .env |
| Drag-drop broken | Check console for JavaScript errors |

---

**Last Updated**: 2024
**Version**: 1.0
