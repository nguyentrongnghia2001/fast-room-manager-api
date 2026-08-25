const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Room = require('../models/Room');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const VectorEmbeddings = require('../models/VectorEmbeddings');
const serviceEmbedding = require('./serviceEmbedding');
const { cosineSimilarity } = require('../config/vectorDb');
const env = require('../config/env');

/**
 * Split text into semantic chunks respecting markdown headings and paragraph boundaries
 * @param {string} text
 * @param {Object} options
 * @param {number} options.chunkSize
 * @param {number} options.chunkOverlap
 * @returns {Array<{ text: string, header: string, chunkIndex: number }>}
 */
function chunkMarkdown(text, { chunkSize = 500, chunkOverlap = 100 } = {}) {
  if (!text) return [];

  const lines = text.split('\n');
  const sections = [];
  let currentHeader = 'Tổng quan';
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentContent.length > 0) {
        sections.push({
          header: currentHeader,
          content: currentContent.join('\n').trim(),
        });
        currentContent = [];
      }
      currentHeader = trimmed.replace(/^#+\s*/, '');
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      header: currentHeader,
      content: currentContent.join('\n').trim(),
    });
  }

  const chunks = [];
  let globalIndex = 0;

  for (const section of sections) {
    const sectionText = section.content;
    if (!sectionText) continue;

    // Prefix header context
    const fullText = `[Chủ đề: ${section.header}]\n${sectionText}`;

    if (fullText.length <= chunkSize) {
      chunks.push({
        text: fullText,
        header: section.header,
        chunkIndex: globalIndex++,
      });
    } else {
      // Split into sub-chunks by paragraphs or sentences
      const paragraphs = sectionText.split(/\n\n+/);
      let buffer = `[Chủ đề: ${section.header}]\n`;

      for (const para of paragraphs) {
        if ((buffer + '\n' + para).length <= chunkSize) {
          buffer += (buffer.endsWith('\n') ? '' : '\n\n') + para;
        } else {
          if (buffer.length > `[Chủ đề: ${section.header}]\n`.length) {
            chunks.push({
              text: buffer.trim(),
              header: section.header,
              chunkIndex: globalIndex++,
            });
          }
          // Overlap: keep last sentence/part or prefix
          buffer = `[Chủ đề: ${section.header} (tiếp)]\n${para}`;
        }
      }

      if (buffer.length > `[Chủ đề: ${section.header} (tiếp)]\n`.length) {
        chunks.push({
          text: buffer.trim(),
          header: section.header,
          chunkIndex: globalIndex++,
        });
      }
    }
  }

  return chunks;
}

/**
 * Format room data into semantic Vietnamese text
 * @param {Object} room
 * @returns {string}
 */
