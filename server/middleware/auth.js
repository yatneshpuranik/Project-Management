import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';
import { decryptRequestData } from '../utils/idCrypt.js';


export const authenticateToken = async (req, res, next) => {
  try {
    
    const headerToken = req.headers.authorization?.split(' ')[1];
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;

    if (req.params) {
      req.params = decryptRequestData(req.params);
    }

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      try {
        res.clearCookie && res.clearCookie('token');
      } catch (e) {}
      return res.status(401).json({ message: 'Authentication failed: User not found' });
    }

    if (user.isBlocked) {
      try {
        res.clearCookie && res.clearCookie('token');
      } catch (e) {}
      return res.status(403).json({ message: 'Your account has been blocked', isBlocked: true });
    }

    req.userName = user.name;
    req.user = user;
    next();
  } catch (error) {
    // Clear cookie when token invalid/expired to avoid persistent bad cookie
    try {
      res.clearCookie && res.clearCookie('token');
    } catch (e) {
      // ignore
    }
    return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};
