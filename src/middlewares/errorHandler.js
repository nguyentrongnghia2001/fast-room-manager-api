// Global error handler
module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${status} - ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    res.status(status).json({ error: 'An error occurred' });
  }
}
