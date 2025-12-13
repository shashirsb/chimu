// server/services/wigService.js
const Wig = require('../models/Wig');
const { resolveUserName, resolveAccountName } = require('../utils/resolveNames');
const mongoose = require('mongoose');


/**
 * normalizeMeasureList:
 * - ensures createdById/Name and modifiedById/Name exist
 * - fills assignedToName from assignedToId if missing
 * - ensures comment createdByName present
 * - 🚨 ADDED: Correctly handles spokeId and spokeName
 */
async function normalizeMeasureList(measures = [], currentUser) {
    const now = new Date();
    const result = [];

    for (const m of measures) {
        // Destructure spoke fields directly from the measure object (m)
        const { spokeId, spokeName } = m; 

        const createdById = m.createdById || currentUser.id;
        const modifiedById = m.modifiedById || currentUser.id;

        // resolve createdByName / modifiedByName if provided, else fetch
        const createdByName = m.createdByName || (await resolveUserName(createdById)) || currentUser.displayName || '';
        const modifiedByName = m.modifiedByName || (await resolveUserName(modifiedById)) || currentUser.displayName || '';

        // assignedTo
        m.assignedTo = await Promise.all(
            (m.assignedTo || []).map(async (user) => {
                if (!user._id) return null; // skip if no _id
                return {
                    _id: user._id,
                    name: user.name || await resolveUserName(user._id)
                };
            })
        );

        // comments
        const comments = [];
        for (const c of (m.comments || [])) {
            const commentCreatedById = c.createdById || currentUser.id;
            const commentCreatedByName = c.createdByName || (await resolveUserName(commentCreatedById)) || currentUser.displayName || '';
            comments.push({
                text: c.text,
                createdAt: c.createdAt || now,
                createdById: commentCreatedById,
                createdByName: commentCreatedByName
            });
        }

        result.push({
            name: m.name,
            type: m.type,
            targetValue: typeof m.targetValue === 'number' ? m.targetValue : 0,
            currentValue: typeof m.currentValue === 'number' ? m.currentValue : 0,
            unit: m.unit || '',

            assignedTo: (m.assignedTo || []).map(a => ({
                name: a.name || '',
                _id: a._id || null,
            })),

            stakeholdersContact: (m.stakeholdersContact || []).map(s => ({
                name: s.name || '',
                email: s.email || '',
                contacted: s.contacted || false
            })),
            
            // 🚨 ADDED: Include spoke fields in the resulting measure object
            spokeId: spokeId || null, 
            spokeName: spokeName || '', 

            comments,
            createdAt: m.createdAt || now,
            modifiedAt: m.modifiedAt || now,
            createdById,
            createdByName,
            modifiedById,
            modifiedByName
        });
    }

    return result;
}

/**
 * createWig: prepares the full wig object (with names resolved) and saves
 */
async function createWig(payload = {}, currentUser = {}) {
    const now = new Date();

    // Resolve accountName & ownerName if not provided
    const accountName = payload.accountName || (await resolveAccountName(payload.accountId));
    const createdByName = payload.createdByName || (await resolveUserName(payload.createdById));

    const lagMeasures = await normalizeMeasureList(payload.lagMeasures || [], currentUser);
    const leadMeasures = await normalizeMeasureList(payload.leadMeasures || [], currentUser);

    const wigDoc = {
        title: payload.title,
         type: payload.type,
        statement: payload.statement || '',
        status: payload.status || 'on_track',
        accountId: payload.accountId,
        accountName: accountName || '',
        lagMeasures,
        leadMeasures,
        validityPeriod: {
            type: payload.validityPeriod?.type || 'quarterly',
            startDate: payload.validityPeriod?.startDate || now,
            expiryDate: payload.validityPeriod?.expiryDate // required by schema - caller must provide
        },
        createdById: currentUser.id,
        createdByName: currentUser.displayName || '',
        modifiedById: currentUser.id,
        modifiedByName: currentUser.displayName || '',
        progress: payload.progress || 0,
        aiSummary: payload.aiSummary || {},
        startDate: payload.startDate,
        targetDate: payload.targetDate
    };

    const newWig = new Wig(wigDoc);
    const saved = await newWig.save();
    return saved;
}

/**
 * updateWig: patch/update an existing wig. Caller provides partial payload.
 * - Replaces lead/lag measure arrays if present in payload (frontend sends full arrays).
 * - Always updates names for account/owner if ID changed or name explicitly provided.
 */
