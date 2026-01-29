// Centralized environment configuration
require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: Number(process.env.PORT || 3000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/room-manager',
  JWT_SECRET: process.env.JWT_SECRET || 'thisisasupersecret',
  JWT_ACCESS_EXPIRATION_MINUTES: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
};

module.exports = env;