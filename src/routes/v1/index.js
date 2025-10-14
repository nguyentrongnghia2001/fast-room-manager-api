const express = require('express');
const router = express.Router();

// Health check under /api/v1
router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api-v1', version: 'v1', timestamp: new Date().toISOString() });
});

// Rooms resource router
const roomsRoutes = require('./routesRooms');
router.use('/rooms', roomsRoutes);

module.exports = router;