const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

const dbReady = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: 'Database not connected' });
  }
  next();
};

module.exports = dbReady;
