const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');

// Validate MongoDB ObjectId in route params
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid ID format' });
  }
  next();
};

module.exports = validateObjectId;