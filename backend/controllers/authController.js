// server/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    if (!user.active) return res.status(403).json({ error: 'User account inactive' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user._id, 
        username: user.username,
        roles: user.roles },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        region: user.region,
        accountIds: user.accountIds.map((acc) => ({
          _id: acc._id,
          name: acc.name,
        })),
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};



exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, roles: user.roles, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        region: user.region,
        accountIds: user.accountIds,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
