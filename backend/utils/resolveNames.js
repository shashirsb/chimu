// server/utils/resolveNames.js
const User = require('../models/User');
const Account = require('../models/Account');

/**
 * Resolve user name by id. If not found, return fallback (or empty string).
 * Returns string (displayName || username || email || 'Unknown User')
 */
async function resolveUserName(userId) {
  if (!userId) return '';
  try {
    const u = await User.findById(userId).select('displayName username email').lean();
    if (!u) return '';
    return u.displayName || u.username || u.email || '';
  } catch (e) {
    console.warn('resolveUserName error', e);
    return '';
  }
}

/**
 * Resolve account name by id.
 */
async function resolveAccountName(accountId) {
  if (!accountId) return '';
  try {
    const a = await Account.findById(accountId).select('name').lean();
    return a ? (a.name || '') : '';
  } catch (e) {
    console.warn('resolveAccountName error', e);
    return '';
  }
}

module.exports = { resolveUserName, resolveAccountName };
