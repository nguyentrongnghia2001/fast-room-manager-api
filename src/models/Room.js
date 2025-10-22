const { Schema, model } = require('mongoose');

const roomSchema = new Schema(
  {
    name: { 
      type: String,
      required: [true, 'Name room is required!'],  
      trim: true,
      minlength: [3, 'Name room must be at least 3 characters long!'],
      maxlength: [100, 'Name room must be at most 100 characters long!'],
    },
    idFloor: { 
      type: Schema.Types.ObjectId, 
      ref: 'Floor', 
      required: [true, 'Id floor is required!']
    },
    type: { 
      type: String,
      enum: {
        values: ['single', 'double', 'family'],
        message: 'Type room is invalid! Must be single, double or family!',
      },
      default: 'single',
    },
    area: { 
      type: Number,
      default: 0,
      min: [0, 'Area room must be at least 0!'],
      max: [1000, 'Area room must be at most 1000!'],
    },
    price: { 
      type: Number,
      required: [true, 'Price room is required!'],
      min: [500000, 'Price room must be at least 500000!'],
    },
    deposit: { 
      type: Number,
      required: [true, 'Deposit room is required!'],
      min: [500000, 'Deposit room must be at least 500000!'],
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'occupied', 'maintenance'],
        message: 'Status room is invalid! Must be available, occupied or maintenance!',
      },
      default: 'available',
    },
    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.every((item) => typeof item === 'string' && item.trim() !== '');
        },
        message: 'Amenities room must be an array of strings!',
      },
    },
    description: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model('Room', roomSchema);
