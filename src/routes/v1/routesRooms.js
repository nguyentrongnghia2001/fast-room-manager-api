const express = require('express');
const router = express.Router();

const dbReady = require('../../middlewares/dbReady');
const validateObjectId = require('../../middlewares/validateObjectId');
const roomsController = require('../../controllers/roomsController');

// /api/v1/rooms
router.get('/', dbReady, roomsController.listRooms);
router.post('/', dbReady, roomsController.createRoom);
router.get('/:id', dbReady, validateObjectId('id'), roomsController.getRoomById);
router.put('/:id', dbReady, validateObjectId('id'), roomsController.updateRoom);
router.delete('/:id', dbReady, validateObjectId('id'), roomsController.deleteRoom);

module.exports = router;