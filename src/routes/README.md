Routes

Purpose
- Define endpoints and attach the corresponding controllers/middlewares.
- Organize by resources: rooms, bookings, users, etc.
- Mount under the base path `/api` (consider versioning `/api/v1`).

Conventions
- Use express.Router for each resource module.
- Attach dependency-check middlewares (e.g., dbReady) before controllers.
- Avoid business logic inside routes; delegate to controllers/services.

Example (index.js)
const express = require('express');
const router = express.Router();
const dbReady = require('../middlewares/dbReady');
const roomsCtrl = require('../controllers/roomsController');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api', timestamp: new Date().toISOString() });
});

router.get('/rooms', dbReady, roomsCtrl.listRooms);
router.post('/rooms', dbReady, roomsCtrl.createRoom);

module.exports = router;