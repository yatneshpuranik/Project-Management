import User from '../model/userModel.js';
import genToken from '../configFiles/token.js';
import bycrypt from 'bcryptjs';
import Board from '../model/board.js';
import Task from '../model/task.js';
import AuditLog from '../model/auditLog.js';
import { encryptUserIds, encryptId, decryptId } from '../utils/idCrypt.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendVerificationEmail, sendInvitationStatusEmail } from '../utils/emailService.js';

export const createUser = async (req, res) => {
    try {
        const { name, email, password, invitationToken } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (invitationToken) {
            let user = await User.findOne({ invitationToken, isRegistered: false });
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid invitation token or user already registered."
                });
            }
            if (user.email !== normalizedEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email does not match the invitation email."
                });
            }
            const hashedPassword = await bycrypt.hash(password, 10);
            user.name = name;
            user.password = hashedPassword;
            user.isRegistered = true;
            user.isVerified = true; // Invite link acts as verification
            user.invitationToken = undefined;
            
            const boardId = user.invitedToBoard;
            user.invitedToBoard = undefined;
            await user.save();

            // Auto-accept invitation
            if (boardId) {
                const board = await Board.findById(boardId);
                if (board) {
                    if (!board.members.some(m => m.toString() === user._id.toString())) {
                        board.members.push(user._id);
                        await board.save();
                    }
                    // Find pending board invite notification
                    const Notification = mongoose.model('Notification');
                    const inviteNotification = await Notification.findOne({
                        recipient: user._id,
                        boardId: boardId,
                        type: 'board_invite',
                        status: 'pending'
                    });
                    if (inviteNotification) {
                        inviteNotification.status = 'accepted';
                        await inviteNotification.save();

                        // Notify owner
                        const owner = await User.findById(board.createdBy);
                        if (owner) {
                            // Create acceptance notification for owner
                            const approvalNotification = new Notification({
                                recipient: board.createdBy,
                                sender: user._id,
                                senderName: user.name,
                                type: 'board_invite',
                                status: 'accepted',
                                boardId: board._id,
                                boardTitle: board.title,
                                message: `${user.name} accepted your invitation to join workspace: "${board.title}"`,
                            });
                            await approvalNotification.save();
                            
                            // Send emails
                            await sendInvitationStatusEmail('accepted', owner.email, owner.name, user.email, user.name, board.title);
                            
                            // Emit socket events
                            try {
                                const { emitToUser } = await import('../socket/socket.js');
                                emitToUser(board.createdBy, 'invitationSent', {
                                    recipientId: encryptId(board.createdBy),
                                    notification: encryptUserIds(approvalNotification),
                                });
                            } catch (err) {
                                console.error('Socket accept invite emit error:', err);
                            }
                        }
                    }
                }
            }

            // Log User Created Audit
            await AuditLog.create({
                action: 'User Registered via Invite',
                actorId: user._id,
                actorName: user.name,
                details: `User registered via invitation for board: ${boardId}`,
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
            }).catch(e => { });

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
        }

        if (normalizedEmail.endsWith('@asadmin.com') || normalizedEmail.endsWith('@admin.com')) {
            return res.status(400).json({
                success: false,
                message: "Registration with this domain is not permitted."
            });
        }

        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            if (!user.isRegistered) {
                return res.status(400).json({
                    success: false,
                    message: "This email has a pending invitation. Please use the link in the invitation email to register."
                });
            }
            if (!user.isVerified) {
                const newVerificationToken = crypto.randomBytes(32).toString('hex');
                user.verificationToken = newVerificationToken;
                user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
                user.name = name;
                user.password = await bycrypt.hash(password, 10);
                await user.save();

                await sendVerificationEmail(user.email, user.name, newVerificationToken);

                return res.status(201).json({
                    success: true,
                    isUnverified: true,
                    message: "This account is already registered but has not been verified. A new verification email has been sent."
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Email already registered. Please login."
                });
            }
        }

        let nameExists = await User.findOne({ name });
        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Username is already taken"
            });
        }

        let hashedPassword = await bycrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

        user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            isVerified: false,
            isRegistered: true,
            verificationToken,
            verificationExpires
        });

        // Log User Created Audit
        await AuditLog.create({
            action: 'User Created',
            actorId: user._id,
            actorName: user.name,
            details: `User registered with email: ${user.email} (Pending verification)`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
        }).catch(e => { });

        // Send verification email
        await sendVerificationEmail(user.email, user.name, verificationToken);

        return res.status(201).json({
            success: true,
            isUnverified: true,
            message: "Registration successful! Please check your email to verify your account."
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
        const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const caseInsensitiveRegex = new RegExp(`^${escapedEmail}$`, 'i');
        const user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { name: { $regex: caseInsensitiveRegex } },
                { username: { $regex: caseInsensitiveRegex } }
            ]
        });

        if (!user) {
            // Log failed login
            await AuditLog.create({
                action: 'Failed Login',
                actorId: new mongoose.Types.ObjectId("000000000000000000000000"),
                actorName: email,
                details: `Login attempt failed: user not found`,
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
            }).catch(e => { });

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
            // Log failed login
            await AuditLog.create({
                action: 'Failed Login',
                actorId: user._id,
                actorName: user.name,
                details: `Login attempt failed: invalid password`,
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
            }).catch(e => { });

            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                isUnverified: true,
                message: "Please verify your email."
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
        const currentRole = req.user?.role;
        const isAdminRequester = currentRole === 'ADMIN';

        if (boardId) {
            if (!mongoose.Types.ObjectId.isValid(boardId)) {
                return res.status(400).json({ message: 'Invalid board ID format' });
            }
            const board = await Board.findById(boardId).populate('members', '-password').populate('createdBy', '-password');
            if (!board) {
                return res.status(404).json({ message: 'Board not found' });
            }
            const isMember = board.createdBy._id.toString() === userId || board.members.some(m => m._id.toString() === userId);
            if (!isMember && !isAdminRequester) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
            let membersList = [board.createdBy, ...board.members].filter(Boolean);
            if (!isAdminRequester) {
                membersList = membersList.filter(m => m.role !== 'ADMIN');
            }
            const uniqueMembers = Array.from(new Map(membersList.map(m => [m._id.toString(), m])).values());
            return res.status(200).json({
                message: "Board members retrieved successfully",
                users: uniqueMembers.map(m => encryptUserIds(m))
            });
        }

        if (taskId) {
            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json({ message: 'Invalid task ID format' });
            }
            const task = await Task.findById(taskId).populate('collaborators', '-password').populate('assignedTo', '-password');
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }
            const board = await Board.findById(task.boardId);
            if (!board) {
                return res.status(404).json({ message: 'Board not found' });
            }
            const isMember = board.createdBy.toString() === userId || board.members.some(m => m.toString() === userId);
            if (!isMember && !isAdminRequester) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
            let collabsList = [...(task.collaborators || [])];
            if (task.assignedTo) collabsList.push(task.assignedTo);
            collabsList = collabsList.filter(Boolean);
            if (!isAdminRequester) {
                collabsList = collabsList.filter(c => c.role !== 'ADMIN');
            }
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
        const query = { _id: { $in: allowedUserIds } };
        if (!isAdminRequester) {
            query.role = { $ne: 'ADMIN' };
        }
        const users = await User.find(query).select('-password -verificationToken -verificationExpires -invitationToken');

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
        const user = await User.findById(req.userId).select('-password -verificationToken -verificationExpires -invitationToken');

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
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        const user = await User.findById(id).select('-password -verificationToken -verificationExpires -invitationToken');

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
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admin permissions required"
            });
        }

        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role === 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: "Cannot block an admin account"
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
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admin permissions required"
            });
        }

        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }

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

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const boardId = req.query.boardId;
        if (!q || !q.trim()) {
            return res.status(200).json({
                success: true,
                users: []
            });
        }

        const searchQuery = q.trim();
        const Notification = (await import('../model/notification.js')).default;

        let board = null;
        let excludeIds = [req.userId];
        let decBoardId = boardId;

        if (boardId) {
            decBoardId = decryptId(boardId);
            if (!mongoose.Types.ObjectId.isValid(decBoardId)) {
                return res.status(400).json({ success: false, message: 'Invalid board ID format' });
            }
            board = await Board.findById(decBoardId);
            if (board) {
                if (board.createdBy) excludeIds.push(board.createdBy.toString());
                if (board.members) {
                    board.members.forEach(m => excludeIds.push(m.toString()));
                }
            }

            // Exclude pending board invites
            const pendingInvites = await Notification.find({
                boardId: decBoardId,
                type: 'board_invite',
                status: 'pending'
            });
            pendingInvites.forEach(n => excludeIds.push(n.recipient.toString()));
        }

        const queryCond = {
            _id: { $nin: excludeIds },
            isBlocked: { $ne: true },
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        // Exclude admins from the search if requester is not ADMIN
        if (req.user?.role !== 'ADMIN') {
            queryCond.role = { $ne: 'ADMIN' };
        }

        const users = await User.find(queryCond)
            .select('name email role avatar')
            .limit(10);

        const safeUsers = users.map(user => {
            const u = user.toObject();
            const encryptedUser = encryptUserIds(u);
            encryptedUser.inviteStatus = 'none'; // already filtered out pendings, so it is always none
            encryptedUser.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
            return encryptedUser;
        });

        return res.status(200).json({
            success: true,
            users: safeUsers
        });
    } catch (err) {
        console.error("Error searching users:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const promoteUser = async (req, res) => {
    try {
        const currentRole = req.user?.role;
        if (currentRole !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin permissions required' });
        }

        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.email === 'yatneshpuranik@asadmin.com') {
            return res.status(400).json({ success: false, message: 'Cannot modify platform role of the permanent administrator account' });
        }

        user.role = 'ADMIN';
        await user.save();

        // Create notification
        try {
            const Notification = mongoose.model('Notification');
            const notif = new Notification({
                recipient: userId,
                sender: req.userId,
                senderName: req.userName || 'Admin',
                type: 'role_change',
                status: 'unread',
                message: `Your platform role was changed to ADMIN by the administrator`,
            });
            await notif.save();
            const { emitToUser } = await import('../socket/socket.js');
            emitToUser(userId, 'invitationSent', {
                recipientId: encryptId(userId),
                notification: encryptUserIds(notif)
            });
        } catch (e) {
            console.error('Error creating promotion notification:', e);
        }

        return res.status(200).json({
            success: true,
            message: 'User promoted to Admin successfully',
            user: encryptUserIds(user)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const demoteUser = async (req, res) => {
    try {
        const currentRole = req.user?.role;
        if (currentRole !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin permissions required' });
        }

        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.email === 'yatneshpuranik@asadmin.com') {
            return res.status(400).json({ success: false, message: 'Cannot modify platform role of the permanent administrator account' });
        }

        if (user.email && user.email.endsWith('@admin.com')) {
            return res.status(400).json({ success: false, message: 'Cannot demote an admin account' });
        }

        user.role = 'USER';
        await user.save();

        // Create notification
        try {
            const Notification = mongoose.model('Notification');
            const notif = new Notification({
                recipient: userId,
                sender: req.userId,
                senderName: req.userName || 'Admin',
                type: 'role_change',
                status: 'unread',
                message: `Your platform role was changed to USER by the administrator`,
            });
            await notif.save();
            const { emitToUser } = await import('../socket/socket.js');
            emitToUser(userId, 'invitationSent', {
                recipientId: encryptId(userId),
                notification: encryptUserIds(notif)
            });
        } catch (e) {
            console.error('Error creating demotion notification:', e);
        }

        return res.status(200).json({
            success: true,
            message: 'User demoted to Member successfully',
            user: encryptUserIds(user)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const updatePresence = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Online', 'Offline', 'Away', 'Busy'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid presence status' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.presenceStatus = status;
        user.lastActive = new Date();
        await user.save();

        // Broadcast presence update via Socket.io
        try {
            const { getIo } = await import('../socket/socket.js');
            const io = getIo();
            if (io) {
                // Find all boards user is a member of to broadcast status change
                const boards = await Board.find({
                    $or: [{ createdBy: req.userId }, { members: req.userId }]
                });
                boards.forEach(b => {
                    io.to(`board-${b._id.toString()}`).emit('presence-update', {
                        userId: encryptId(req.userId),
                        status,
                        lastActive: user.lastActive
                    });
                });
            }
        } catch (e) {
            console.error('Failed to broadcast presence update:', e);
        }

        return res.status(200).json({
            success: true,
            message: 'Presence status updated',
            presenceStatus: status,
            lastActive: user.lastActive
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, username, email, password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent changing admin email
        if (user.email === 'yatneshpuranik@asadmin.com' && email && email.toLowerCase().trim() !== user.email) {
            return res.status(400).json({ success: false, message: 'Cannot modify email of the permanent administrator account' });
        }

        user.name = name.trim();

        if (username && username.trim()) {
            const cleanUsername = username.trim().toLowerCase();
            const usernameExists = await User.findOne({ username: cleanUsername, _id: { $ne: userId } });
            if (usernameExists) {
                return res.status(400).json({ success: false, message: 'Username is already taken' });
            }
            user.username = cleanUsername;
        }

        let emailVerificationNeeded = false;
        let newVerificationToken = '';

        if (email && email.trim()) {
            const normalizedEmail = email.toLowerCase().trim();
            if (normalizedEmail !== user.email) {
                if (normalizedEmail.endsWith('@asadmin.com') || normalizedEmail.endsWith('@admin.com')) {
                    return res.status(400).json({ success: false, message: 'Registration or use of this domain is not permitted.' });
                }
                const emailExists = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
                if (emailExists) {
                    return res.status(400).json({ success: false, message: 'Email is already in use' });
                }
                user.email = normalizedEmail;
                user.isVerified = false;
                newVerificationToken = crypto.randomBytes(32).toString('hex');
                user.verificationToken = newVerificationToken;
                user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
                emailVerificationNeeded = true;
            }
        }

        if (password && password.trim()) {
            user.password = await bycrypt.hash(password.trim(), 10);
        }

        await user.save();

        if (emailVerificationNeeded) {
            await sendVerificationEmail(user.email, user.name, newVerificationToken);
        }

        const safeUser = user.toObject();
        delete safeUser.password;

        return res.status(200).json({
            success: true,
            message: emailVerificationNeeded 
                ? 'Profile updated successfully. A verification email has been sent to your new email address.'
                : 'Profile updated successfully',
            emailVerificationNeeded,
            user: encryptUserIds(safeUser)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Verification token is required.' });
        }

        const userByToken = await User.findOne({ verificationToken: token });

        console.log('--- Verification Lookup ---');
        console.log('Incoming token:', token);
        console.log('Stored verification token:', userByToken?.verificationToken || 'none');
        console.log('Expiry:', userByToken?.verificationExpires || 'none');
        console.log('Current Time:', new Date());
        console.log('Matched user id:', userByToken?._id || 'none');

        if (!userByToken) {
            console.log('Reason for lookup failure: No user found with the given verification token (token has already been used/cleared or is invalid).');
            return res.status(410).json({ success: false, message: 'Verification link already used.' });
        }

        const isExpired = userByToken.verificationExpires && new Date(userByToken.verificationExpires) <= new Date();
        if (isExpired) {
            console.log('Reason for lookup failure: Verification token has expired.');
            return res.status(410).json({ success: false, message: 'Verification link already used.' });
        }

        const user = userByToken;
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        await user.save();

        // Audit Log
        await AuditLog.create({
            action: 'Email Verified',
            actorId: user._id,
            actorName: user.name,
            details: `User email verified: ${user.email}`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
        }).catch(e => { });

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now log in.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User with this email not found.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'This account is already verified.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.verificationToken = token;
        user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        await sendVerificationEmail(user.email, user.name, token);

        return res.status(200).json({
            success: true,
            message: 'Verification email resent successfully! Please check your inbox.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
