const Account = require('../models/Account');
const User = require('../models/User');
const mongoose = require('mongoose');

// ==========================
// GET ALL ACCOUNTS
// ==========================
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().lean();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getAccountById = async (req, res) => {
  try {

    const accountId = req.params.id;
    const accounts = await Account.findById(accountId).lean();

    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// ==========================
// CREATE ACCOUNT
// ==========================
exports.createAccount = async (req, res) => {
  try {
    const { mappedUsers = [], ...rest } = req.body;

    // Create the new account
    const account = await Account.create({
      ...rest,
      mappedUsers
    });

    // Add this account to each user.accountIds
    if (mappedUsers.length > 0) {
      await User.updateMany(
        { _id: { $in: mappedUsers } },
        {
          $push: {
            accountIds: {
              _id: account._id,
              name: account.name
            }
          }
        }
      );
    }

    res.json(account);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// ==========================
// UPDATE ACCOUNT
// ==========================
exports.updateAccount = async (req, res) => {
  try {
    const accountId = req.params.id;
    const { mappedUsers = [], ...rest } = req.body;

    const prevAccount = await Account.findById(accountId).lean();
    if (!prevAccount) return res.status(404).json({ error: "Account not found" });

    // Update account fields
    const updatedAccount = await Account.findByIdAndUpdate(
      accountId,
      { ...rest, mappedUsers },
      { new: true }
    );

    const previous = prevAccount.mappedUsers.map(id => id.toString());
    const current = mappedUsers.map(id => id.toString());

    // Users removed from mapping
    const removedUsers = previous.filter(u => !current.includes(u));

    // Users added to mapping
    const addedUsers = current.filter(u => !previous.includes(u));

    // 1. Remove this account from removedUsers
    if (removedUsers.length > 0) {
      await User.updateMany(
        { _id: { $in: removedUsers } },
        { $pull: { accountIds: { _id: accountId } } }
      );
    }

    // 2. Add this account to addedUsers
    if (addedUsers.length > 0) {
      await User.updateMany(
        { _id: { $in: addedUsers } },
        {
          $push: {
            accountIds: {
              _id: updatedAccount._id,
              name: updatedAccount.name
            }
          }
        }
      );
    }

    // 3. If account name changed → update it inside user.accountIds
    if (rest.name && rest.name !== prevAccount.name) {
      await User.updateMany(
        { "accountIds._id": accountId },
        { $set: { "accountIds.$.name": rest.name } }
      );
    }

    res.json(updatedAccount);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// ==========================
// DELETE ACCOUNT
// ==========================
exports.deleteAccount = async (req, res) => {
  try {
    const accountId = req.params.id;

    // Delete account
    await Account.findByIdAndDelete(accountId);

    // Remove from all users' accountIds
    await User.updateMany(
      {},
      { $pull: { accountIds: { _id: accountId } } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



/**
 * PUT /accounts/:id/users
 * Body: { userIds: [ "uid1", "uid2", ... ] }
 *
 * Sets the users for an account:
 *  - Adds this account to newUsers.accountIds (push { _id, name })
 *  - Removes this account from users no longer selected (pull)
 */
exports.updateAccountUsers = async (req, res) => {
  try {
    const accountId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ error: "Invalid account id" });
    }

    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map(String) : [];

    // Load account (need its name for user.accountIds entries)
    const account = await Account.findById(accountId).lean();
    if (!account) return res.status(404).json({ error: "Account not found" });

    // Find previous users who had this account
    const prevUsers = await User.find({ "accountIds._id": accountId }).select('_id').lean();
    const prevUserIds = prevUsers.map(u => String(u._id));

    // Compute additions and removals
    const toAdd = userIds.filter(id => !prevUserIds.includes(id));
    const toRemove = prevUserIds.filter(id => !userIds.includes(id));

    // Add account entry to toAdd users (avoid duplicates by $push)
    if (toAdd.length) {
      await User.updateMany(
        { _id: { $in: toAdd }, "accountIds._id": { $ne: account._id } },
        { $push: { accountIds: { _id: account._id, name: account.name } } }
      );
    }

    // Remove account entry from removed users
    if (toRemove.length) {
      await User.updateMany(
        { _id: { $in: toRemove } },
        { $pull: { accountIds: { _id: account._id } } }
      );
    }

    // Return a summary
    return res.json({
      success: true,
      added: toAdd,
      removed: toRemove
    });

  } catch (err) {
    console.error("updateAccountUsers error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};



// GET /accounts/name/:accountName
exports.getAccountByName = async (req, res) => {
  try {
    const { accountName } = req.params;

    if (!accountName) {
      return res.status(400).json({ error: "Account name is required" });
    }

    const account = await Account.findOne({ name: accountName }).lean();

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.status(200).json(account);

  } catch (err) {
    console.error("Error fetching account by name:", err);
    return res.status(500).json({ error: "Server error while fetching account" });
  }
};
