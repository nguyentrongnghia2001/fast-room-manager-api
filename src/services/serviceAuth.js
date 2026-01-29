const httpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const generateToken = (userId) => {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (env.JWT_ACCESS_EXPIRATION_MINUTES * 60),
  };
  return jwt.sign(payload, env.JWT_SECRET);
};

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.StatusCodes.UNAUTHORIZED, 'Incorrect email or password');
  }
  const token = generateToken(user.id);
  return { user, token };
};

const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.StatusCodes.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  const token = generateToken(user.id);
  return { user, token };
};

const getUserById = async (id) => {
  return User.findById(id);
};

module.exports = {
  loginUserWithEmailAndPassword,
  createUser,
  getUserById,
};
