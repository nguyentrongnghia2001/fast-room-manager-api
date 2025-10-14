const express = require('express');
const router = express.Router();

// Health check under /api/v2
router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api-v2', version: 'v2', timestamp: new Date().toISOString() });
});

// Placeholder: routes to be added in future versions
// e.g., router.use('/rooms', roomsV2Routes);

module.exports = router;