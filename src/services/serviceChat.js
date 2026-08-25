const crypto = require('crypto');
const ChatHistory = require('../models/ChatHistory');
const Room = require('../models/Room');
const serviceRag = require('./serviceRag');
const serviceLlm = require('./serviceLlm');

/**
 * System persona & prompt template
 */
const SYSTEM_PROMPT_BASE = `Bạn là Trợ lý Ảo Thông Minh của Hệ Thống Quản Lý Phòng Trọ Smart Room Manager.
Nhiệm vụ của bạn là tư vấn nhiệt tình, chính xác và chuyên nghiệp cho khách thuê phòng.

NGUYÊN TẮC HOẠT ĐỘNG:
1. Chỉ sử dụng thông tin được cung cấp trong phần CONTEXT dưới đây để trả lời câu hỏi.
2. Nếu thông tin không có trong CONTEXT, hãy lịch sự thông báo hiện tại hệ thống chưa có thông tin đó và gợi ý khách liên hệ hotline/Ban Quản Lý để được hỗ trợ chi tiết. Tuyệt đối không tự bịa đặt hay suy đoán thông tin sai lệch.
3. Khi giới thiệu phòng trọ: Nêu rõ Tên phòng, Tầng, Loại phòng, Giá thuê, Tiền cọc, Diện tích và các Tiện ích nổi bật.
4. Trình bày rõ ràng, sử dụng gạch đầu dòng hoặc bảng Markdown khi liệt kê thông tin nhiều phòng hoặc biểu phí.
5. Luôn giữ thái độ lịch sự, thân thiện, chào đón khách thuê.
6. BẢO MẬT THÔNG TIN CÁ NHÂN (PII GUARD): Tuyệt đối KHÔNG cung cấp số điện thoại, CCCD/CMND, họ tên người đang thuê phòng hiện tại, hoặc dữ liệu riêng tư của bất kỳ cá nhân nào. Nếu khách hỏi, hãy lịch sự từ chối vì lý do bảo mật quyền riêng tư của cư dân.
7. Khi khách hỏi tìm phòng nhưng không có phòng nào thỏa mãn yêu cầu (ví dụ: giá quá thấp hoặc yêu cầu không tồn tại), hãy lịch sự thông báo không có phòng phù hợp và gợi ý các mức giá/loại phòng hiện đang còn trống trong CONTEXT.`;

/**
 * Extract intent and filters from user message
 * @param {string} text
 * @returns {{ intent: string, filter: Object }}
 */
function extractIntentAndFilters(text) {
  const query = (text || '').toLowerCase();
  const filter = {};
  let intent = 'GENERAL';

  // 1. Detect PII request
  if (
    /(ai đang thuê|ai ở phòng|cho tôi số điện thoại|cho sđt|cccd|cmnd|thông tin người thuê|danh tính người ở)/i.test(query)
  ) {
    return { intent: 'PII_PROBE', filter: {} };
  }

  // 2. Detect Room Search intent
  const isRoomQuery = /(tìm phòng|thuê phòng|còn phòng|phòng trống|có phòng|xem phòng|giá phòng|phòng đơn|phòng đôi|phòng gia đình|tầng \d+)/i.test(query);
  if (isRoomQuery) {
    intent = 'SEARCH_ROOM';
    filter.status = 'available';

    // Extract price filter
    const underMillionMatch = query.match(/(dưới|<|nhỏ hơn|tầm|khoảng)\s*(\d+([.,]\d+)?)\s*(triệu|tr|m)/i);
    if (underMillionMatch) {
      const num = parseFloat(underMillionMatch[2].replace(',', '.'));
      filter.maxPrice = num * 1000000;
    }

    const aboveMillionMatch = query.match(/(trên|>|lớn hơn|từ)\s*(\d+([.,]\d+)?)\s*(triệu|tr|m)/i);
    if (aboveMillionMatch) {
      const num = parseFloat(aboveMillionMatch[2].replace(',', '.'));
      filter.minPrice = num * 1000000;
    }

    // Direct price match like "500k", "500.000", "3 triệu"
    const directKMatch = query.match(/(\d+)\s*(k|nghìn|ngàn)/i);
    if (directKMatch && !filter.maxPrice) {
      const num = parseInt(directKMatch[1], 10);
      if (num < 1000) {
        filter.maxPrice = num * 1000;
      }
    }

    // Extract room type
    if (/phòng đơn|single/i.test(query)) {
      filter.roomType = 'single';
    } else if (/phòng đôi|double/i.test(query)) {
      filter.roomType = 'double';
    } else if (/phòng gia đình|family/i.test(query)) {
      filter.roomType = 'family';
    }
  }

  // 3. Detect Rules / Policy / Pricing intent
  const isPolicy = /(nội quy|giờ giấc|đóng cửa|mở cửa|qua đêm|bạn bè|khách|đặt cọc|hoàn cọc|trả cọc|hợp đồng|hủy hợp đồng|tiền điện|tiền nước|giá điện|giá nước|wifi|gửi xe|máy giặt|rác)/i.test(query);
  if (isPolicy) {
    intent = intent === 'SEARCH_ROOM' ? 'HYBRID' : 'POLICY_RULES';
  }

  return { intent, filter };
}

