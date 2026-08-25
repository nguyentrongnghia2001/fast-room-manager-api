const { Schema, model } = require('mongoose');

const vectorEmbeddingsSchema = new Schema(
  {
    documentId: {
      type: String,
      required: [true, 'Document ID is required'],
      unique: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['room', 'document'],
      required: [true, 'Source type is required'],
      index: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
    text: {
      type: String,
      required: [true, 'Text content is required'],
    },
    embedding: {
      type: [Number],
      required: [true, 'Embedding vector is required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'Embedding must be a non-empty array of numbers',
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound indexes for metadata filtering
vectorEmbeddingsSchema.index({ sourceType: 1, 'metadata.status': 1 });
vectorEmbeddingsSchema.index({ sourceType: 1, 'metadata.price': 1 });
vectorEmbeddingsSchema.index({ sourceType: 1, 'metadata.roomType': 1 });

module.exports = model('VectorEmbeddings', vectorEmbeddingsSchema);
