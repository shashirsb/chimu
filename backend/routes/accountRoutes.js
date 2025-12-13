const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccountById);
router.post('/', accountController.createAccount);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);
router.get('/name/:accountName', accountController.getAccountByName);


// ✅ This is where it belongs
router.put('/:id/users', accountController.updateAccountUsers);

module.exports = router;
