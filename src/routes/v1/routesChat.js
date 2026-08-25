const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/chatController');

// /api/v1/chat
router.post('/', chatController.sendMessage);
router.get('/history/:sessionId', chatController.getHistory);
router.delete('/history/:sessionId', chatController.clearHistory);

module.exports = router;
