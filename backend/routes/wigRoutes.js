const express = require('express');
const router = express.Router();
const wigController = require('../controllers/wigController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * WIG Routes
 * - View: any authenticated user
 * - Create: Admin, Manager
 * - Update: Admin, Manager
 * - Delete: Admin
 */

// WIG Endpoints
router.get('/', authenticateUser, wigController.getWigs);
router.get('/:id', authenticateUser, wigController.getWigById);
router.post('/', authenticateUser, wigController.createWig);
router.put('/:id', authenticateUser, wigController.updateWig);
router.delete('/:id', authenticateUser, wigController.deleteWig);

//router.put('/:id', authenticateUser, authorizeRoles('Admin', 'Manager'), wigController.updateWig);

// ----------------------------
// NEW: Measure Update Endpoint
// PUT /api/measures/:id
router.put('/measures/:id', authenticateUser, wigController.updateMeasureWithComment);

module.exports = router;
