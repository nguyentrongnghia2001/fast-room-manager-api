const express = require('express');
const router = express.Router();

const validateObjectId = require('../../middlewares/validateObjectId');
const contractsController = require('../../controllers/contractsController');

// /api/v1/rooms
router.get('/', contractsController.listContracts);
router.post('/', contractsController.createContract);
router.get('/:id', validateObjectId('id'), contractsController.getContractById);
router.put('/:id', validateObjectId('id'), contractsController.updateContract);
router.delete('/:id', validateObjectId('id'), contractsController.deleteContract);

module.exports = router;