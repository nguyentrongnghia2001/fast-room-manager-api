# fast-room-manager-api

Node.js (Express) API for managing rooms. This repository is initialized with a minimal, secure Express setup and clear project rules.

## Features
- Secure Express setup (helmet, CORS, JSON parsing, logging)
- Health endpoints: `/health`, `/api/health`
- MongoDB integration via Mongoose (optional; app runs even if DB is not set)
- Room resource: list and create endpoints
- Centralized error handling and 404 handling

## Tech Stack
- Node.js (LTS)
- Express.js
- MongoDB + Mongoose
- dotenv, helmet, cors, morgan
- nodemon (development)

## Getting Started

### Prerequisites
- Node.js LTS
- npm

### Setup
```
npm install
cp .env.example .env
# Edit .env as needed
```

### Run
```
npm run dev   # start with nodemon
# or
npm start     # start with node
```

Server runs at `http://localhost:3000` by default.

### Endpoints
- `GET /health` – Root health check
- `GET /api/health` – API-scoped health check
- `GET /api/v1/health` – API v1 health check
- `GET /api/v1/rooms` – List rooms (requires MongoDB connection)
- `POST /api/v1/rooms` – Create a room (requires MongoDB connection)
- `GET /api/v1/rooms/:id` – Get room details
- `PUT /api/v1/rooms/:id` – Update a room
- `DELETE /api/v1/rooms/:id` – Delete a room

## Project Structure
```
src/
  index.js       # server entry
  app.js         # express app & middlewares
  routes/        # base routes
  middlewares/   # notFound & errorHandler
  models/        # Mongoose models
  controllers/   # HTTP handlers
  config/        # env and db connection
```

## Project Rules
See `.trae/rules/project_rules.md` for conventions and best practices.

## MongoDB Setup

### Option A: Local MongoDB
1. Install MongoDB Community Server
2. Start MongoDB service
3. Set `MONGO_URI` in `.env` (example already provided):
   `MONGO_URI=mongodb://127.0.0.1:27017/fast_room_manager_dev`

### Option B: MongoDB Atlas
1. Create a free cluster
2. Whitelist your IP
3. Get connection string and set `MONGO_URI` in `.env`:
   `MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

After setting `MONGO_URI`, restart dev server (`npm run dev`).

## Environment Variables
- `PORT` – API port (default: 3000)
- `NODE_ENV` – Environment name (development/production)
- `MONGO_URI` – MongoDB connection string

## API Design & Versioning
- Base path: `/api` (consider versioning via `/api/v1`).
- RESTful resources (nouns) with standard HTTP verbs.
- Consistent JSON responses.

## Error Format
Errors are returned with a consistent JSON structure:
```
{
  "error": "Message describing the error",
  "details": { /* optional */ }
}
```
- 404: `{ error: "Not Found" }`
- 503 (DB not connected): `{ error: "Database not connected" }`
- 500: `{ error: "Internal Server Error" }`

## Scripts
- `npm run dev` – start development server with nodemon
- `npm start` – start production server

## Documentation
- See `src/*/README.md` for folder-specific conventions.
- See `docs/api.md` for endpoint details and examples.

## Contributing
1. Fork and clone the repository
2. Create a feature branch: `feat/<feature-name>`
3. Follow project rules and conventions
4. Open a PR with a clear description

## License
ISC (see package.json). You may adapt and use this code under the terms of the ISC License.