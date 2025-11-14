const Room = require('../models/Room');
const { StatusCodes } = require('http-status-codes');

async function listRooms(skip, limit, params, sort) {
  const query = {};
  
  // Search filter
  if (params.search) {
    const regex = new RegExp(params.search, 'i');
    query.$or = [
      { name: regex },
      { description: regex },
    ];
  }

  // Status filter
  if (params.status) {
    query.status = params.status;
  }
  
  // Type filter
  if (params.type) {
    query.type = params.type === 'all' ? { $ne: null } : params.type;
  }

  // Get total count first (before pagination)
  const totalItems = await Room.countDocuments(query);

  // Get rooms with pagination
  let roomsQuery = Room.find(query)
    .populate('idFloor')
    .skip(skip)
    .limit(limit)
    .sort(sort);

  let rooms = await roomsQuery.lean() || [];

  // Filter by floor name if provided (after populate)
  if (params.floor) {
    rooms = rooms.filter(room => 
      room.idFloor && 
      room.idFloor.name && 
      room.idFloor.name.toLowerCase().includes(params.floor.toLowerCase())
    );
  }

  return { rooms, totalItems };
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
  const room = await Room.findById(id).populate('idFloor').lean(); 
  return room;
}

module.exports = { listRooms, createRoom, updateRoom, deleteRoom, getRoomById };
