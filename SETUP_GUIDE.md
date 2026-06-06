# MERN Kanban Board - Setup & Installation Guide

## Project Overview
A full-stack real-time collaborative Kanban board application built with MERN stack (MongoDB, Express, React, Node.js) with Socket.io for real-time updates and drag-and-drop functionality.

---

## PREREQUISITES
- Node.js (v16+)
- MongoDB (Local or Atlas)
- npm or yarn

---

## INSTALLATION

### 1. SERVER SETUP

#### Step 1: Install Dependencies
```bash
cd server
npm install socket.io http
```

#### Step 2: Create Environment File (.env)
```
MONGODB_URI=mongodb://localhost:27017/kanban-board
JWT_SECRET=your-secret-key-here
PORT=PORT_NUMBER
FRONTEND_URL= FRONT_END_URL
NODE_ENV=development
```

#### Step 3: Start Server
```bash
npm run dev
```

Server will run on: http://localhost:PORT_NUMBER

---

### 2. CLIENT SETUP

#### Step 1: Install Dependencies
```bash
cd client
npm install socket.io-client tailwindcss postcss autoprefixer
npm install -D tailwindcss postcss autoprefixer
```

#### Step 2: Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

#### Step 3: Update tailwind.config.js
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### Step 4: Update src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### Step 5: Start Client
```bash
npm run dev
```

Client will run on: http://localhost:5173

---

## PROJECT STRUCTURE

### Backend (/server)
```
server/
├── configFiles/
│   ├── db.js (MongoDB connection)
│   └── token.js (JWT utilities)
├── controller/
│   ├── boardController.js (Board CRUD + members)
│   ├── taskController.js (Task CRUD + comments)
│   └── userController.js (User management)
├── middleware/
│   └── auth.js (JWT authentication)
├── model/
│   ├── board.js (Board schema)
│   ├── task.js (Task schema)
│   └── userModel.js (User schema)
├── route/
│   ├── boardRoute.js (Board endpoints)
│   ├── taskRoute.js (Task endpoints)
│   └── userRoute.js (User endpoints)
├── socket/
│   └── socket.js (Socket.io event handlers)
├── index.js (Main server file)
└── package.json
```

### Frontend (/client)
```
client/
├── components/
│   ├── Navbar.jsx
│   ├── Profile.jsx
│   ├── Board.jsx
│   ├── Column.jsx
│   ├── TaskCard.jsx
│   ├── CreateTaskModal.jsx
│   └── EditTaskModal.jsx
├── redux/
│   ├── store.js
│   ├── taskSlice.js
│   ├── boardSlice.js
│   └── userSlice.js
├── utils/
│   ├── axiosInstance.js (Axios with auth)
│   └── socket.js (Socket.io client)
├── src/
│   ├── screens/
│   │   └── Dashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── ...
├── package.json
└── vite.config.js
```

---

## API ENDPOINTS

### Board APIs
- `POST /api/boards` - Create board
- `GET /api/boards` - Get all user's boards
- `GET /api/boards/:boardId` - Get specific board
- `PUT /api/boards/:boardId` - Update board
- `DELETE /api/boards/:boardId` - Delete board
- `POST /api/boards/:boardId/members` - Add member
- `DELETE /api/boards/:boardId/members/:memberId` - Remove member

### Task APIs
- `POST /api/tasks` - Create task
- `GET /api/tasks/board/:boardId` - Get tasks by board
- `GET /api/tasks/:taskId` - Get specific task
- `PUT /api/tasks/:taskId` - Update task
- `PATCH /api/tasks/:taskId/move` - Move task
- `DELETE /api/tasks/:taskId` - Delete task
- `POST /api/tasks/:taskId/comments` - Add comment

---

## SOCKET.IO EVENTS

### Client → Server
- `join-board` - User joins a board
- `leave-board` - User leaves a board
- `task-created` - Task created
- `task-updated` - Task updated
- `task-deleted` - Task deleted
- `task-moved` - Task moved to different status
- `typing-start` - User starts editing
- `typing-stop` - User stops editing
- `comment-added` - Comment added

### Server → Client
- `online-users` - List of online users
- `task-created` - Real-time task creation
- `task-updated` - Real-time task update
- `task-deleted` - Real-time task deletion
- `task-moved` - Real-time task movement
- `typing-start` - Typing indicator
- `typing-stop` - Stop typing indicator
- `comment-added` - Real-time comment

