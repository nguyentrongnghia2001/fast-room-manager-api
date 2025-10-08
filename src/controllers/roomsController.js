const Room = require('../models/Room');

exports.listRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().lean();
    res.json({ data: rooms });
  } catch (err) {
    next(err);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ data: room });
  } catch (err) {
    next(err);
  }
};