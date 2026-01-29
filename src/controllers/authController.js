const { StatusCodes } = require('http-status-codes');
const catchAsync = require('../utils/catchAsync');
const authService = require('../services/serviceAuth');

const register = catchAsync(async (req, res) => {
  const { user, token } = await authService.createUser(req.body);
  res.status(StatusCodes.CREATED).send({ user, token });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUserWithEmailAndPassword(email, password);
  res.send({ user, token });
});

const getMe = catchAsync(async (req, res) => {
  // Assuming auth middleware adds user to req
  const user = await authService.getUserById(req.user.id);
  res.send(user);
});

module.exports = {
  register,
  login,
  getMe,
};
