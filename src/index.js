require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  // Try connecting to MongoDB (non-fatal if not configured)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Fast Room Manager API running on http://localhost:${PORT}`);
  });
})();