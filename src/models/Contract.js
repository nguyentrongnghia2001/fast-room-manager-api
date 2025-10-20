const { Schema, model } = require('mongoose');

const contractSchema = new Schema(
  {
    roomId: {
      type: String,
      ref: 'Room',
      required: [true, 'Room ID is required!'],
    },
    tenantId: {
      type: String,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required!'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required!'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required!'],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: 'End date must be after start date!',
      },
    },
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required!'],
      min: [0, 'Monthly rent must be at least 0!'],
    },
    deposit: {
      type: Number,
      required: [true, 'Deposit is required!'],
      min: [0, 'Deposit must be at least 0!'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'terminated'],
        message: 'Status is invalid! Must be active, expired or terminated!',
      },
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = model('Contract', contractSchema);