// server/models/Wig.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Comment Schema
const CommentSchema = new Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true }
}, { _id: true });

// Reusable schema for both lead & lag measures
const MeasureSchema = new Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    type: { type: String, required: true },

    targetValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },


    stakeholdersContact: [
        {
            name: { type: String, default: '' },
            email: { type: String, default: '' },
            contacted: { type: Boolean, default: false }
        }
    ],

    assignedTo: [
        {
            name: { type: String, default: '' },
            _id: { type: Schema.Types.ObjectId, ref: 'User' }
        }
    ],

    spokeId: { type: Schema.Types.ObjectId, ref: 'Spoke' },
    spokeName: { type: String, default: '' },
    

    comments: [CommentSchema],

    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now },

    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    modifiedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    modifiedByName: { type: String, required: true }
}, { _id: true });

const WigSchema = new Schema({
    title: { type: String, required: true },
     type: { type: String, required: true },
    statement: { type: String, default: '' },

    status: {
        type: String,
        enum: ["on_track", "at_risk", "off_track"],
        default: "on_track"
    },

    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountName: { type: String, required: true },

    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },

    lagMeasures: { type: [MeasureSchema], default: [] },
    leadMeasures: { type: [MeasureSchema], default: [] },

    validityPeriod: {
        type: {
            type: String,
            enum: ['halfyearly', 'quarterly', 'monthly', 'weekly'],
            default: 'quarterly'
        },
        startDate: { type: Date, default: Date.now },
        expiryDate: { type: Date, required: true }
    },

    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },

    modifiedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    modifiedByName: { type: String, required: true },

    progress: { type: Number, default: 0 },

    aiSummary: {
        text: { type: String, default: '' },
        lastUpdated: { type: Date }
    },

    startDate: { type: Date },
    targetDate: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Wig', WigSchema);
