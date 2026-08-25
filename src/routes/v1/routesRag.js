const express = require('express');
const multer = require('multer');
const router = express.Router();

const auth = require('../../middlewares/auth');
const validateObjectId = require('../../middlewares/validateObjectId');
const ragController = require('../../controllers/ragController');

// Multer in-memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// /api/v1/rag
router.post('/sync', auth, ragController.syncKnowledgeBase);
router.post('/documents', auth, upload.single('file'), ragController.createDocument);
router.get('/documents', auth, ragController.listDocuments);
router.get('/documents/:id', auth, validateObjectId('id'), ragController.getDocumentById);
router.delete('/documents/:id', auth, validateObjectId('id'), ragController.deleteDocument);
router.post('/test-query', ragController.testQuery);

module.exports = router;
