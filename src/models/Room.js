const { Schema, model } = require('mongoose');

const roomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    floor: { type: Number, min: 1, required: true },
    type: { 
      type: String,
      enum: ['single', 'double', 'family'],
      default: 'single',
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
    amenities: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model('Room', roomSchema);
