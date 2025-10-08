const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

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
app.use(notFound);
app.use(errorHandler);

module.exports = app;