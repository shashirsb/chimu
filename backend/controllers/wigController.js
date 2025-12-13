// server/controllers/wigController.js
const wigService = require('../services/wigService');
const { createWigSchema, updateWigSchema, updateMeasureSchema } = require('../validations/wigValidation');
const mongoose = require('mongoose');

// Note: The redundant block of code for Wig/mongoose imports and updateMeasureWithComment 
// has been removed from the middle of createWig for clarity and correctness.

/**
 * GET /api/wigs
 */
exports.getWigs = async (req, res) => {
    try {
        const { accountId, createdById } = req.query;
        const filter = {};
        if (accountId) filter.accountId = accountId;
        if (createdById) filter.createdById = createdById;

        const wigs = await wigService.getWigs(filter);
        res.json(wigs);
    } catch (err) {
        console.error('Error getWigs', err);
        res.status(500).json({ error: 'Failed to fetch WIGs' });
    }
};

/**
 * GET /api/wigs/:id
 */
exports.getWigById = async (req, res) => {
    try {
        const wig = await wigService.getWigById(req.params.id);
        if (!wig) return res.status(404).json({ error: 'WIG not found' });
        res.json(wig);
    } catch (err) {
        console.error('Error getWigById', err);
        res.status(500).json({ error: 'Failed to fetch WIG' });
    }
};

/**
 * POST /api/wigs
 */
exports.createWig = async (req, res) => {
    try {
        const { error, value } = createWigSchema.validate(req.body, { abortEarly: false });
        if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

        // current user info
        const currentUser = {
            id: req.user.id,
            displayName: req.user.displayName || req.user.username || 'System'
        };

        // populate required IDs & names
        value.createdById = currentUser.id;
        value.createdByName = currentUser.displayName;
        value.modifiedById = currentUser.id;
        value.modifiedByName = currentUser.displayName;

        // measures
        const fillMeasureDefaults = (measures = []) =>
            measures.map(m => ({
                _id: m._id || new mongoose.Types.ObjectId(),   // ✅ subdocument ID
                ...m,
                createdById: m.createdById || currentUser.id,
                createdByName: m.createdByName || currentUser.displayName,
                modifiedById: m.modifiedById || currentUser.id,
                modifiedByName: m.modifiedByName || currentUser.displayName,

                // 🚨 ADDED SPOKE FIELDS 🚨
                spokeId: m.spokeId || null,
                spokeName: m.spokeName || '',
                // ---------------------

                stakeholdersContact: (m.stakeholdersContact || []).map(s => ({
                    _id: s._id || new mongoose.Types.ObjectId(), // optional but consistent
                    name: s.name || '',
                    email: s.email || '',
                    contacted: s.contacted || false
                })),

                assignedTo: (m.assignedTo || []).map(a => ({
                    _id: a._id || null,
                    name: a.name || ''
                })),

                comments: (m.comments || []).map(c => ({
                    _id: c._id || new mongoose.Types.ObjectId(),  // ✅ comment ID
                    text: c.text,
                    createdAt: c.createdAt || new Date(),
                    createdById: c.createdById || currentUser.id,
                    createdByName: c.createdByName || currentUser.displayName
                }))
            }));


        value.lagMeasures = fillMeasureDefaults(value.lagMeasures);
        value.leadMeasures = fillMeasureDefaults(value.leadMeasures);

        // save WIG
        const saved = await wigService.createWig(value, currentUser);
        const populated = await wigService.getWigById(saved._id);

        res.status(201).json(populated);
    } catch (err) {
        console.error('Error createWig', err);
        res.status(500).json({ error: 'Failed to create WIG' });
    }
};

/**
 * PUT /api/wigs/:id
 */
