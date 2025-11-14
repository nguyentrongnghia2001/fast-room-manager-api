const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const roomService = require('../services/serviceRooms');

exports.listRooms = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Page number must be greater than 0' 
      });
    }
    if (limit < 1 || limit > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Limit must be between 1 and 100' 
      });
    }
    
    // Filter parameters
    const params = {
      search: req.query.search || '',
      status: req.query.status || '',
      type: req.query.type || '',
      floor: req.query.floor || '',
    };

    // Sort parameters
    let sort = {};
    if(req.query.sort) {
      sort.createdAt = parseInt(req.query.sort) || -1;
    }

    const { rooms, totalItems } = await roomService.listRooms(skip, limit, params, sort);
    
    const result = {
      items: rooms,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems
      }
    };
    
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, result, 'Rooms found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const payload = req.body;
    const room = await roomService.createRoom(payload);
    res.status(StatusCodes.CREATED).json(successHandler(StatusCodes.CREATED, room, 'Room created successfully'));
  } catch (err) {
    // Normalize common Mongoose errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
      err.message = 'Validation error: ' + messages.join(', ');
    };
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
    const updates = req.body;
    const room = await roomService.updateRoom(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, room, 'Room updated successfully'));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
      err.message = 'Validation error: ' + messages.join(', ');
    };
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
    const room = await roomService.deleteRoom(id);
    if (!room) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Room not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, room, 'Room deleted successfully'));
  } catch (err) {
    next(err);
  }
};