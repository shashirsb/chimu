const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    displayName: String,
    email: String,

    // Enforced roles
    roles: {
        type: [String],
        enum: ['Admin', 'Lead', 'SA', 'AE', 'Account Director', 'CSM', 'ADR', 'RD','RVP', 'TAM', "Marketing"],
        default: ['Member'],
    },

    businessUnit: {
    type: [String],
    default: []
  },

    region: String,
    active: { type: Boolean, default: true },

    // ✅ Hashed password field
    password: { type: String, required: true, minlength: 6 },

    // Optional: track AI preferences
    aiProfile: {
        lastSummaryAt: Date,
        preferredInsightType: {
            type: String,
            enum: ['Performance', 'Risk', 'Client', 'General'],
            default: 'General',
        },
    },
    accountIds: [
        {
            _id: { type: Schema.Types.ObjectId, ref: "Account", required: true },
            name: { type: String, required: true },
        }

    ],
}, { timestamps: true });

/**
 * ✅ Automatically hash password before saving
 */
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

/**
 * ✅ Compare entered password with hashed one
 */
UserSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
