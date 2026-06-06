# MERN Kanban Board - Real-Time Collaborative Task Manager

![Kanban Board](https://img.shields.io/badge/React-Vite-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green) ![Real-time](https://img.shields.io/badge/Real--time-Socket.io-red)

A modern, full-stack web application for creating and managing collaborative Kanban boards with real-time synchronization, drag-and-drop task management, and multi-user collaboration.

## 🎯 Features

### Core Features
- **✅ Real-Time Collaboration** - See changes instantly across all connected users
- **✅ Drag & Drop** - Seamlessly move tasks between columns
- **✅ Task Management** - Create, edit, delete, and organize tasks
- **✅ Priority Levels** - Categorize tasks by priority (Low, Medium, High)
- **✅ Multiple Statuses** - Todo, In Progress, Review, Done
- **✅ User Profiles** - User authentication and profile management
- **✅ Board Members** - Add/remove collaborators to boards
- **✅ Responsive Design** - Works on desktop, tablet, and mobile

### Advanced Features
- **🔔 Online Status** - See who's currently viewing the board
- **✍️ Typing Indicators** - Know when someone is editing a task
- **💬 Comments** - Add comments to tasks for discussion
- **📅 Due Dates** - Set and track task deadlines
- **👥 Task Assignment** - Assign tasks to team members
- **⏰ Real-time Sync** - Automatic sync with WebSocket
- **🔐 Secure Access** - JWT-based authentication
- **🎨 Modern UI** - Beautiful dark theme with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React** (Vite) - UI library with lightning-fast HMR
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM (Object Data Modeling)
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication

## 📁 Project Structure

```
kanban-board/
├── server/                      # Backend Node.js + Express
│   ├── configFiles/
│   │   ├── db.js               # MongoDB connection
│   │   └── token.js            # JWT utilities
│   ├── controller/
│   │   ├── boardController.js  # Board CRUD operations
│   │   ├── taskController.js   # Task CRUD operations
│   │   └── userController.js   # User management
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── model/
│   │   ├── board.js            # Board schema
│   │   ├── task.js             # Task schema
│   │   └── userModel.js        # User schema
│   ├── route/
│   │   ├── boardRoute.js       # Board endpoints
│   │   ├── taskRoute.js        # Task endpoints
│   │   └── userRoute.js        # User endpoints
│   ├── socket/
│   │   └── socket.js           # Socket.io event handlers
│   ├── .env.example            # Environment template
│   ├── index.js                # Server entry point
│   └── package.json
│
├── client/                      # Frontend React + Vite
│   ├── components/
│   │   ├── Navbar.jsx          # Navigation component
│   │   ├── Profile.jsx         # User profile page
│   │   ├── Board.jsx           # Main Kanban board
│   │   ├── Column.jsx          # Board column/status
│   │   ├── TaskCard.jsx        # Individual task card
│   │   ├── CreateTaskModal.jsx # Create task dialog
│   │   └── EditTaskModal.jsx   # Edit task dialog
│   ├── redux/
│   │   ├── store.js            # Redux store configuration
│   │   ├── taskSlice.js        # Task state management
│   │   ├── boardSlice.js       # Board state management
│   │   └── userSlice.js        # User state management
│   ├── utils/
│   │   ├── axiosInstance.js    # Configured axios with auth
│   │   └── socket.js           # Socket.io client
│   ├── src/
│   │   ├── screens/
│   │   │   └── Dashboard.jsx   # Board dashboard
│   │   ├── App.jsx             # Main app component
│   │   ├── index.css           # Global styles
│   │   ├── main.jsx            # App entry point
│   │   └── assets/             # Images, fonts, etc
│   ├── .env.example            # Environment template
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── SETUP_GUIDE.md              # Installation guide
├── README.md                   # This file
└── .gitignore
```

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- MongoDB (Local or Atlas)
- npm or yarn

### Installation

1. **Clone the Repository**
```bash
git clone <repository-url>
cd kanban-board
```

2. **Setup Server**
```bash
cd server
npm install
npm install socket.io http
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. **Setup Client**
```bash
cd client
npm install
npm install socket.io-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

4. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📚 API Documentation

### Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <your-jwt-token>
```

### Board Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/boards` | Create new board |
| GET | `/api/boards` | Get all user's boards |
| GET | `/api/boards/:boardId` | Get specific board |
| PUT | `/api/boards/:boardId` | Update board details |
| DELETE | `/api/boards/:boardId` | Delete board |
| POST | `/api/boards/:boardId/members` | Add member to board |
| DELETE | `/api/boards/:boardId/members/:memberId` | Remove member |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/board/:boardId` | Get board's tasks |
| GET | `/api/tasks/:taskId` | Get specific task |
| PUT | `/api/tasks/:taskId` | Update task |
| PATCH | `/api/tasks/:taskId/move` | Move task (change status) |
| DELETE | `/api/tasks/:taskId` | Delete task |
| POST | `/api/tasks/:taskId/comments` | Add comment to task |

## 🔌 Socket.io Events

### Client → Server Events
```javascript
// Join board room
socket.emit('join-board', { boardId, userId, userName });

// Leave board room
socket.emit('leave-board', { boardId, userId });

// Real-time task updates
socket.emit('task-created', { boardId, task });
socket.emit('task-updated', { boardId, task });
socket.emit('task-deleted', { boardId, taskId });
socket.emit('task-moved', { boardId, task, fromStatus, toStatus });

// Typing indicators
socket.emit('typing-start', { boardId, userId, userName, taskId });
socket.emit('typing-stop', { boardId, userId, taskId });

// Comments
socket.emit('comment-added', { boardId, taskId, comment });
```

### Server → Client Events
```javascript
// Receive online users list
socket.on('online-users', (data) => {
  // data.users = [{ userName, socketId }]
});

// Receive real-time updates
socket.on('task-created', (data) => { /* data.task */ });
socket.on('task-updated', (data) => { /* data.task */ });
socket.on('task-deleted', (data) => { /* data.taskId */ });
socket.on('task-moved', (data) => { /* data.task, fromStatus, toStatus */ });
```

## 📊 Database Schema

### Board Schema
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  createdBy: ObjectId,    // Reference to User
  members: [ObjectId],    // Array of User IDs
  isArchived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Task Schema
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  priority: "Low" | "Medium" | "High",
  dueDate: Date,
  assignedTo: ObjectId,   // Reference to User
  status: "Todo" | "In Progress" | "Review" | "Done",
  boardId: ObjectId,      // Reference to Board
  position: Number,
  attachments: [{
    url: String,
    name: String
  }],
  comments: [{
    userId: ObjectId,
    text: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🎨 UI Components Guide

### Navbar Component
- User profile dropdown
- Navigation links
- Logout functionality
- Mobile-responsive hamburger menu

### Board Component
- Display all task columns
- Show online users count
- Create new task button
- Manage board state

### Column Component
- Display tasks by status
- Drag-over highlighting
- Drop zone for tasks
- Task count display

### TaskCard Component
- Display task information
- Drag handle for reordering
- Edit and delete buttons
- Priority badge
- Due date display
- Assigned user info

### Modals
- **CreateTaskModal**: Form to create new tasks
- **EditTaskModal**: Form to edit existing tasks

## 🔄 Redux State Management

### taskSlice
```javascript
state = {
  tasks: [],              // Array of task objects
  loading: false,         // Loading state
  error: null,            // Error message
  onlineUsers: [],        // Active users in board
  editingUsers: {}        // Users currently editing tasks
}
```

### boardSlice
```javascript
state = {
  boards: [],             // Array of board objects
  currentBoard: null,     // Currently selected board
  loading: false,
  error: null
}
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs for password security
- **CORS Protection** - Whitelist allowed origins
- **Authorization Checks** - Verify user permissions
- **Input Validation** - Sanitize all inputs
- **Secure Headers** - Security headers configured

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create a new board
- [ ] Add members to board
- [ ] Create tasks with different priorities
- [ ] Drag tasks between columns
- [ ] Edit task details
- [ ] Delete tasks
- [ ] Test with multiple users (multiple browser windows)
- [ ] Verify real-time synchronization
- [ ] Test permission restrictions
- [ ] Test responsiveness on mobile

## 📱 Browser Support

- Chrome (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## ⚙️ Environment Variables

### Server (.env)
```
MONGODB_URI=mongodb://localhost:27017/kanban-board
JWT_SECRET=your-secret-key
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Client (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🚨 Common Issues & Solutions

### Socket Connection Failed
- **Issue**: WebSocket connection refuses
- **Solution**: Ensure server is running and CORS is configured

### Tasks Not Loading
- **Issue**: Redux store shows empty tasks
- **Solution**: Check Redux DevTools, verify API response in Network tab

### Drag-Drop Not Working
- **Issue**: Tasks can't be moved between columns
- **Solution**: Check browser console for JavaScript errors, verify CSS

### MongoDB Connection Error
- **Issue**: Cannot connect to database
- **Solution**: Verify MongoDB URI, ensure MongoDB service is running

## 📈 Performance Optimization

- Redux selectors memoization
- Component lazy loading
- Image optimization
- Socket room management
- Database indexing
- Connection pooling

## 🎯 Future Enhancements

- [ ] Activity timeline/audit log
- [ ] Desktop notifications
- [ ] File attachments with S3
- [ ] Advanced filtering and search
- [ ] Task templates
- [ ] Recurring tasks
- [ ] Integration with Slack/GitHub
- [ ] Mobile app (React Native)
- [ ] Export to PDF/CSV
- [ ] API rate limiting

## 📜 License

This project is licensed under the MIT License.

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@example.com or open an issue in the repository.

## 🙏 Acknowledgments

- React and Vite communities
- Socket.io developers
- MongoDB documentation
- Tailwind CSS team

---

**Made with ❤️ for Real-Time Collaboration**
