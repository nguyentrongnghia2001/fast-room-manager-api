const { Schema, model } = require('mongoose');

const knowledgeDocSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['markdown', 'pdf', 'txt', 'docx', 'manual'],
      default: 'markdown',
    },
    filePath: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: [true, 'Document content is required'],
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    source: {
      type: String,
      enum: ['default', 'upload', 'manual'],
      default: 'default',
    },
    status: {
      type: String,
      enum: ['indexed', 'failed', 'processing'],
      default: 'indexed',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

knowledgeDocSchema.index({ fileName: 1 }, { unique: true });
knowledgeDocSchema.index({ status: 1 });

module.exports = model('KnowledgeDoc', knowledgeDocSchema);