function serializeRoomToText(room) {
  const floorName = room.idFloor?.name || (typeof room.idFloor === 'string' ? room.idFloor : 'Chưa phân tầng');
  const typeMap = {
    single: 'Phòng đơn (single)',
    double: 'Phòng đôi (double)',
    family: 'Phòng gia đình (family)',
  };
  const statusMap = {
    available: 'Còn trống (available)',
    occupied: 'Đã có người thuê (occupied)',
    maintenance: 'Đang bảo trì (maintenance)',
  };

  const formattedPrice = room.price ? `${room.price.toLocaleString('vi-VN')} VNĐ/tháng` : 'Chưa cập nhật';
  const formattedDeposit = room.deposit ? `${room.deposit.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật';
  const amenitiesList = Array.isArray(room.amenities) && room.amenities.length > 0
    ? room.amenities.join(', ')
    : 'Không có tiện ích đặc biệt';
  const desc = room.description ? ` Mô tả: ${room.description}.` : '';

  return `Phòng: ${room.name} (${floorName}). Loại phòng: ${typeMap[room.type] || room.type}. Diện tích: ${room.area || 0} m2. Giá thuê: ${formattedPrice}. Tiền cọc: ${formattedDeposit}. Trạng thái: ${statusMap[room.status] || room.status}. Tiện ích: ${amenitiesList}.${desc}`;
}

/**
 * Sync a single room to VectorEmbeddings collection
 * @param {string} roomId
 */
async function syncRoomToVectorStore(roomId) {
  try {
    const room = await Room.findById(roomId).populate('idFloor').lean();
    if (!room) {
      await deleteRoomFromVectorStore(roomId);
      return;
    }

    const text = serializeRoomToText(room);
    const embedding = await serviceEmbedding.generateEmbedding(text);
    const floorName = room.idFloor?.name || '';

    const metadata = {
      type: 'room_data',
      roomId: room._id.toString(),
      name: room.name,
      floor: floorName,
      roomType: room.type,
      price: room.price,
      deposit: room.deposit,
      status: room.status,
      area: room.area,
      amenities: room.amenities || [],
    };

    await VectorEmbeddings.findOneAndUpdate(
      { documentId: `room_${room._id.toString()}` },
      {
        documentId: `room_${room._id.toString()}`,
        sourceType: 'room',
        sourceId: room._id,
        chunkIndex: 0,
        text,
        embedding,
        metadata,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error(`[RAG Sync Error] Failed to sync room ${roomId}: ${err.message}`);
  }
}

/**
 * Delete a room from VectorEmbeddings collection
 * @param {string} roomId
 */
async function deleteRoomFromVectorStore(roomId) {
  try {
    await VectorEmbeddings.deleteMany({
      $or: [
        { documentId: `room_${roomId}` },
        { sourceId: roomId },
      ],
    });
  } catch (err) {
    console.error(`[RAG Sync Error] Failed to delete room vector ${roomId}: ${err.message}`);
  }
}

/**
 * Sync a KnowledgeDoc record to VectorEmbeddings collection
 * @param {string} docId
 */
async function syncKnowledgeDocToVectorStore(docId) {
  try {
    const doc = await KnowledgeDoc.findById(docId);
    if (!doc) return;

    // Delete existing chunks for this doc
    await VectorEmbeddings.deleteMany({ sourceId: doc._id });

    const chunks = chunkMarkdown(doc.content, { chunkSize: 500, chunkOverlap: 100 });
    const texts = chunks.map((c) => c.text);
    const embeddings = await serviceEmbedding.generateEmbeddings(texts);

    const operations = chunks.map((chunk, index) => ({
      documentId: `doc_${doc._id.toString()}_${chunk.chunkIndex}`,
      sourceType: 'document',
      sourceId: doc._id,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: embeddings[index],
      metadata: {
        type: 'knowledge_doc',
        docId: doc._id.toString(),
        title: doc.title,
        fileName: doc.fileName,
        header: chunk.header,
        fileType: doc.fileType,
      },
    }));

    if (operations.length > 0) {
      await VectorEmbeddings.insertMany(operations);
    }

    doc.chunkCount = chunks.length;
    doc.status = 'indexed';
    await doc.save();
  } catch (err) {
    console.error(`[RAG Sync Error] Failed to sync knowledge doc ${docId}: ${err.message}`);
    await KnowledgeDoc.findByIdAndUpdate(docId, { status: 'failed' });
  }
}

/**
 * Delete a KnowledgeDoc and its vectors
 * @param {string} docId
 */
async function deleteKnowledgeDocFromVectorStore(docId) {
  try {
    await VectorEmbeddings.deleteMany({ sourceId: docId });
    await KnowledgeDoc.findByIdAndDelete(docId);
  } catch (err) {
    console.error(`[RAG Sync Error] Failed to delete knowledge doc ${docId}: ${err.message}`);
  }
}

/**
 * Seed & sync default knowledge markdown files
 */
async function syncDefaultKnowledgeDocs() {
  const possiblePaths = [
    path.join(__dirname, '../docs/knowledge'),
    path.join(__dirname, '../../docs/knowledge'),
  ];

  let knowledgeDir = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      knowledgeDir = p;
      break;
    }
  }

  if (!knowledgeDir) {
    return { count: 0 };
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
  let synced = 0;

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.[^/.]+$/, '');

    let doc = await KnowledgeDoc.findOne({ fileName: file });
    if (!doc) {
      doc = await KnowledgeDoc.create({
        title,
        fileName: file,
        fileType: file.endsWith('.md') ? 'markdown' : 'txt',
        filePath,
        content,
        source: 'default',
        status: 'processing',
      });
    } else {
      doc.content = content;
      doc.title = title;
      doc.status = 'processing';
      await doc.save();
    }

    await syncKnowledgeDocToVectorStore(doc._id);
    synced++;
  }

  return { count: synced };
}

/**
 * Batch sync all rooms & documents into vector store
 */
async function syncAll() {
  // 1. Sync default docs
  const docResult = await syncDefaultKnowledgeDocs();

  // 2. Sync custom uploaded docs
  const customDocs = await KnowledgeDoc.find({ source: 'upload' });
  for (const doc of customDocs) {
    await syncKnowledgeDocToVectorStore(doc._id);
  }

  // 3. Sync all rooms
  const rooms = await Room.find({}).populate('idFloor').lean();
  let roomCount = 0;
  for (const room of rooms) {
    await syncRoomToVectorStore(room._id);
    roomCount++;
  }

  const totalVectors = await VectorEmbeddings.countDocuments();

  return {
    roomsSynced: roomCount,
    docsSynced: docResult.count + customDocs.length,
    totalVectors,
  };
}

/**
 * Hybrid search: Combines vector similarity with metadata filtering and keyword boosts
 * @param {string} query - User search query
 * @param {Object} options
 * @param {Object} [options.filter] - Structured filters (status, maxPrice, minPrice, roomType, floor, sourceType)
 * @param {number} [options.topK=5]
 * @param {number} [options.minScore=0.4]
 * @returns {Promise<Array<{ text: string, score: number, metadata: Object, sourceType: string }>>}
 */
async function retrieveRelevantContext(query, options = {}) {
  const topK = options.topK || env.VECTOR_TOP_K || 5;
  const minScore = options.minScore !== undefined ? options.minScore : (env.VECTOR_SIMILARITY_THRESHOLD || 0.4);
  const filter = options.filter || {};

  // 1. Generate query embedding
  const queryEmbedding = await serviceEmbedding.generateEmbedding(query);

  // 2. Build MongoDB query filter
  const mongoQuery = {};
  if (filter.sourceType) {
    mongoQuery.sourceType = filter.sourceType;
  }
  if (filter.status) {
    mongoQuery['metadata.status'] = filter.status;
  }
  if (filter.roomType && filter.roomType !== 'all') {
    mongoQuery['metadata.roomType'] = filter.roomType;
  }
  if (filter.maxPrice) {
    mongoQuery['metadata.price'] = { ...(mongoQuery['metadata.price'] || {}), $lte: Number(filter.maxPrice) };
  }
  if (filter.minPrice) {
    mongoQuery['metadata.price'] = { ...(mongoQuery['metadata.price'] || {}), $gte: Number(filter.minPrice) };
  }

  // 3. Fetch candidate vectors
  const candidates = await VectorEmbeddings.find(mongoQuery).lean();
  if (candidates.length === 0) {
    return [];
  }

  // 4. Tokenize query for hybrid keyword bonus
  const queryTerms = (query || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  // 5. Score candidates
  const scoredItems = [];
  for (const item of candidates) {
    let sim = cosineSimilarity(queryEmbedding, item.embedding);

    // Hybrid keyword match bonus (gives a small boost if exact words match)
    const textLower = (item.text || '').toLowerCase();
    let matchCount = 0;
    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        matchCount++;
      }
    }

    if (queryTerms.length > 0 && matchCount > 0) {
      const keywordBoost = Math.min(0.2, (matchCount / queryTerms.length) * 0.15);
      sim += keywordBoost;
    }

    if (sim >= minScore) {
      scoredItems.push({
        text: item.text,
        score: Math.round(sim * 100) / 100,
        metadata: item.metadata,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      });
    }
  }

  // 6. Sort by score descending and take topK
  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.slice(0, topK);
}

/**
 * Parse an uploaded document buffer (PDF, text, markdown)
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {Promise<string>}
 */
async function parseDocumentBuffer(buffer, mimetype, originalname) {
  if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }
  return buffer.toString('utf-8');
}

module.exports = {
  chunkMarkdown,
  serializeRoomToText,
  syncRoomToVectorStore,
  deleteRoomFromVectorStore,
  syncKnowledgeDocToVectorStore,
  deleteKnowledgeDocFromVectorStore,
  syncDefaultKnowledgeDocs,
  syncAll,
  retrieveRelevantContext,
  parseDocumentBuffer,
};
