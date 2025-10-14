const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const responseState = require('./middlewares/responseState');
const { errorHandler, notFoundHandler } = responseState;



const app = express();

// Security & common middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Base routes
app.use('/api', routes);

// Health endpoint (root)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fast-room-manager-api', timestamp: new Date().toISOString() });
});

// 404 and error handling
app.use(errorHandler);
// 400 handler
app.use(notFoundHandler);

module.exports = app;