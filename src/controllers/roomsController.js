import {
  StatusCodes,
} from 'http-status-codes';
const { successHandle } = require('../utils/successHandle');
const { listRooms, createRoom, updateRoom, deleteRoom, getRoomById } = require('../services/serviceRooms');

exports.listRooms = async (req, res, next) => {
  try {
    const rooms = await listRooms();
    res.status(StatusCodes.OK).json(successHandle(StatusCodes.OK, rooms, 'Rooms found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Request body is empty' });
    }
    if (!payload.name || payload.name.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room name is required' });
    }
    if (!payload.floor) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room floor is required' });
    }
    const room = await createRoom(payload);
    res.status(StatusCodes.CREATED).json(successHandle(StatusCodes.CREATED, room, 'Room created successfully'));
  } catch (err) {
    // Normalize common Mongoose errors
    if (err.name === 'ValidationError') err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    if (err.code === 11000) {
      err.statusCode = StatusCodes.CONFLICT;
      err.message = 'Duplicate key';
    }
    next(err);
  }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room ID is required' });
    const room = await getRoomById(id);
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandle(StatusCodes.OK, room, 'Room found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room ID is required' });
    const updates = req.body;
    const room = await updateRoom(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandle(StatusCodes.OK, room, 'Room updated successfully'));
  } catch (err) {
    if (err.name === 'ValidationError') err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    if (err.code === 11000) {
      err.statusCode = StatusCodes.CONFLICT;
      err.message = 'Duplicate key';
    }
    next(err);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room ID is required' });
    const room = await deleteRoom(id);
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.NO_CONTENT).json(successHandle(StatusCodes.NO_CONTENT, room, 'Room deleted successfully'));
  } catch (err) {
    next(err);
  }
};