const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const roomService = require('../services/serviceRooms');

exports.listRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.listRooms();
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, rooms, 'Rooms found successfully'));
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
    const room = await roomService.createRoom(payload);
    res.status(StatusCodes.CREATED).json(successHandler(StatusCodes.CREATED, room, 'Room created successfully'));
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
    const room = await roomService.getRoomById(id);
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, room, 'Room found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room ID is required' });
    const updates = req.body;
    const room = await roomService.updateRoom(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, room, 'Room updated successfully'));
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
    const room = await roomService.deleteRoom(id);
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.NO_CONTENT).json(successHandler(StatusCodes.NO_CONTENT, room, 'Room deleted successfully'));
  } catch (err) {
    next(err);
  }
};