async function updateWig(wigId, payload = {}, currentUser = {}) {
    const wig = await Wig.findById(wigId);
    if (!wig) throw new Error('WIG not found');

    // top-level fields to merge
    const updatable = [
        'title','type', 'statement', 'status', 'progress',
        'aiSummary', 'startDate', 'targetDate'
    ];
    updatable.forEach((f) => {
        if (payload[f] !== undefined) wig[f] = payload[f];
    });

    // account / owner - if ID provided, resolve name (or accept provided name)
    if (payload.accountId) {
        wig.accountId = payload.accountId;
        wig.accountName = payload.accountName || (await resolveAccountName(payload.accountId)) || '';
    }
    if (payload.createdById) {
        wig.createdById = payload.createdById;
        wig.createdByName = payload.createdByName || (await resolveUserName(payload.createdById)) || '';
    }

    // validity period merge
    if (payload.validityPeriod) {
        wig.validityPeriod = {
            ...wig.validityPeriod.toObject(),
            ...payload.validityPeriod
        };
    }

    // replace measures wholly if provided (frontend will send full arrays)
    if (payload.lagMeasures) {
        wig.lagMeasures = await normalizeMeasureList(payload.lagMeasures, currentUser);
    }
    if (payload.leadMeasures) {
        wig.leadMeasures = await normalizeMeasureList(payload.leadMeasures, currentUser);
    }

    // modified metadata
    wig.modifiedById = currentUser.id;
    wig.modifiedByName = currentUser.displayName || '';
    wig.modifiedAt = new Date();

    const saved = await wig.save();
    return saved;
}

/**
 * getWigs, getWigById, deleteWig - small wrappers
 */
async function getWigs(filter = {}) {
    return Wig.find(filter)
        .populate('accountId', 'name region')
        .populate('createdById', 'username displayName email')
        .sort({ createdAt: -1 });
}

async function getWigById(id) {
    return Wig.findById(id)
        .populate('accountId', 'name region')
        .populate('createdById', 'username displayName email');
}

async function deleteWig(id) {
    return Wig.findByIdAndDelete(id);
}



/**
 * updateMeasureWithComment
 * - patch only the specific measure
 * - upsert stakeholdersContact (contacted true/false)
 * - add new comment if provided
 * - 🚨 ADDED: Allows updating spokeId and spokeName
 */
async function updateMeasureWithComment({
    wigId,
    measureId,
    currentValue,
    stakeholdersContact,
    newComment,
    // 🚨 ADDED: Destructure new spoke fields from payload
    spokeId,
    spokeName,
    currentUser
}) {
    if (!mongoose.Types.ObjectId.isValid(wigId) || !mongoose.Types.ObjectId.isValid(measureId)) {
        throw new Error('Invalid WIG or Measure ID');
    }

    const wig = await Wig.findById(wigId);
    if (!wig) throw new Error('WIG not found');

    // Find measure in lead or lag arrays
    let measure = wig.leadMeasures.id(measureId) || wig.lagMeasures.id(measureId);
    if (!measure) throw new Error('Measure not found');

    

    // Update currentValue
    if (typeof currentValue === 'number') measure.currentValue = currentValue;
    
    // 🚨 ADDED: Update Spoke link if provided
    if (spokeId !== undefined) measure.spokeId = spokeId === '' ? null : spokeId;
    if (spokeName !== undefined) measure.spokeName = spokeName || '';
    
    // Upsert stakeholdersContact
    // Assume measure.stakeholdersContact is current state in DB
    // stakeholdersContact is the new array from payload

    if (Array.isArray(stakeholdersContact)) {
        const updated = [];

        // 1️⃣ Add/update
        stakeholdersContact.forEach((s) => {
            if (!s._id || s._id.startsWith("new-")) {
                // New stakeholder, generate temp _id if needed (optional)
                updated.push({
                    ...s,
                    contacted: s.contacted || false,
                    _id: new mongoose.Types.ObjectId(),
                });
            } else {
                // Existing stakeholder, update fields
                const existing = measure.stakeholdersContact.find(sc => sc._id.toString() === s._id);
                if (existing) {
                    updated.push({
                        _id: existing._id,
                        name: s.name ?? existing.name,
                        email: s.email ?? existing.email,
                        contacted: s.contacted ?? existing.contacted,
                    });
                }
            }
        });

        // 2️⃣ Delete removed
        // Only include those in the updated array, existing ones not in new array are automatically removed
        measure.stakeholdersContact = updated;
    }


    // Add new comment
    if (newComment) {
        measure.comments.push({
            text: newComment.text,
            createdAt: newComment.createdAt || new Date(),
            createdById: newComment.createdById,
            createdByName: newComment.createdByName
        });
    }

    // Update measure modified info
    measure.modifiedAt = new Date();
    measure.modifiedById = currentUser.id;
    measure.modifiedByName = currentUser.displayName || '';

    await wig.save();

    return measure;
}

module.exports = {
    createWig,
    updateWig,
    updateMeasureWithComment,
    getWigs,
    getWigById,
    deleteWig
};