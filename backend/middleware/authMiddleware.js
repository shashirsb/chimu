// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

exports.authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ error: 'User not found or inactive.' });
    if (!user.active) return res.status(403).json({ error: 'User account inactive.' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access forbidden: insufficient privileges' });
    }

    next();
  };
};


// Verify JWT
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Missing or invalid token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info (id, roles, username)
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Restrict to specific roles
exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const hasAccess = req.user.roles.some(role => allowedRoles.includes(role));
  if (!hasAccess) return res.status(403).json({ message: 'Access denied' });
  next();
};
