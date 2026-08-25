const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const env = require('../config/env');

let geminiClient = null;
let openaiClient = null;

function getGeminiClient() {
  if (!geminiClient && env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
}

function getOpenAIClient() {
  if (!openaiClient && env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate completion using configured LLM (Gemini or OpenAI)
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {Array<{ role: 'user' | 'assistant' | 'system', content: string }>} params.messages
 * @param {number} [params.temperature=0.3]
 * @returns {Promise<{ content: string, model: string }>}
 */
async function generateResponse({ systemPrompt, messages = [], temperature = 0.3 }) {
  const provider = env.LLM_PROVIDER || 'gemini';

  // 1. Google Gemini
  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    try {
      const client = getGeminiClient();
      const modelName = env.GEMINI_MODEL || 'gemini-1.5-flash';
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: 1500,
        },
      });

      // Format conversation history for Gemini
      // Gemini expects role: 'user' | 'model'
      const formattedHistory = [];
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.role === 'system') continue;
        formattedHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const lastMsg = messages[messages.length - 1];
      const chat = model.startChat({
        history: formattedHistory,
      });

      const promptText = lastMsg ? lastMsg.content : 'Xin chào';
      const result = await chat.sendMessage(promptText);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: modelName,
        provider: 'gemini',
      };
    } catch (err) {
      console.error(`[LLM Gemini Error]: ${err.message}`);
      // Fallback to OpenAI if Gemini fails and OpenAI key is available
      if (!env.OPENAI_API_KEY) {
        throw err;
      }
    }
  }

  // 2. OpenAI
  if ((provider === 'openai' || env.OPENAI_API_KEY) && env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const modelName = env.OPENAI_MODEL || 'gpt-4o-mini';

      const openAiMessages = [];
      if (systemPrompt) {
        openAiMessages.push({ role: 'system', content: systemPrompt });
      }

      for (const msg of messages) {
        openAiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      const response = await client.chat.completions.create({
        model: modelName,
        messages: openAiMessages,
        temperature,
      });

      const reply = response.choices[0]?.message?.content || '';
      return {
        content: reply,
        model: modelName,
        provider: 'openai',
      };
    } catch (err) {
      console.error(`[LLM OpenAI Error]: ${err.message}`);
      throw err;
    }
  }

  // 3. Fallback when no API Key is configured
  return generateFallbackResponse(messages);
}

/**
 * Stream response generator using SSE
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {Array<{ role: 'user' | 'assistant' | 'system', content: string }>} params.messages
 * @param {Function} onChunk - Callback for each text token chunk
 * @returns {Promise<string>} Full assembled text
 */
async function generateResponseStream({ systemPrompt, messages = [], onChunk }) {
  const provider = env.LLM_PROVIDER || 'gemini';

  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    try {
      const client = getGeminiClient();
      const modelName = env.GEMINI_MODEL || 'gemini-1.5-flash';
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
        },
      });

      const formattedHistory = [];
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.role === 'system') continue;
        formattedHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const lastMsg = messages[messages.length - 1];
      const chat = model.startChat({ history: formattedHistory });
      const promptText = lastMsg ? lastMsg.content : 'Xin chào';

      const result = await chat.sendMessageStream(promptText);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        if (onChunk) onChunk(chunkText);
      }

      return fullText;
    } catch (err) {
      console.error(`[LLM Stream Gemini Error]: ${err.message}`);
    }
  }

  if ((provider === 'openai' || env.OPENAI_API_KEY) && env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const modelName = env.OPENAI_MODEL || 'gpt-4o-mini';

      const openAiMessages = [];
      if (systemPrompt) {
        openAiMessages.push({ role: 'system', content: systemPrompt });
      }
      for (const msg of messages) {
        openAiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      const stream = await client.chat.completions.create({
        model: modelName,
        messages: openAiMessages,
        stream: true,
        temperature: 0.3,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          if (onChunk) onChunk(token);
        }
      }

      return fullText;
    } catch (err) {
      console.error(`[LLM Stream OpenAI Error]: ${err.message}`);
    }
  }

  // Fallback non-streaming simulation
  const fallback = generateFallbackResponse(messages);
  if (onChunk) onChunk(fallback.content);
  return fallback.content;
}

/**
 * Safe local fallback when API key is missing
 */
function generateFallbackResponse(messages) {
  const lastMsg = messages[messages.length - 1]?.content || '';
  return {
    content: `[Thông báo hệ thống RAG]\n\nChưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY trong file .env.\n\nHệ thống đã tiếp nhận câu hỏi: "${lastMsg}". Vui lòng thêm GEMINI_API_KEY vào .env để kích hoạt AI trả lời tự động hoàn chỉnh.`,
    model: 'mock-fallback',
    provider: 'local',
  };
}

module.exports = {
  generateResponse,
  generateResponseStream,
};
