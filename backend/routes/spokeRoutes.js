// server/routes/spokeRoutes.js
const express = require('express');
const router = express.Router();
const spokeController = require('../controllers/spokeController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * Spoke Routes
 * - View: any authenticated user
 * - Create / Update / Delete: authenticated users (you can lock to roles if desired)
 */

// list + search
router.get('/', authenticateUser, spokeController.getSpokes);

// get single
router.get('/:id', authenticateUser, spokeController.getSpokeById);

// create
router.post('/', authenticateUser, spokeController.createSpoke);

// update
router.put('/:id', authenticateUser, spokeController.updateSpoke);

// delete
router.delete('/:id', authenticateUser, spokeController.deleteSpoke);

module.exports = router;
