// server/validations/wigValidation.js
const Joi = require('joi').extend(require('@joi/date'));

// --- Sub Schemas ---

const stakeholderSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    name: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    contacted: Joi.boolean().optional()
});


const assignedTo = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    name: Joi.string().allow('').optional(),

});

const commentSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    text: Joi.string().required(),
    createdAt: Joi.date().optional(),
    createdById: Joi.string().hex().length(24).optional(),
    createdByName: Joi.string().optional()
});

// --- Measure Schema (For Creation/Update) ---

const measureSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    name: Joi.string().required(),
    type: Joi.string().required(),
    targetValue: Joi.number().optional(),
    currentValue: Joi.number().optional(),
    assignedTo: Joi.array().items(assignedTo).optional(),
    stakeholdersContact: Joi.array().items(stakeholderSchema).optional(),
    
    // 🚨 FIX 1: Allow both empty string ('') and null for spoke fields 🚨
    spokeId: Joi.string().hex().length(24).allow(null, '').optional(),
    spokeName: Joi.string().allow(null, '').optional(),
    // --------------------------------

    comments: Joi.array().items(commentSchema).optional(),
    createdAt: Joi.date().optional(),
    modifiedAt: Joi.date().optional(),
    createdById: Joi.string().hex().length(24).optional(),
    createdByName: Joi.string().optional(),
    modifiedById: Joi.string().hex().length(24).optional(),
    modifiedByName: Joi.string().optional()
});

const validitySchema = Joi.object({
    type: Joi.string().valid('half_yearly', 'quarterly', 'monthly', 'weekly').optional(),
    startDate: Joi.date().optional(),
    expiryDate: Joi.date().required()
});

// --- Create WIG Schema ---

const createWigSchema = Joi.object({
    title: Joi.string().required(),
    type: Joi.string().required(),
    statement: Joi.string().allow('').optional(),
    status: Joi.string().valid('on_track', 'at_risk', 'off_track').optional(),
    accountId: Joi.string().hex().length(24).required(),
    accountName: Joi.string().optional(),
    createdById: Joi.string().hex().length(24).required(),
    createdByName: Joi.string().optional(),
    modifiedById: Joi.string().hex().length(24).required(),
    modifiedByName: Joi.string().optional(),
    lagMeasures: Joi.array().items(measureSchema).optional(),
    leadMeasures: Joi.array().items(measureSchema).optional(),
    validityPeriod: validitySchema.optional(),
    progress: Joi.number().min(0).max(100).optional()
});

// --- Update WIG Schema ---

const updateWigSchema = Joi.object({
    title: Joi.string().required(),
    type: Joi.string().required(),
    statement: Joi.string().allow('').optional(),
    status: Joi.string().valid('on_track', 'at_risk', 'off_track').optional(),
    lagMeasures: Joi.array().items(measureSchema).optional(),
    leadMeasures: Joi.array().items(measureSchema).optional(),
    validityPeriod: validitySchema.optional(),
    modifiedById: Joi.string().hex().length(24).required(),
    modifiedByName: Joi.string().optional(),
    updatedAt: Joi.date().required()
});

// --- Update Measure Schema (For Progress Updates) ---

const updateMeasureSchema = Joi.object({

    wigId: Joi.string().hex().length(24).required(),
    currentValue: Joi.number().min(0).optional(),
    stakeholdersContact: Joi.array().items(stakeholderSchema).optional(),
    
    // 🚨 FIX 2: Allow both empty string ('') and null for spoke fields 🚨
    spokeId: Joi.string().hex().length(24).allow(null, '').optional(),
    spokeName: Joi.string().allow(null, '').optional(),
    // -----------------------------------
    
    newComment: Joi.object({
        text: Joi.string().required(),
        createdAt: Joi.date().optional(),
        createdById: Joi.string().hex().length(24).required(),
        createdByName: Joi.string().required()
    }).optional()
});


// --- Exports ---

module.exports = {
    createWigSchema,
    updateWigSchema,
    updateMeasureSchema
};