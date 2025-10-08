const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[MongoDB] MONGO_URI is not set. Skipping database connection.');
    return false;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log('[MongoDB] Connected successfully');
    return true;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    return false;
  }
}

module.exports = { connectDB };