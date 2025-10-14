const Room = require('../models/Room');
const { StatusCodes } = require('http-status-codes');

async function listRooms() {
  const rooms = await Room.find().lean();
  return rooms;
}

async function createRoom(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  // Apply business rules here (example: capacity > 0)
  if (!payload.name || payload.name.trim() === '') {
    const err = new Error('Room name is required');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  if (!payload.floor) {
    const err = new Error('Room floor is required');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  const room = await Room.create(payload);
  return room;
}

async function updateRoom(id, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  if (!payload || payload.name.trim() === '') {
    const err = new Error('Room name is required');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  if (!payload.floor) {
    const err = new Error('Room floor is required');
    err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    throw err;
  }
  const room = await Room.findByIdAndUpdate(id, payload, { new: true });
  return room;
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
