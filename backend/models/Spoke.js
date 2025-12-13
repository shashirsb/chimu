// server/models/Spoke.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SpokeSchema = new Schema({
  // Core Identifiers
  accountId: { type: String, required: true, index: true, unique: false },
  accountName: { type: String, default: '' },
  User: { type: String, default: '' },
  
  // Application Details
  spoke: { type: String, default: '' },           
  live: { type: Boolean, default: false },
  partners: { type: [String], default: [] },
  whoCares: { type: [String], default: [] },
  techStack: { type: [String], default: [] },
  
  // NOTE: appId, appName, annualCost are now REMOVED
  
  descriptionRelevancy: { type: [String], default: [] },
  bigRockGoal: { type: [String], default: [] },
  challengesPainPoints: { type: [String], default: [] },
  whyNow: { type: [String], default: [] },
  whyMongoDB: { type: [String], default: [] },
  proofPoint: { type: [String], default: [] },
  talkTrack: { type: [String], default: [] },

  // Internal Notes
  internalNotes: { type: String, default: '' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Spoke', SpokeSchema);