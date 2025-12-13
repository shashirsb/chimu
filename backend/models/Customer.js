const mongoose = require("mongoose");

const LogHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  summary: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  sentiment: {
    type: String,
    enum: ["High", "Medium", "Low", "Unknown"],
    default: "Unknown"
  },
  awareness: {
    type: String,
    enum: ["Hold", "Email only", "Low", "Go Ahead", "Unknown"],
    default: "Unknown"
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },

    designation: { type: String, default: "" },

    sentiment: {
      type: String,
      enum: ["High", "Medium", "Low", "Unknown"],
      default: "Unknown"
    },

    awareness: {
      type: String,
      enum: ["Hold", "Email only", "Low", "Go Ahead", "Unknown"],
      default: "Unknown"
    },

    decisionMaker: { type: Boolean, default: false },

    type: {
      type: String,
      enum: [
        "techChampion",
        "businessChampion",
        "economicBuyer",
        "coach",
        "noPower",
        "influential",
        "unknown",
        "detractor",
      ],
      default: "unknown"
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },

    reportingTo: [{ type: String }],  // list of emails
    reportees: [{ type: String }],    // list of emails
    businessUnit: [{ type: String }],

    appNames: [{ type: String }],
    annualCost: { type: String, required: false, default: "$ 0.00" },
    annualMDBCost: { type: String, required: false, default: "$ 0.00" },
    monthlyMDBCost: { type: String, required: false, default: "$ 0.00" },
    tgo: { type: String, default: "" },
    cto: { type: String, default: "" },
    ao: { type: String, default: "" },
    location: { type: String, default: "" },
    stage: { type: String, default: "" },


    logHistory: [LogHistorySchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
