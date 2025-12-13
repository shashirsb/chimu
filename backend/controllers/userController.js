const User = require('../models/User');
const mongoose = require('mongoose');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUsersByAccount = async (req, res) => {
  try {

    const { accountId } = req.params;
    const objectId = new mongoose.Types.ObjectId(accountId);

    const users = await User.find({ "accountIds._id": objectId })
      .select('displayName _id');
      
    res.json(users);
  } catch (err) {
    console.error('Error fetching users by account:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;

    // If password is present, hash it (like in create)
    if (updates.password) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
