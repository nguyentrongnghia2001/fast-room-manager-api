// Centralized environment configuration
require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: Number(process.env.PORT || 3000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/room-manager',
};

module.exports = env;