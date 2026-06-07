import User from '../model/userModel.js';
import genToken from '../configFiles/token.js';
import bycrypt from 'bcryptjs';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';

export const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "Email is already registered"
            });
        }

        let nameExists = await User.findOne({ name });
        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Username is already taken"
            });
        }

        let hashedPassword = await bycrypt.hash(password, 10);
        user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        const token = genToken(user._id);
        const safeUser = user.toObject();
        delete safeUser.password;

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: encryptUserIds(safeUser),
            token
        });

    } catch (err) {
        console.log("ERROR => ", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/Username and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            $or: [{ email: normalizedEmail }, { name: email }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: `Your account has been blocked. Reason: ${user.reason || 'No reason specified'}`
            });
        }

        const isMatch = await bycrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = genToken(user._id);
        const safeUser = user.toObject();
        delete safeUser.password;

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: encryptUserIds(safeUser),
            token
        });
    } catch (err) {
        console.log("ERROR => ", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const userId = req.userId;
        const { boardId, taskId } = req.query;

        if (boardId) {
            const board = await Board.findById(boardId).populate('members', '-password').populate('createdBy', '-password');
            if (!board) {
                return res.status(404).json({ message: 'Board not found' });
            }
            const isMember = board.createdBy._id.toString() === userId || board.members.some(m => m._id.toString() === userId);
            if (!isMember) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
            const membersList = [board.createdBy, ...board.members];
            const uniqueMembers = Array.from(new Map(membersList.map(m => [m._id.toString(), m])).values());
            return res.status(200).json({
                message: "Board members retrieved successfully",
                users: uniqueMembers.map(m => encryptUserIds(m))
            });
        }

        if (taskId) {
            const task = await Task.findById(taskId).populate('collaborators', '-password').populate('assignedTo', '-password');
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }
            const board = await Board.findById(task.boardId);
            if (!board) {
                return res.status(404).json({ message: 'Board not found' });
            }
            const isMember = board.createdBy.toString() === userId || board.members.some(m => m.toString() === userId);
            if (!isMember) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
            const collabsList = [...(task.collaborators || [])];
            if (task.assignedTo) collabsList.push(task.assignedTo);
            const uniqueCollabs = Array.from(new Map(collabsList.map(c => [c._id.toString(), c])).values());
            return res.status(200).json({
                message: "Task collaborators retrieved successfully",
                users: uniqueCollabs.map(c => encryptUserIds(c))
            });
        }

        const boards = await Board.find({
            $or: [{ createdBy: userId }, { members: userId }]
        });
        const boardIds = boards.map(b => b._id);
        const memberUserIds = new Set();
        boards.forEach(b => {
            memberUserIds.add(b.createdBy.toString());
            b.members.forEach(m => memberUserIds.add(m.toString()));
        });

        const tasks = await Task.find({ boardId: { $in: boardIds } });
        const collaboratorUserIds = new Set();
        tasks.forEach(t => {
            if (t.collaborators) {
                t.collaborators.forEach(c => collaboratorUserIds.add(c.toString()));
            }
            if (t.assignedTo) {
                collaboratorUserIds.add(t.assignedTo.toString());
            }
        });

        const allowedUserIds = Array.from(new Set([...memberUserIds, ...collaboratorUserIds]));
        const users = await User.find({ _id: { $in: allowedUserIds } }).select('-password');

        return res.status(200).json({
            message: "Users retrieved successfully",
            users: users.map(u => encryptUserIds(u))
        });

    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            message: 'Current user fetched successfully',
            user: encryptUserIds(user),
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};

export const getUserByID = async (req, res) => {
    try {

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User retrieved successfully",
            user: encryptUserIds(user)
        });

    } catch (err) {

        return res.status(500).json({
            message: err.message
        });
    }
};

export const LogoutUser = async (req, res) => {
    try {

        res.clearCookie("token");

        return res.status(200).json({
            message: "User logged out successfully"
        });

    } catch (err) {

        return res.status(500).json({
            message: err.message
        });
    }
};

export const blockUser = async (req, res) => {
    try {
        if (req.user?.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Owner permissions required"
            });
        }

        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role === 'OWNER') {
            return res.status(400).json({
                success: false,
                message: "Cannot block an owner account"
            });
        }

        user.isBlocked = true;
        user.reason = reason || "Violating workspace policy";
        user.blockedAt = new Date();
        await user.save();

        // Realtime eviction: force disconnect active socket connections
        import('../socket/socket.js').then(({ forceDisconnectUser }) => {
            forceDisconnectUser(userId, user.reason);
        }).catch(err => {
            console.error("Failed to import socket to force disconnect:", err);
        });

        return res.status(200).json({
            success: true,
            message: "User blocked successfully",
            user: encryptUserIds(user)
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const unblockUser = async (req, res) => {
    try {
        if (req.user?.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Owner permissions required"
            });
        }

        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.isBlocked = false;
        user.reason = undefined;
        user.blockedAt = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "User unblocked successfully",
            user: encryptUserIds(user)
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};