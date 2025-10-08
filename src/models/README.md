Models

Purpose
- Define Mongoose schemas and models.
- Manage data structure, constraints, indexes, and plugins.

Conventions
- Enable `{ timestamps: true }` to get createdAt/updatedAt automatically.
- Use schema validators (required, enum, min/max, trim, unique).
- Use `.lean()` for read queries when you don’t need document methods for better performance.
- Add necessary indexes (unique, compound) to ensure integrity.

Example (Room.js)
const { Schema, model } = require('mongoose');

const roomSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
}, { timestamps: true });

module.exports = model('Room', roomSchema);