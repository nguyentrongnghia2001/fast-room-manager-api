Routes

Purpose
- Define endpoints and attach corresponding controllers/middlewares.
- Organize by API versions and resources for scalability.
- Mount under the base path `/api` and versioned subpaths `/api/v1`, `/api/v2`, ...

Conventions
- Use express.Router for each API version and for each resource module.
- Attach dependency-check middlewares (e.g., dbReady) before controllers.
- Avoid business logic inside routes; delegate to controllers/services.
- Keep `/api/health` for aggregator health and `/api/v{n}/health` for version health.

Examples

Aggregator (src/routes/index.js)
```
const express = require('express');
const router = express.Router();
const v1 = require('./v1');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api', versions: ['v1'], timestamp: new Date().toISOString() });
});

router.use('/v1', v1);
module.exports = router;
```

Versioned rooms routes (src/routes/v1/routesRooms.js)
```
const express = require('express');
const router = express.Router();
const dbReady = require('../../middlewares/dbReady');
const validateObjectId = require('../../middlewares/validateObjectId');
const roomsCtrl = require('../../controllers/roomsController');

router.get('/', dbReady, roomsCtrl.listRooms);
router.post('/', dbReady, roomsCtrl.createRoom);
router.get('/:id', dbReady, validateObjectId('id'), roomsCtrl.getRoomById);
router.put('/:id', dbReady, validateObjectId('id'), roomsCtrl.updateRoom);
router.delete('/:id', dbReady, validateObjectId('id'), roomsCtrl.deleteRoom);

module.exports = router;
```