/**
 * Build dynamic fallback context if no vector results are found
 * @returns {Promise<string>}
 */
async function getGeneralAvailableRoomsContext() {
  try {
    const availableRooms = await Room.find({ status: 'available' }).populate('idFloor').limit(5).lean();
    if (availableRooms.length === 0) {
      return 'Hiện tại tất cả các phòng trong hệ thống đều đã có người thuê (occupied) hoặc đang bảo trì.';
    }
    return availableRooms.map((r) => serviceRag.serializeRoomToText(r)).join('\n');
  } catch (err) {
    return '';
  }
}

/**
 * Handle incoming chat message
 * @param {Object} params
 * @param {string} params.message
 * @param {string} [params.sessionId]
 * @param {string} [params.userId]
 * @param {boolean} [params.stream=false]
 * @param {Function} [params.onToken]
 * @returns {Promise<Object>}
 */
async function processChatMessage({ message, sessionId, userId = null, stream = false, onToken = null }) {
  const currentSessionId = sessionId || `session_${crypto.randomUUID()}`;

  // 1. Load or initialize chat history
  let chatRecord = await ChatHistory.findOne({ sessionId: currentSessionId });
  if (!chatRecord) {
    chatRecord = new ChatHistory({
      sessionId: currentSessionId,
      userId: userId || null,
      messages: [],
    });
  }

  // 2. Analyze intent and extract filters
  const { intent, filter } = extractIntentAndFilters(message);

  // Early guardrail for PII probing
  if (intent === 'PII_PROBE') {
    const piiRefusal = 'Xin lỗi quý khách! Vì lý do bảo mật và bảo vệ quyền riêng tư cá nhân của cư dân, Ban Quản Lý không thể cung cấp số điện thoại, căn cước công dân hoặc thông tin danh tính của người đang thuê phòng. Nếu quý khách có việc cần liên hệ gấp, vui lòng liên hệ trực tiếp Ban Quản Lý nhà trọ.';
    
    chatRecord.messages.push(
      { sender: 'user', content: message, timestamp: new Date() },
      { sender: 'bot', content: piiRefusal, intent: 'PII_PROBE', timestamp: new Date() }
    );
    chatRecord.lastActivity = new Date();
    await chatRecord.save();

    if (stream && onToken) {
      onToken(piiRefusal);
    }

    return {
      message: piiRefusal,
      sessionId: currentSessionId,
      intent,
      sources: [],
    };
  }

  // 3. Retrieve relevant context via Vector & Hybrid Search
  const retrievedSnippets = await serviceRag.retrieveRelevantContext(message, {
    filter,
    topK: 6,
    minScore: 0.35,
  });

  // If search intent but no filtered rooms matched, get available general rooms context so LLM can explain
  let contextData = '';
  if (retrievedSnippets.length > 0) {
    contextData = retrievedSnippets
      .map((s, idx) => `[Tài liệu ${idx + 1} (${s.sourceType})]:\n${s.text}`)
      .join('\n\n');
  } else {
    const fallbackRooms = await getGeneralAvailableRoomsContext();
    contextData = `[Thông tin phòng khả dụng hiện tại]:\n${fallbackRooms}`;
  }

  // 4. Assemble recent conversation history (last 6 messages)
  const recentHistory = (chatRecord.messages || []).slice(-6).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Build full system prompt with context
  const fullSystemPrompt = `${SYSTEM_PROMPT_BASE}

---
CONTEXT THÔNG TIN (SỬ DỤNG ĐỂ TRẢ LỜI):
${contextData}
---`;

  // Append current user message
  const llmMessages = [
    ...recentHistory,
    { role: 'user', content: message },
  ];

  // 5. Generate LLM response
  let botReply = '';
  if (stream && onToken) {
    botReply = await serviceLlm.generateResponseStream({
      systemPrompt: fullSystemPrompt,
      messages: llmMessages,
      onChunk: onToken,
    });
  } else {
    const response = await serviceLlm.generateResponse({
      systemPrompt: fullSystemPrompt,
      messages: llmMessages,
    });
    botReply = response.content;
  }

  // 6. Format sources metadata
  const sources = retrievedSnippets.map((s) => ({
    type: s.sourceType,
    score: s.score,
    metadata: s.metadata,
  }));

  // 7. Save to ChatHistory
  chatRecord.messages.push(
    {
      sender: 'user',
      content: message,
      timestamp: new Date(),
    },
    {
      sender: 'bot',
      content: botReply,
      sources,
      intent,
      timestamp: new Date(),
    }
  );
  chatRecord.lastActivity = new Date();
  await chatRecord.save();

  return {
    message: botReply,
    sessionId: currentSessionId,
    intent,
    sources,
  };
}

/**
 * Get chat history by sessionId
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function getChatHistory(sessionId) {
  const history = await ChatHistory.findOne({ sessionId }).lean();
  return history || { sessionId, messages: [] };
}

/**
 * Clear chat history by sessionId
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
async function clearChatHistory(sessionId) {
  await ChatHistory.deleteOne({ sessionId });
  return true;
}

module.exports = {
  processChatMessage,
  getChatHistory,
  clearChatHistory,
  extractIntentAndFilters,
};
