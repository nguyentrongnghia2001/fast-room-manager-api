Config

Purpose
- Manage environment configuration and infrastructure connections.

Files
- env.js: reads environment variables via dotenv and exposes normalized configuration values.
  - NODE_ENV
  - PORT
- db.js: connects to MongoDB using Mongoose.
  - connectDB() attempts connection if MONGO_URI is present; logs a warning and lets the app run if missing.

Usage
- Load dotenv early in the entry (src/index.js) and call connectDB before app.listen.
- Set MONGO_URI in .env (see .env.example).

Notes
- Do not commit .env to the repository (already ignored).
- In production, supply environment variables via deployment systems (CI/CD, container secrets, etc.).