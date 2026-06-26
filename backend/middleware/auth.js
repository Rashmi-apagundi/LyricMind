import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lyricmind_secret_key');

      req.user = await User.findById(decoded.userId).select('-createdAt -updatedAt');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found, unauthorized' });
      }
      next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
