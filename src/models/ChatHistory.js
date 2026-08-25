const { Schema, model } = require('mongoose');

const messageItemSchema = new Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'bot', 'system'],
      required: [true, 'Message sender is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
    },
    sources: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    intent: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatHistorySchema = new Schema(
  {
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messages: [messageItemSchema],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index to quickly cleanup stale sessions if needed
chatHistorySchema.index({ lastActivity: -1 });

module.exports = model('ChatHistory', chatHistorySchema);
