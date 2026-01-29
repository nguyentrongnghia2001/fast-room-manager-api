const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Please authenticate');
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch (error) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Please authenticate'));
  }
};

module.exports = verifyToken;
