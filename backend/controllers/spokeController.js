// server/controllers/spokeController.js
const spokeService = require('../services/spokeService');

// --- HELPER FUNCTION: Map Incoming Payload to Mongoose Schema ---
const mapIncomingPayload = (payload) => {

    // Helper to convert a multiline string from a textarea into an array of strings,
    // cleaning up whitespace and filtering out empty lines.
    const stringToArray = (value) => {
        if (!value) return [];
        // Use existing array if already an array (for loading existing data)
        if (Array.isArray(value)) return value;
        // Convert single string with newlines to array, clean, and filter empty entries
        return value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
    };

    const mapped = {
        // Core Identifiers (Strings)
        accountId: payload.accountId,
        accountName: payload.accountName,
        User: payload.User,
        spoke: payload.spoke,
        internalNotes: payload.internalNotes,
        live: payload.live,

        // NOTE: Old fields like cto, status, outreach, customerEmail, appId, appName, annualCost 
        // are intentionally REMOVED from the mapping to adhere to the final schema.

        // NEW CONTENT FIELDS (Convert from String to [String])
        partners: stringToArray(payload.partners),
        whoCares: stringToArray(payload.whoCares),
        techStack: stringToArray(payload.techStack),
        descriptionRelevancy: stringToArray(payload.descriptionRelevancy),
        bigRockGoal: stringToArray(payload.bigRockGoal),
        challengesPainPoints: stringToArray(payload.challengesPainPoints),
        whyNow: stringToArray(payload.whyNow),
        whyMongoDB: stringToArray(payload.whyMongoDB),
        proofPoint: stringToArray(payload.proofPoint),
        talkTrack: stringToArray(payload.talkTrack),
    };

    // Clean up any fields that are explicitly undefined or null in the payload
    Object.keys(mapped).forEach(key => {
        if (mapped[key] === undefined || mapped[key] === null) {
            delete mapped[key];
        }
    });

    return mapped;
};

// --- CONTROLLER FUNCTIONS ---

/**
 * GET /api/spoke
 * supports optional query: q (search across accountName, spoke, User, content arrays)
 */
exports.getSpokes = async (req, res) => {
    try {
        const { q, page = 1, pageSize = 100, sort, accountId } = req.query; // 🚨 Extracted accountId
        let filter = {}; // Changed to 'let' as we will modify it

        // 🚨 NEW LOGIC: Filter by accountId if present
        if (accountId) {
            filter.accountId = accountId;
        }

        if (q) {
            const re = new RegExp(q, 'i');

            // When a 'q' (text search) is provided, we need to combine it with the accountId filter.
            // We use $and to ensure BOTH the accountId (if present) and the text search criteria are met.
            const searchConditions = [
                // Core Strings
                { accountName: re },
                { spoke: re },
                { User: re },
                // Key Content Arrays
                { descriptionRelevancy: re },
                { bigRockGoal: re },
                { challengesPainPoints: re },
                { whyNow: re },
                { whyMongoDB: re },
                { proofPoint: re },
                { talkTrack: re },
                // Other new array fields
                { partners: re },
                { whoCares: re },
                { techStack: re },
            ];

            // If accountId was set, we need to wrap the whole thing in $and
            if (filter.accountId) {
                filter = {
                    $and: [
                        { accountId: filter.accountId }, // Condition 1: Must match the accountId
                        { $or: searchConditions }      // Condition 2: Must match one of the search fields
                    ]
                };
            } else {
                // If no accountId, the filter is just the $or search
                filter = { $or: searchConditions };
            }

        } else if (filter.accountId) {
            // If there's an accountId but no 'q', the filter is simply { accountId: accountId }
            // The filter object is already structured correctly from the initial check.
        }


        const options = {};
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.max(1, parseInt(pageSize, 10) || 100);
        options.skip = (p - 1) * ps;
        options.limit = ps;
        if (sort) options.sort = sort;

        const docs = await spokeService.getSpokes(filter, options);
        res.json(docs);
    } catch (err) {
        console.error('Error in getSpokes', err);
        res.status(500).json({ error: 'Failed to fetch Spokes' });
    }
};

exports.getSpokeById = async (req, res) => {
    try {
        console.log(req);
        const { id } = req.params;
        const doc = await spokeService.getSpokeById(id);
        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (err) {
        console.error('Error in getSpokeById', err);
        res.status(500).json({ error: 'Failed to fetch Spoke' });
    }
};

exports.createSpoke = async (req, res) => {
    try {
        // Note: accountId is required and unique, so an error will be thrown if it's missing or duplicated
        const payload = mapIncomingPayload(req.body);
        console.log(payload);
        const doc = await spokeService.createSpoke(payload);
        res.status(201).json(doc);
    } catch (err) {
        console.error('Error in createSpoke', err);
        const status = err.status || 500;
        // Mongoose duplicate key error (11000) for unique: accountId
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Spoke with this accountId already exists.' });
        }
        res.status(status).json({ error: err.message || 'Create failed' });
    }
};

exports.updateSpoke = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = mapIncomingPayload(req.body);
        console.log(payload);
        // Note: The accountId should generally not be updated for an existing document.
        // We rely on Mongoose to prevent updating the unique field if not explicitly handled.
        // Removing accountId from payload if it's the only thing being sent might be safer, 
        // but the controller logic is fine as is for general updates.
        const doc = await spokeService.updateSpoke(id, payload);
        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (err) {
        console.error('Error in updateSpoke', err);
        res.status(500).json({ error: 'Update failed' });
    }
};

exports.deleteSpoke = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await spokeService.deleteSpoke(id);
        if (!doc) return res.status(404).json({ error: 'Not found or already deleted' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error in deleteSpoke', err);
        res.status(500).json({ error: 'Delete failed' });
    }
};