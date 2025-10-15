const { Schema, model } = require('mongoose');

const floorSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true, 
      unique: true,
      minlength: [3, 'Name floor must be at least 3 characters long!'],
      maxlength: [100, 'Name floor must be at most 100 characters long!'],
    },
  },
  { timestamps: true }
);

module.exports = model('Floor', floorSchema);
