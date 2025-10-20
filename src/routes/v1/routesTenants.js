const express = require('express');
const router = express.Router();

const validateObjectId = require('../../middlewares/validateObjectId');
const tenantsController = require('../../controllers/tenantsController');

// /api/v1/rooms
router.get('/', tenantsController.listTenants);
router.post('/', tenantsController.createTenant);
router.get('/:id', validateObjectId('id'), tenantsController.getTenantById);
router.put('/:id', validateObjectId('id'), tenantsController.updateTenant);
router.delete('/:id', validateObjectId('id'), tenantsController.deleteTenant);

module.exports = router;