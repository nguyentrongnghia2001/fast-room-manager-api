const express = require('express');
const router = express.Router();

const validateObjectId = require('../../middlewares/validateObjectId');
const floorController = require('../../controllers/floorController');

// /api/v1/floors
router.get('/', floorController.listFloors);
router.post('/', floorController.createFloor);
router.get('/:id', validateObjectId('id'), floorController.getFloorById);
router.put('/:id', validateObjectId('id'), floorController.updateFloor);
router.delete('/:id', validateObjectId('id'), floorController.deleteFloor);

module.exports = router;