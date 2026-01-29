const express = require('express');
const authController = require('../../controllers/authController');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);

module.exports = router;
