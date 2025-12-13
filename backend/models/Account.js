const mongoose = require('mongoose');
const { Schema } = mongoose;

const AccountSchema = new Schema({
  name: { type: String, required: true, unique: true },

  // No enum — users can type any region freely
  region: {
    type: [String],
    default: []
  },

   businessUnit: {
    type: [String],
    default: []
  },

  description: { type: String, trim: true },

  active: { type: Boolean, default: true },

  // Users mapped to this account
  mappedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

  // === NEW FIELD ADDED HERE ===
  locations: [{
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  }]
  // ============================
  
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);