exports.updateWig = async (req, res) => {
    try {
        // Validate payload (only allowed fields)
        const { error, value } = updateWigSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }

        const currentUser = {
            id: req.user.id,
            displayName: req.user.displayName || req.user.username || ''
        };

        // Prepare payload
        const mapMeasureFields = (m) => ({
            name: m.name,
            type: m.type || 'lead', // assuming lead/lag default if type isn't sent
            targetValue: m.targetValue || 0,
            currentValue: m.currentValue || 0,
            
            // 🚨 ADDED SPOKE FIELDS 🚨
            spokeId: m.spokeId || null,
            spokeName: m.spokeName || '',
            // ---------------------

            assignedTo: (m.assignedTo || []).map(s => ({
                name: s.name || '',
                _id: s._id || ''
            })),
            stakeholdersContact: (m.stakeholdersContact || []).map(s => ({
                name: s.name || '',
                email: s.email || '',
                contacted: s.contacted || false
            })),
            comments: (m.comments || []).map(c => ({
                text: c.text || '',
                createdById: c.createdById || currentUser.id,
                createdByName: c.createdByName || currentUser.displayName,
                createdAt: c.createdAt || new Date()
            })),
            createdById: m.createdById || currentUser.id,
            createdByName: m.createdByName || currentUser.displayName,
            modifiedById: currentUser.id,
            modifiedByName: currentUser.displayName
        });


        const allowedPayload = {
            _id: req.params.id, // keep _id for reference
            title: value.title,
            type: value.type,
            statement: value.statement,
            accountId: value.accountId, // Note: Not in updateWigSchema, assuming it's passed if account is updated
            status: value.status,
            validityPeriod: value.validityPeriod,
            updatedAt: new Date(), // include updatedAt
            
            // Apply mapMeasureFields to both arrays
            lagMeasures: (value.lagMeasures || []).map(mapMeasureFields),
            leadMeasures: (value.leadMeasures || []).map(mapMeasureFields)
        };

        const updated = await wigService.updateWig(req.params.id, allowedPayload, currentUser);
        const populated = await wigService.getWigById(updated._id);
        res.json(populated);

    } catch (err) {
        console.error('Error updateWig', err);
        if (err.message === 'WIG not found') return res.status(404).json({ error: 'WIG not found' });
        res.status(500).json({ error: 'Failed to update WIG' });
    }
};


/**
 * DELETE /api/wigs/:id
 */
exports.deleteWig = async (req, res) => {
    try {
        const deleted = await wigService.deleteWig(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'WIG not found' });
        res.json({ message: 'WIG deleted successfully' });
    } catch (err) {
        console.error('Error deleteWig', err);
        res.status(500).json({ error: 'Failed to delete WIG' });
    }
};


/**
 * PUT /api/measures/:id
 * - Updates only the target measure (currentValue, stakeholdersContact, SPOKES)
 * - Adds a new comment if provided
 */
exports.updateMeasureWithComment = async (req, res) => {
    try {

        // Validate payload
        const { error, value } = updateMeasureSchema.validate(req.body, { abortEarly: false });
        if (error) return res.status(400).json({ error: error.details.map(d => d.message) });
        
        const measureId = req.params.id;

        const currentUser = {
            id: req.user.id,
            displayName: req.user.displayName || req.user.username || 'System'
        };

        const updatedMeasure = await wigService.updateMeasureWithComment({
            wigId: value.wigId,
            measureId,
            currentValue: value.currentValue,
            stakeholdersContact: value.stakeholdersContact,
            newComment: value.newComment,
            
            // 🚨 ADDED SPOKE FIELDS FROM PAYLOAD 🚨
            spokeId: value.spokeId,
            spokeName: value.spokeName,
            // -------------------------------------
            
            currentUser
        });

        res.json({ message: 'Measure updated successfully', measure: updatedMeasure });

    } catch (err) {
        console.error('Error updateMeasureWithComment', err);
        if (err.message === 'WIG not found') return res.status(404).json({ error: 'WIG not found' });
        if (err.message === 'Measure not found') return res.status(404).json({ error: 'Measure not found' });
        // Handle Mongoose validation errors if they occur
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message, errors: err.errors });
        }
        res.status(500).json({ error: 'Failed to update measure' });
    }
};