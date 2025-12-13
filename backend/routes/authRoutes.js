// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
// const { loginUser } = require('../controllers/authController');
const authController = require('../controllers/authController');


// router.post('/login', loginUser);
router.post('/login', authController.login);

module.exports = router;
