const Room = require('../models/Room');
const { StatusCodes } = require('http-status-codes');

async function listRooms() {
  const rooms = await Room.find().lean() || [];
  return rooms;
}

async function createRoom(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const room = await Room.create(payload) || {};
  return room;
}

async function updateRoom(id, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const room = await Room.findByIdAndUpdate(id, payload, { new: true }) || {};
  return room;
}

async function deleteRoom(id) {
  const room = await Room.findByIdAndDelete(id) || {};
  return room;
}

async function getRoomById(id) {
  const room = await Room.findById(id) || {};
  return room;
}

module.exports = { listRooms, createRoom, updateRoom, deleteRoom, getRoomById };
