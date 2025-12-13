const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/:accountId', userController.getUsersByAccount);
router.get('/i/:id', userController.getUserById);
router.put('/i/:id', userController.updateUser);

module.exports = router;
