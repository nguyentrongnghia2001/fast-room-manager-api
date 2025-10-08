Services

Purpose
- Contain core business logic independent of HTTP/Express.
- Interact with models (database), external systems, and enforce business rules.

Conventions
- Do not depend on req/res; accept plain data from controllers and return processed results.
- Throw Error instances for failures; controllers will catch and forward to the global error handler.
- Keep functions focused: list, getById, create, update, delete.

Example (roomService)
const Room = require('../models/Room');

async function list() {
  return Room.find().lean();
}

async function create(payload) {
  // Apply business rules here (example: capacity > 0)
  if (!payload || payload.capacity <= 0) {
    const err = new Error('Capacity must be greater than 0');
    err.statusCode = 422;
    throw err;
  }
  return Room.create(payload);
}

module.exports = { list, create };