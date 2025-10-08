const { Schema, model } = require('mongoose');

const roomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    capacity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
  },
  { timestamps: true }
);

module.exports = model('Room', roomSchema);