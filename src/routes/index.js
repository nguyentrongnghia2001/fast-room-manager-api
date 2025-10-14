const express = require('express');
const router = express.Router();
const v1 = require('./v1');
let v2;
try {
  v2 = require('./v2');
} catch (_) {
  v2 = null;
}

// Health check under /api (aggregator)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api', versions: ['v1'], timestamp: new Date().toISOString() });
});

// Mount versioned routers
router.use('/v1', v1);
if (v2) router.use('/v2', v2);

module.exports = router;