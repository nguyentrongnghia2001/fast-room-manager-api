const express = require('express');
const router = express.Router();

// Health check under /api/v1
router.get('/health', (req, res) => {
  res.json({ status: 'ok', scope: 'api-v1', version: 'v1', timestamp: new Date().toISOString() });
});

// Rooms resource router
const roomsRoutes = require('./routesRooms');
const floorRoutes = require('./routesFloor');
const tenantsRoutes = require('./routesTenants');
const contractsRoutes = require('./routesContracts');
router.use('/rooms', roomsRoutes);
router.use('/floor', floorRoutes);
router.use('/tenant', tenantsRoutes);
router.use('/contract', contractsRoutes);

module.exports = router;

//  {
//     "id": "3",
//     "roomId": "68f32d331ce60823dc58d784",
//     "tenantId": "3",
//     "startDate": "2024-03-01",
//     "endDate": "2025-02-28",
//     "monthlyRent": 5000000,
//     "deposit": 10000000,
//     "status": "active",
//     "createdAt": "2024-03-01",
//     "updatedAt": "2024-03-01"
//   }