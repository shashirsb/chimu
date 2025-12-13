// server/services/spokeService.js
const Spoke = require('../models/Spoke');

/**
 * Basic service layer for Spoke CRUD
 */

exports.getSpokes = async (filter = {}, options = {}) => {
  // filter: plain object used in mongoose find
  // options: { limit, skip, sort }
  const q = Spoke.find(filter);
  if (options.sort) q.sort(options.sort);
  if (options.skip) q.skip(options.skip);
  if (options.limit) q.limit(options.limit);
  const docs = await q.exec();
  return docs;
};

exports.getSpokeById = async (id) => {
  // id here refers to accountId (string) or Mongo _id; try accountId first then fallback
  let doc = await Spoke.findOne({ accountId: id }).exec();
  if (!doc) doc = await Spoke.findById(id).exec();
  return doc;
};

exports.createSpoke = async (payload) => {
  // payload is plain object
  // ensure accountId exists
  if (!payload.accountId) {
    // generate a mongo id-like fallback if missing
    payload.accountId = (new Date().getTime()).toString(36) + Math.random().toString(36).slice(2,8);
  }
  console.log(payload.accountId);
  console.log(payload.spoke);
  // 🌟 CRITICAL FIX: Check for uniqueness based on accountId AND spoke name 🌟
  const existing = await Spoke.findOne({ 
    accountId: payload.accountId,
    spoke: payload.spoke // Assuming 'spoke' is the field for the spoke name
  }).exec();

  if (existing) {
    // Now, this error only throws if the SAME spoke name exists for that account.
    const err = new Error(`Spoke "${payload.spoke}" already exists for this account.`);
    err.status = 409;
    throw err;
  }
  
  const doc = new Spoke(payload);
  await doc.save();
  return doc;
};

exports.updateSpoke = async (id, payload) => {
  // id: accountId or mongo _id
  const doc = await Spoke.findOneAndUpdate(
    { $or: [{ accountId: id }, { _id: id }] },
    { ...payload, updatedAt: new Date() },
    { new: true, upsert: false }
  ).exec();
  return doc;
};

exports.deleteSpoke = async (id) => {
  const doc = await Spoke.findOneAndDelete({ $or: [{ accountId: id }, { _id: id }] }).exec();
  return doc;
};