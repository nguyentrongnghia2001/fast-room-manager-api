const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const floorService = require('../services/serviceFloor');

exports.listFloors = async (req, res, next) => {
  try {
    const floors = await floorService.listFloors() || [];
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, floors, 'Floors found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.createFloor = async (req, res, next) => {
  try {
    const payload = req.body;
    const floor = await floorService.createFloor(payload) || {};
    res.status(StatusCodes.CREATED).json(successHandler(StatusCodes.CREATED, floor, 'Floor created successfully'));
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

exports.getFloorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const floor = await floorService.getFloorById(id);
    if (!floor) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Floor not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, floor, 'Floor found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.updateFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const floor = await floorService.updateFloor(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!floor) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Floor not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, floor, 'Floor updated successfully'));
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

exports.deleteFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const floor = await floorService.deleteFloor(id);
    if (!floor) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Floor not found' });
    res.status(StatusCodes.NO_CONTENT).json(successHandler(StatusCodes.NO_CONTENT, floor, 'Floor deleted successfully'));
  } catch (err) {
    next(err);
  }
};