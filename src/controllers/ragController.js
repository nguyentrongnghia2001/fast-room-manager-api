const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const serviceRag = require('../services/serviceRag');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const ApiError = require('../utils/ApiError');

/**
 * Trigger full RAG re-index (Rooms + Documents)
 */
exports.syncKnowledgeBase = async (req, res, next) => {
  try {
    const result = await serviceRag.syncAll();
    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, result, 'RAG Knowledge base synchronized successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Upload & index new knowledge document
 */
exports.createDocument = async (req, res, next) => {
  try {
    let title = req.body.title;
    let content = req.body.content;
    let fileName = req.body.fileName;
    let fileType = req.body.fileType || 'markdown';
    let filePath = null;

    // Handle file upload via multer if file is present
    if (req.file) {
      fileName = req.file.originalname;
      filePath = req.file.path || null;
      if (!title) {
        title = fileName.replace(/\.[^/.]+$/, '');
      }
      content = await serviceRag.parseDocumentBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
      if (fileName.endsWith('.pdf')) fileType = 'pdf';
      else if (fileName.endsWith('.txt')) fileType = 'txt';
      else fileType = 'markdown';
    }

    if (!title || !content) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Document title and content (or file) are required');
    }

    if (!fileName) {
      fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${fileType === 'pdf' ? 'pdf' : 'md'}`;
    }

    // Check if filename already exists
    let doc = await KnowledgeDoc.findOne({ fileName });
    if (doc) {
      doc.title = title;
      doc.content = content;
      doc.fileType = fileType;
      doc.filePath = filePath;
      doc.status = 'processing';
      await doc.save();
    } else {
      doc = await KnowledgeDoc.create({
        title,
        fileName,
        fileType,
        filePath,
        content,
        source: 'upload',
        status: 'processing',
      });
    }

    // Index into vector store
    await serviceRag.syncKnowledgeDocToVectorStore(doc._id);

    const updatedDoc = await KnowledgeDoc.findById(doc._id);
    return res
      .status(StatusCodes.CREATED)
      .json(successHandler(StatusCodes.CREATED, updatedDoc, 'Document indexed successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * List all knowledge documents
 */
exports.listDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.per_page, 10) || 20;
    const skip = (page - 1) * limit;

    const totalItems = await KnowledgeDoc.countDocuments();
    const documents = await KnowledgeDoc.find()
      .select('-content') // Exclude raw text for lighter list response
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const result = {
      items: documents,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
      },
    };

    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, result, 'Documents retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get single knowledge document by ID
 */
exports.getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await KnowledgeDoc.findById(id).lean();
    if (!doc) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Knowledge document not found');
    }
    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, doc, 'Document found successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Delete knowledge document & its vector embeddings
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await KnowledgeDoc.findById(id);
    if (!doc) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Knowledge document not found');
    }

    await serviceRag.deleteKnowledgeDocFromVectorStore(id);
    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, null, 'Document and vector embeddings deleted successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Test semantic vector retrieval context
 */
exports.testQuery = async (req, res, next) => {
  try {
    const { query, filter, topK, minScore } = req.body;
    if (!query) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Field "query" is required');
    }

    const results = await serviceRag.retrieveRelevantContext(query, {
      filter,
      topK: topK || 5,
      minScore: minScore !== undefined ? minScore : 0.2,
    });

    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, { query, count: results.length, matches: results }, 'Retrieval executed successfully'));
  } catch (err) {
    next(err);
  }
};
