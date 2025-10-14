const Room = require('../models/Room');
const { StatusCodes } = require('http-status-codes');

async function listRooms() {
  return Room.find().lean();
}

async function createRoom(payload) {
  // Apply business rules here (example: capacity > 0)
  if (!payload || payload.capacity <= 0) {
    const err = new Error('Capacity must be greater than 0');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  return Room.create(payload);
}

async function updateRoom(id, payload) {
  // Apply business rules here (example: capacity > 0)
  if (!payload || payload.capacity <= 0) {
    const err = new Error('Capacity must be greater than 0');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  return Room.findByIdAndUpdate(id, payload, { new: true });
}

async function deleteRoom(id) {
    const room = await Room.findByIdAndDelete(id);
    if (!room) {
        const err = new Error('Room not found');
        err.statusCode = StatusCodes.NOT_FOUND;
        throw err;
    }
    return room;
}

async function getRoomById(id) {
    const room = await Room.findById(id);
    if (!room) {
        const err = new Error('Room not found');
        err.statusCode = StatusCodes.NOT_FOUND;
        throw err;
    }
    return room;
}


module.exports = { listRooms, createRoom, updateRoom, deleteRoom, getRoomById };
