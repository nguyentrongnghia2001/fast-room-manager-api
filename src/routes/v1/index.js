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
const authRoutes = require('./routesAuth');
const paymentsRoutes = require('./routesPayments');
const reportsRoutes = require('./routesReports');
const chatRoutes = require('./routesChat');
const ragRoutes = require('./routesRag');

router.use('/rooms', roomsRoutes);
router.use('/floor', floorRoutes);
router.use('/tenant', tenantsRoutes);
router.use('/contract', contractsRoutes);
router.use('/auth', authRoutes);
router.use('/payments', paymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/chat', chatRoutes);
router.use('/rag', ragRoutes);

module.exports = router;