---

## FEATURES

### ✅ Implemented
- [x] User authentication with JWT
- [x] Board creation and management
- [x] Task CRUD operations
- [x] Drag-and-drop between columns
- [x] Real-time sync with Socket.io
- [x] Online users display
- [x] Task priorities (Low, Medium, High)
- [x] Task status tracking (Todo, In Progress, Review, Done)
- [x] Priority badges with colors
- [x] Responsive Tailwind UI
- [x] Redux state management
- [x] API error handling
- [x] Role-based access (creator/members)

### 🔄 Real-time Features
- [x] Live task creation
- [x] Live task updates
- [x] Live task deletion
- [x] Live status changes
- [x] Online member list
- [x] Typing indicators

---

## DATABASE MODELS

### Board Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  createdBy: ObjectId (ref: User),
  members: [ObjectId] (ref: User),
  isArchived: Boolean,
  timestamps: true
}
```

### Task Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  priority: String (enum: Low, Medium, High),
  dueDate: Date,
  assignedTo: ObjectId (ref: User),
  status: String (enum: Todo, In Progress, Review, Done),
  boardId: ObjectId (ref: Board, required),
  position: Number,
  attachments: [{url, name}],
  comments: [{userId, text, createdAt}],
  timestamps: true
}
```

---

## REDUX STATE STRUCTURE

### taskSlice
```javascript
{
  tasks: [],
  loading: false,
  error: null,
  onlineUsers: [],
  editingUsers: {} // { taskId: { userId, userName } }
}
```

### boardSlice
```javascript
{
  boards: [],
  currentBoard: null,
  loading: false,
  error: null
}
```

### userSlice
```javascript
{
  user: null,
  token: null,
  loading: false,
  error: null
}
```

---

## TESTING GUIDELINES

### 1. Test Board Creation
- Create a new board
- Verify it appears in Dashboard
- Check board details

### 2. Test Task Management
- Create tasks with different priorities
- Drag tasks between columns
- Edit task details
- Delete task

### 3. Test Real-time Collaboration
- Open board in multiple tabs/windows
- Create task in one tab
- Verify it appears instantly in other tabs
- Edit and delete to verify sync

### 4. Test Permissions
- Try accessing board as non-member (should fail)
- Add member and verify access
- Remove member and verify access revoked

---

## DEPLOYMENT CHECKLIST

- [ ] Update MongoDB connection string
- [ ] Set JWT_SECRET in production
- [ ] Update FRONTEND_URL for CORS
- [ ] Enable HTTPS for production
- [ ] Set NODE_ENV=production
- [ ] Add error logging
- [ ] Configure rate limiting
- [ ] Add API validation middleware
- [ ] Implement request sanitization
- [ ] Add security headers

---

## TROUBLESHOOTING

### Socket Connection Issues
- Ensure server is running on correct port
- Check CORS settings in server/index.js
- Verify socket.io-client version matches server

### MongoDB Connection Fails
- Check MongoDB URI
- Verify MongoDB service is running
- Check network connectivity

### Tasks Not Loading
- Check Redux store state
- Verify API response format
- Check browser console for errors

### Drag-drop Not Working
- Ensure event handlers are bound correctly
- Check CSS z-index values
- Verify data transfer format

---

## PERFORMANCE OPTIMIZATION

- Use Redux selectors to prevent unnecessary re-renders
- Implement pagination for large task lists
- Add caching layer for frequently accessed boards
- Optimize Socket.io room management
- Use MongoDB indexes for common queries

---

## SECURITY BEST PRACTICES

1. Always verify JWT token in API calls
2. Sanitize user inputs
3. Use HTTPS in production
4. Implement rate limiting
5. Validate all API requests
6. Use environment variables for secrets
7. Implement CORS properly
8. Use parameterized queries

---

## FUTURE ENHANCEMENTS

- [ ] Activity timeline
- [ ] Notifications
- [ ] File attachments
- [ ] Task labels/tags
- [ ] Search functionality
- [ ] Export to PDF
- [ ] Dark/Light mode toggle
- [ ] Mobile app
- [ ] Webhooks
- [ ] API documentation (Swagger)

---

For more information, check individual component and file documentation.
