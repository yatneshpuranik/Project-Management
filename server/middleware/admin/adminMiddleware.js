export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && !req.user?.email?.endsWith('@admin.com')) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};
