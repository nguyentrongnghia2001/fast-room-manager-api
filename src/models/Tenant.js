const { Schema, model } = require('mongoose');

const tenantSchema = new Schema(
  {
    name: { 
      type: String,
      required: [true, 'Name tenant is required!'],  
      trim: true,
      minlength: [3, 'Name tenant must be at least 3 characters long!'],
      maxlength: [100, 'Name tenant must be at most 100 characters long!'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required!'],
      minLEngth: [10, 'Phone must be at least 10 characters long!'],
      maxLength: [10, 'Phone must be at most 10 characters long!'],
    },
    email: {
      type: String,
      required: [true, 'Email is required!'],
      minLEngth: [10, 'Email must be at least 10 characters long!'],
      maxLength: [100, 'Email must be at most 100 characters long!'],
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address!']
    },
    idCard: {
      type: String,
      unique: true,
      required: [true, 'Id card is required!'],
      minLEngth: [10, 'Id card must be at least 10 characters long!'],
      maxLength: [12, 'Id card must be at most 12 characters long!'],
    },
    cardImages: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      required: [true, 'Address is required!'],
      minLEngth: [10, 'Address must be at least 10 characters long!'],
      maxLength: [100, 'Address must be at most 100 characters long!'],
    },
    emergencyContact: {
      type: String,
      minLEngth: [10, 'Emergency contact must be at least 10 characters long!'],
      maxLength: [100, 'Emergency contact must be at most 100 characters long!'],
    },
    emergencyContactPhone: {
      type: String,
      minLEngth: [10, 'Emergency contact phone must be at least 10 characters long!'],
      maxLength: [10, 'Emergency contact phone must be at most 10 characters long!'],
    },
    notes: {
      type: String,
      default: null,
    },
    status: { 
      type: String,
      enum: {
        values: ['active', 'inactive', 'terminated'],
        message: 'Status tenant is invalid! Must be active, inactive or terminated!',
      },
      default: 'active',
    }
  },
  { timestamps: true }
);

module.exports = model('Tenant', tenantSchema);
