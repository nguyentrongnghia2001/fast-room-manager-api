const express = require('express');
const router = express.Router();
const dbReady = require('../middlewares/dbReady');
const roomsCtrl = require('../controllers/roomsController');

// Health check under /api
router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api', timestamp: new Date().toISOString() });
});

// Rooms (requires DB)
router.get('/rooms', dbReady, roomsCtrl.listRooms);
router.post('/rooms', dbReady, roomsCtrl.createRoom);

module.exports = router;