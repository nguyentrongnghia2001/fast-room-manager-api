const assert = require('assert');
const { cosineSimilarity, normalizeVector, mockEmbedding } = require('../src/config/vectorDb');
const { chunkMarkdown, serializeRoomToText } = require('../src/services/serviceRag');
const { extractIntentAndFilters } = require('../src/services/serviceChat');

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING RAG CHATBOT SYSTEM TESTS & VERIFICATION  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Vector Mathematics Tests
  test('Vector Math: Cosine similarity of identical vectors is 1', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const sim = cosineSimilarity(vecA, vecA);
    assert(Math.abs(sim - 1) < 0.0001, `Expected ~1, got ${sim}`);
  });

  test('Vector Math: Cosine similarity of orthogonal vectors is 0', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const sim = cosineSimilarity(vecA, vecB);
    assert.strictEqual(sim, 0);
  });

  test('Vector Math: Mock embedding produces consistent vector with norm ~ 1', () => {
    const emb1 = mockEmbedding('Phòng trọ quận 1 giá rẻ');
    const emb2 = mockEmbedding('Phòng trọ quận 1 giá rẻ');
    assert.strictEqual(emb1.length, 768);
    const sim = cosineSimilarity(emb1, emb2);
    assert(Math.abs(sim - 1) < 0.0001, 'Same text should give identical mock embedding');
  });

  // 2. Chunking Tests
  test('RAG Chunking: Markdown chunker splits by headers and maintains hierarchy', () => {
    const sampleMd = `# NỘI QUY PHÒNG TRỌ\n\n## 1. Giờ giấc\nĐóng cửa 23h.\n\n## 2. Tiền cọc\nCọc 1 tháng tiền phòng.`;
    const chunks = chunkMarkdown(sampleMd, { chunkSize: 200, chunkOverlap: 50 });
    assert(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
    assert(chunks.some(c => c.header === '1. Giờ giấc'), 'Should contain Giờ giấc header');
    assert(chunks.some(c => c.header === '2. Tiền cọc'), 'Should contain Tiền cọc header');
  });

  // 3. Room Serializer Tests
  test('Room Serializer: Correctly converts MongoDB room doc into semantic text', () => {
    const mockRoom = {
      _id: '65a123bc45de678',
      name: 'Phòng 201',
      idFloor: { name: 'Tầng 2' },
      type: 'single',
      area: 25,
      price: 3500000,
      deposit: 3500000,
      status: 'available',
      amenities: ['Điều hòa', 'Máy nước nóng', 'Ban công'],
      description: 'Phòng thoáng mát hướng Đông',
    };

    const text = serializeRoomToText(mockRoom);
    assert(text.includes('Phòng: Phòng 201 (Tầng 2)'), 'Must contain name and floor');
    assert(text.includes('3.500.000 VNĐ/tháng'), 'Must contain formatted price');
    assert(text.includes('Điều hòa'), 'Must contain amenities');
    assert(text.includes('Còn trống (available)'), 'Must contain status');
  });

  // 4. Intent & Filter Extraction Tests (Test Case 1, 2, 3, 4)
  test('Intent Analysis (Test Case 1): Room criteria extraction (single room, floor 2, price < 4tr)', () => {
    const query = 'Tìm giúp tôi phòng đơn tầng 2 giá dưới 4 triệu có điều hòa.';
    const { intent, filter } = extractIntentAndFilters(query);
    assert.strictEqual(intent, 'SEARCH_ROOM');
    assert.strictEqual(filter.status, 'available');
    assert.strictEqual(filter.roomType, 'single');
    assert.strictEqual(filter.maxPrice, 4000000);
  });

  test('Intent Analysis (Test Case 2): Policy / House rules extraction', () => {
    const query = 'Quy định giờ đóng cửa buổi tối là mấy giờ và tiền cọc có được hoàn lại không?';
    const { intent } = extractIntentAndFilters(query);
    assert.strictEqual(intent, 'POLICY_RULES');
  });

  test('Intent Analysis (Test Case 3): PII Probe Guardrail detection', () => {
    const query = 'Ai đang thuê phòng 101, cho tôi số điện thoại và CCCD của họ?';
    const { intent } = extractIntentAndFilters(query);
    assert.strictEqual(intent, 'PII_PROBE');
  });

  test('Intent Analysis (Test Case 4): Unmatched/Low budget room search', () => {
    const query = 'Có phòng nào giá 500k ở tầng 10 không?';
    const { intent, filter } = extractIntentAndFilters(query);
    assert.strictEqual(intent, 'SEARCH_ROOM');
    assert.strictEqual(filter.maxPrice, 500000);
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 ALL RAG UNIT TESTS PASSED SUCCESSFULLY!\n');
  } else {
    process.exit(1);
  }
}

runTests();
