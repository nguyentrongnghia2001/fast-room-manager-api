const express = require('express');
const router = express.Router();

const validateObjectId = require('../../middlewares/validateObjectId');
const roomsController = require('../../controllers/roomsController');

// /api/v1/rooms
router.get('/', roomsController.listRooms);
router.post('/', roomsController.createRoom);
router.get('/:id', validateObjectId('id'), roomsController.getRoomById);
router.put('/:id', validateObjectId('id'), roomsController.updateRoom);
router.delete('/:id', validateObjectId('id'), roomsController.deleteRoom);

module.exports = router;