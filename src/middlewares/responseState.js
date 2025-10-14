// Global error handler
const { StatusCodes } = require('http-status-codes');
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const isProd = process.env.NODE_ENV === 'production';

  // Log errors in non-production for easier debugging
  if (!isProd) {
    console.error(`[Error] ${status} - ${message}`);
    if (err.stack) console.error(err.stack);
  }

  // Always respond with JSON
  if (isProd) {
    return res.status(status).json({ error: 'An error occurred' });
  }

  const payload = { error: message };
  if (err.errors) payload.details = err.errors;
  return res.status(status).json(payload);
};

const notFoundHandler = (req, res, next) => {
  res.status(StatusCodes.NOT_FOUND).json({ error: 'Not Found', path: req.originalUrl });
};

const successHandler = (statusCode, data, message = 'Success') => ({
  statusCode,
  status: 'success',
  data,
  message,
});

module.exports = {
  errorHandler,
  notFoundHandler,
  successHandler,
};
