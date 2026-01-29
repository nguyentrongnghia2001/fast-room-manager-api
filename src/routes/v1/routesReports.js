const express = require('express');
const reportsController = require('../../controllers/reportsController');

const router = express.Router();

router.get('/dashboard', reportsController.getDashboardStats);
router.get('/revenue', reportsController.getRevenueStats);

module.exports = router;
