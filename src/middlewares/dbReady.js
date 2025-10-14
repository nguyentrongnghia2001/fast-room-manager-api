const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: 'Database not connected' });
  }
  next();
};